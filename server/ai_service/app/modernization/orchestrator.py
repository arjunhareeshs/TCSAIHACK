"""Run orchestrator: phases, concurrency, retries, timeouts, cancellation, resumable tasks and quality gates."""
import asyncio
import dataclasses
import hashlib
import json
import logging
import time
from dataclasses import dataclass

from . import planner, reports
from .agents import SPECS, build_crew, build_prompt, model_for, parse_output
from .pipeline import build_facts, write_baseline_docs
from .tools import ToolContext
from .workspace import Workspace

log = logging.getLogger("modernization")
INVESTIGATION = ("A1", "A2", "A3", "A4", "A5", "A6")


@dataclass
class TaskDef:
    key: str
    spec_id: str
    label: str
    prompt_extra: str = ""
    partition: planner.Partition | None = None
    suffix: str = ""
    sections: list[str] | None = None  # override (rework tasks)


class Orchestrator:
    def __init__(self, ws: Workspace, only: set[str] | None = None, force: bool = False, progress=print):
        self.ws = ws
        self.s = ws.settings
        self.only = only
        self.force = force
        self.say = progress
        self.sem = asyncio.Semaphore(self.s.max_concurrency)
        self.contexts: list[ToolContext] = []
        self.cancelled = asyncio.Event()
        self.summary: dict = {}

    def cancel(self) -> None:
        self.cancelled.set()
        for c in self.contexts:
            c.cancel.set()

    def wanted(self, agent: str) -> bool:
        return self.only is None or agent in self.only

    # ---------- task execution ----------
    async def run_task(self, td: TaskDef) -> str:
        st = self.ws.store
        row = st.one("SELECT status FROM tasks WHERE key=?", (td.key,))
        if row and row["status"] == "done" and not self.force:
            self.say(f"  skip   {td.label} (already done)")
            return "done"
        spec = SPECS[td.spec_id]
        if td.sections is not None:
            spec = dataclasses.replace(spec, sections=td.sections)
        prompt = build_prompt(spec, self.ws, td.partition, td.prompt_extra, td.suffix)
        st.run("INSERT OR REPLACE INTO tasks(key,agent,scope,status,attempts,started,kind) VALUES (?,?,?,?,?,?,COALESCE((SELECT kind FROM tasks WHERE key=?),'planned'))",
               (td.key, td.spec_id, td.label, "running", 0, time.time(), td.key))
        err = ""
        async with self.sem:
            for attempt in range(1, self.s.max_task_retries + 2):
                if self.cancelled.is_set():
                    st.run("UPDATE tasks SET status='cancelled' WHERE key=?", (td.key,))
                    return "cancelled"
                crew, ctx = build_crew(self.ws, spec, f"{td.label}#{attempt}", prompt, model_for(spec, self.ws), self.s.agent_max_iter, td.suffix)
                self.contexts.append(ctx)
                st.run("UPDATE tasks SET attempts=? WHERE key=?", (attempt, td.key))
                t0 = time.time()
                try:
                    self.say(f"  start  {td.label} (attempt {attempt})")
                    result = await asyncio.wait_for(crew.kickoff_async(), timeout=self.s.task_timeout_s)
                    out = parse_output(result)
                    self._persist_partial(td, spec, out)
                    st.run("UPDATE tasks SET status='done', output=?, error=NULL, finished=? WHERE key=?", (out[:1500], time.time(), td.key))
                    self.say(f"  done   {td.label} in {time.time() - t0:.0f}s")
                    return "done"
                except Exception as e:  # includes timeouts and provider errors
                    ctx.cancel.set()  # lingering worker thread must stop calling tools
                    err = f"{type(e).__name__}: {str(e)[:300]}"
                    st.run("UPDATE tasks SET error=? WHERE key=?", (err, td.key))
                    self.say(f"  FAIL   {td.label} attempt {attempt}: {err[:140]}")
                    rate = any(k in err.lower() for k in ("429", "rate limit", "rate_limit", "tokens per minute"))
                    await asyncio.sleep(min(60, (25 if rate else 4) * attempt))
        self._persist_partial(td, spec, f"INCOMPLETE: {err}")
        st.run("UPDATE tasks SET status='failed', finished=? WHERE key=?", (time.time(), td.key))
        return "failed"

    def _persist_partial(self, td: TaskDef, spec, out: str) -> None:
        """Partial results are never lost: a failed or unstructured run still leaves a note in the owned document."""
        if not spec.doc:
            return
        heading = f"Run note {td.label}"
        if out.startswith("INCOMPLETE") or not self.ws.validate_document(spec.doc, [])["exists"]:
            self.ws.write_section(spec.doc, heading, out[:1500])

    async def run_group(self, tasks: list[TaskDef], title: str) -> dict[str, str]:
        if not tasks:
            return {}
        self.say(f"[{title}] {len(tasks)} task(s), concurrency {self.s.max_concurrency}")
        res = await asyncio.gather(*(self.run_task(t) for t in tasks))
        out = dict(zip((t.label for t in tasks), res))
        self._progress_doc(title)
        return out

    def _progress_doc(self, phase: str) -> None:
        rows = self.ws.store.query("SELECT agent,scope,status,attempts,substr(coalesce(error,''),1,80) error FROM tasks ORDER BY started")
        text = "| Task | Status | Attempts | Last error |\n|---|---|---|---|\n" + "\n".join(f"| {r['scope']} | {r['status']} | {r['attempts']} | {r['error']} |" for r in rows)
        self.ws.write_section("investigation_progress", "Status", f"Last phase finished: {phase}\n\n{text}")

    # ---------- phases ----------
    def investigation_tasks(self) -> list[TaskDef]:
        parts = [p for p in planner.plan(self.ws) if self.wanted(p.agent)]
        count: dict[str, int] = {}
        for p in parts:
            count[p.agent] = count.get(p.agent, 0) + 1
        tasks = []
        for p in parts:
            suffix = f" (part {p.index})" if count[p.agent] > 1 else ""
            h = hashlib.sha1("|".join(p.files).encode()).hexdigest()[:8]
            tasks.append(TaskDef(f"{p.key}:{h}", p.agent, p.key, partition=p, suffix=suffix))
        return tasks

    def gate1(self) -> list[str]:
        """Investigation gate: returns unread important files per layer that fall below required coverage."""
        st = self.ws.store
        unread_all: list[str] = []
        for layer in ("frontend", "backend", "database", "infra", "config"):
            total = st.one("SELECT COUNT(*) n FROM files WHERE relevant=1 AND layer=?", (layer,))["n"]
            if not total:
                continue
            q = "SELECT path FROM files f WHERE relevant=1 AND layer=? AND NOT EXISTS (SELECT 1 FROM file_reads x WHERE x.path=f.path) ORDER BY entry DESC, size DESC"
            unread = [r["path"] for r in st.query(q, (layer,))]
            cov = 1 - len(unread) / total
            self.say(f"  gate1 {layer}: coverage {cov:.0%} ({total - len(unread)}/{total})")
            if cov < self.s.min_read_coverage:
                unread_all += unread[:20]
        return unread_all

    async def rework(self, agent_for: dict[str, list[str]], round_no: int) -> None:
        tasks = []
        for agent, files in agent_for.items():
            part = planner.Partition(agent, 900 + round_no, files, 0, "rework")
            extra = (f"REWORK ROUND {round_no}: earlier coverage was too low. Read ONLY these files and record any findings with cite_code/record_finding. "
                     f"Then write one section 'Additional findings (rework {round_no})' in your document.")
            key = f"rework{round_no}:{agent}:{hashlib.sha1(chr(10).join(files).encode()).hexdigest()[:8]}"
            tasks.append(TaskDef(key, agent, f"{agent}:rework{round_no}", extra, part, "", [f"Additional findings (rework {round_no})"]))
        await self.run_group(tasks, f"rework {round_no}")

    async def business_logic(self) -> None:
        cands = planner.rule_candidates(self.ws)
        tasks = []
        for i, group in enumerate(cands, 1):
            lines = "\n".join(f"- {c['key']}  ({c['path']}:{c['start']}-{c['end']}, rule-shape score {c['business']})" for c in group)
            extra = ("CANDIDATES (symbols whose code looks like business logic). Read each with read_file around its span, then call record_business_rule for each REAL rule "
                     f"(all 10 fields, citing its lines). Skip ones that are only plumbing.\n{lines}")
            h = hashlib.sha1(lines.encode()).hexdigest()[:8]
            tasks.append(TaskDef(f"A7:{i}:{h}", "A7", f"A7:{i}", extra, None, f" (part {i})" if len(cands) > 1 else ""))
        await self.run_group(tasks, "business logic")
        queue = planner.adjudication_queue(self.ws)
        tasks = []
        for i, group in enumerate(queue, 1):
            lines = "\n".join(f"- {c['key']}  ({c['path']}:{c['start']}-{c['end']}) deterministic verdict {c['verdict']}, rule-shape score {c['business']}" for c in group)
            extra = ("ADJUDICATION QUEUE. For EACH symbol: run all six checks, then submit_liveness_verdict with a rationale grounded in what you found and the evidence ids. "
                     f"Do not skip the checks; the tool refuses verdicts without them.\n{lines}")
            h = hashlib.sha1(lines.encode()).hexdigest()[:8]
            tasks.append(TaskDef(f"A8:{i}:{h}", "A8", f"A8:{i}", extra))
        await self.run_group(tasks, "adjudication")

    async def research(self) -> None:
        tasks = [TaskDef(f"{r}:1", r, r) for r in ("R1", "R2", "R3") if self.wanted(r)]
        await self.run_group(tasks, "research")

    async def verify(self) -> None:
        if not self.wanted("S1"):
            return
        await self.run_group([TaskDef("S1:1:" + str(int(time.time())), "S1", "S1:1")], "verification")
        for rnd in range(1, self.s.max_rework_rounds + 1):
            pend = self.ws.store.query("SELECT key,agent,scope,output FROM tasks WHERE kind='rework' AND status='pending'")
            if not pend:
                break
            tasks = []
            for p in pend:
                q = json.loads(p["output"] or "{}")
                part = planner.Partition(p["agent"], 800 + rnd, [], 0, "supervisor rework")
                extra = f"SUPERVISOR REWORK: {q.get('question')}\nReason: {q.get('reason')}\nScope: {p['scope']}\nAnswer with cite_code/record_finding, then write the section 'Supervisor rework {rnd}'."
                tasks.append(TaskDef(p["key"], p["agent"], f"{p['agent']}:srework{rnd}", extra, part, "", [f"Supervisor rework {rnd}"]))
            await self.run_group(tasks, f"supervisor rework {rnd}")
            for t in tasks:
                self.ws.store.run("UPDATE tasks SET kind='rework' WHERE key=?", (t.key,))

    async def synthesize(self) -> None:
        tasks = [TaskDef(f"{w}:1", w, w) for w in ("W1", "W2", "W3") if self.wanted(w)]
        await self.run_group(tasks, "synthesis")

    # ---------- run ----------
    async def run(self, facts_only: bool = False) -> dict:
        t0 = time.time()
        self.say("[facts] scanning, indexing, linking, scoring (no LLM)")
        self.summary = await asyncio.to_thread(build_facts, self.ws)
        write_baseline_docs(self.ws)
        self.say(f"  facts: {json.dumps(self.summary)}")
        reports.generate_all(self.ws, self.summary)
        if facts_only:
            return {"facts": self.summary, "seconds": round(time.time() - t0, 1)}
        await self.run_group(self.investigation_tasks(), "investigation")
        for rnd in range(1, self.s.max_rework_rounds + 1):
            unread = self.gate1()
            if not unread or self.cancelled.is_set():
                break
            by_layer = {}
            for f in unread:
                layer = self.ws.store.one("SELECT layer FROM files WHERE path=?", (f,))["layer"]
                by_layer.setdefault({"frontend": "A1", "backend": "A2", "database": "A3", "infra": "A4", "config": "A5"}[layer], []).append(f)
            await self.rework({a: fs for a, fs in by_layer.items() if self.wanted(a)}, rnd)
        await self.business_logic()
        await self.research()
        reports.generate_all(self.ws, self.summary)
        await self.verify()
        reports.generate_all(self.ws, self.summary)
        await self.synthesize()
        cites = await asyncio.to_thread(self.ws.validate_citations)
        reports.generate_all(self.ws, self.summary)
        self._evidence_index()
        return {"facts": self.summary, "citations": cites, "seconds": round(time.time() - t0, 1),
                "tasks": {r["status"]: r["n"] for r in self.ws.store.query("SELECT status, COUNT(*) n FROM tasks GROUP BY status")}}

    def _evidence_index(self) -> None:
        rows = self.ws.store.query("SELECT id,path,start,end,agent,note FROM evidence ORDER BY id LIMIT 400")
        self.ws.write_section("evidence_references", "Evidence index",
                              "| ID | Location | Agent | Note |\n|---|---|---|---|\n" + "\n".join(f"| E{r['id']} | {r['path']}:{r['start']}-{r['end']} | {r['agent']} | {r['note'][:80]} |" for r in rows))
