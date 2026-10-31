"""Code indexer: symbols, routes, API calls, imports, dynamic markers, DB objects. No LLM.

Python is parsed with the ast module. JS/TS and SQL use patterns, so their symbol spans are
approximate (a span ends where the next symbol starts).
"""
import ast
import re
from dataclasses import dataclass, field

from .util import sha1

BIZ_KW = re.compile(
    r"\b(tax|discount|price|fee|rate|interest|penalt|limit|threshold|quota|balance|credit|debit|invoice|refund|"
    r"eligib|approv|reject|expire|deadline|grace|round|currency|commission|score|grade|marks?|validat|"
    r"permission|role|authori[sz]|polic|rule|minimum|maximum)\w*",
    re.I,
)
DATA_EFFECT = re.compile(
    r"INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|\.(commit|save|add_all|bulk_create|executemany|execute|"
    r"insert_one|update_one|upsert|delete)\(",
    re.I,
)


_COMMENT_LINE = re.compile(r"(?m)^\s*(#|//|\*|/\*).*$")
_TRIPLE = chr(34) * 3
_DOCSTRING = re.compile("(" + _TRIPLE + "|" + chr(39) * 3 + r")[\s\S]*?\1")


def business_score(src: str) -> int:
    """0-10 heuristic: does this code look like it implements a business rule? Comments, docstrings and Math.* are ignored."""
    src = _COMMENT_LINE.sub("", _DOCSTRING.sub("", src))
    src = re.sub(r"\bMath\.\w+", "", src)
    kw = min(3, len({m.group(0).lower() for m in BIZ_KW.finditer(src)}))
    cmp_num = len(re.findall(r"[<>]=?\s*-?\d+(?:\.\d+)?|[=!]=\s*-?\d+", src))
    branches = len(re.findall(r"\b(if|elif|else if|case|switch|when)\b", src))
    raises = len(re.findall(r"\b(raise|throw)\b", src))
    return min(10, kw + cmp_num + (1 if branches >= 3 else 0) + (1 if raises else 0))


@dataclass
class Sym:
    name: str
    qualname: str
    kind: str
    start: int
    end: int
    decorators: str
    sha: str
    business: int
    data_effect: int


@dataclass
class Route:
    method: str
    pattern: str
    line: int
    handler: str
    local_prefix: str = ""


@dataclass
class Call:
    method: str
    pattern: str
    line: int
    raw: str


@dataclass
class Import:
    module: str
    line: int
    side_effect: int = 0


@dataclass
class Marker:
    line: int
    kind: str
    detail: str


@dataclass
class DbObj:
    name: str
    kind: str
    line: int
    detail: str


@dataclass
class FileIndex:
    symbols: list[Sym] = field(default_factory=list)
    routes: list[Route] = field(default_factory=list)
    calls: list[Call] = field(default_factory=list)
    imports: list[Import] = field(default_factory=list)
    markers: list[Marker] = field(default_factory=list)
    db_objects: list[DbObj] = field(default_factory=list)
    router_includes: list[tuple[str, str]] = field(default_factory=list)  # (module alias, prefix)


HTTP = {"get", "post", "put", "delete", "patch", "options", "head", "route", "websocket"}
REFLECTION = {"getattr", "setattr", "eval", "exec", "__import__", "globals", "locals", "compile"}
SCHEDULE_DECOS = ("scheduled_job", "shared_task", "periodic_task", "crontab", "scheduled", "cron")
STARTUP_DECOS = ("on_event", "lifespan", "before_first_request", "app_context")


def _sym(name, qual, kind, start, end, decos, lines) -> Sym:
    src = "\n".join(lines[start - 1:end])
    return Sym(name, qual, kind, start, end, ";".join(decos), sha1(src), business_score(src), int(bool(DATA_EFFECT.search(src))))


def _const_str(node) -> str | None:
    return node.value if isinstance(node, ast.Constant) and isinstance(node.value, str) else None


def index_python(text: str) -> FileIndex:
    idx = FileIndex()
    try:
        tree = ast.parse(text)
    except SyntaxError as e:
        idx.markers.append(Marker(e.lineno or 1, "syntax_error", str(e.msg)))
        return idx
    lines = text.splitlines()

    def visit(node, scope: list[str], in_class: bool):
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                is_cls = isinstance(child, ast.ClassDef)
                kind = "class" if is_cls else ("method" if in_class else "function")
                qual = ".".join(scope + [child.name])
                decos = [ast.unparse(d) for d in child.decorator_list]
                start = min([child.lineno] + [d.lineno for d in child.decorator_list])
                idx.symbols.append(_sym(child.name, qual, kind, start, child.end_lineno or start, decos, lines))
                for d in child.decorator_list:
                    if isinstance(d, ast.Call) and isinstance(d.func, ast.Attribute) and d.func.attr in HTTP and d.args:
                        pat = _const_str(d.args[0])
                        if pat is not None:
                            idx.routes.append(Route("ANY" if d.func.attr == "route" else d.func.attr.upper(), pat, child.lineno, qual))
                    ds = ast.unparse(d)
                    if any(k in ds for k in SCHEDULE_DECOS):
                        idx.markers.append(Marker(child.lineno, "scheduled", f"{qual}: @{ds}"))
                    elif any(k in ds for k in STARTUP_DECOS):
                        idx.markers.append(Marker(child.lineno, "startup_hook", f"{qual}: @{ds}"))
                if is_cls:
                    for stmt in child.body:
                        if isinstance(stmt, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "__tablename__" for t in stmt.targets):
                            tn = _const_str(stmt.value)
                            if tn:
                                idx.db_objects.append(DbObj(tn, "orm_table", stmt.lineno, f"model {child.name}"))
                visit(child, scope + [child.name], is_cls)
            else:
                visit(child, scope, in_class)

    visit(tree, [], False)

    loaded: set[str] = set()
    for n in ast.walk(tree):
        if isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load):
            loaded.add(n.id)
        if isinstance(n, ast.Call):
            f = n.func
            fname = f.id if isinstance(f, ast.Name) else (f.attr if isinstance(f, ast.Attribute) else "")
            if fname in REFLECTION:
                idx.markers.append(Marker(n.lineno, "reflection", f"{fname}(...)"))
            elif fname == "import_module":
                idx.markers.append(Marker(n.lineno, "dynamic_import", ast.unparse(n)[:120]))
            elif fname in ("add_job", "every", "apply_async", "delay"):
                idx.markers.append(Marker(n.lineno, "scheduled", ast.unparse(n)[:120]))
            elif fname in ("Thread", "Timer", "add_task", "create_task", "run_in_executor"):
                idx.markers.append(Marker(n.lineno, "background_work", ast.unparse(n)[:120]))
            elif fname in ("register",) and "atexit" in ast.unparse(f):
                idx.markers.append(Marker(n.lineno, "exit_hook", ast.unparse(n)[:120]))
            elif fname in ("system", "Popen", "run", "check_output", "call") and re.search(r"subprocess|os\.", ast.unparse(f)):
                idx.markers.append(Marker(n.lineno, "process_exec", ast.unparse(n)[:120]))
            elif fname == "include_router" and n.args:
                prefix = next((_const_str(k.value) for k in n.keywords if k.arg == "prefix"), "") or ""
                arg = n.args[0]
                alias = arg.value.id if isinstance(arg, ast.Attribute) and isinstance(arg.value, ast.Name) else ""
                idx.router_includes.append((alias, prefix))
            elif fname == "APIRouter":
                prefix = next((_const_str(k.value) for k in n.keywords if k.arg == "prefix"), "")
                if prefix:
                    idx.markers.append(Marker(n.lineno, "router_prefix", prefix))

    attr_bases = {n.value.id for n in ast.walk(tree) if isinstance(n, ast.Attribute) and isinstance(n.value, ast.Name)}
    for stmt in ast.walk(tree):
        if isinstance(stmt, ast.Import):
            for a in stmt.names:
                bound = a.asname or a.name.split(".")[0]
                idx.imports.append(Import(a.name, stmt.lineno, int(bound not in loaded and bound not in attr_bases)))
        elif isinstance(stmt, ast.ImportFrom):
            mod = ("." * stmt.level) + (stmt.module or "")
            for a in stmt.names:
                if mod:
                    idx.imports.append(Import(mod, stmt.lineno, 0))
                if a.name != "*":
                    idx.imports.append(Import(mod + ("" if not mod or mod.endswith(".") else ".") + a.name, stmt.lineno, 0))
                    # `from pkg import module` is a module import if it is never used as a name
                    bound = a.asname or a.name
                    if bound not in loaded and bound not in attr_bases:
                        idx.imports[-1].side_effect = 1
    return idx


JS_FUNC = re.compile(r"^[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(", re.M)
JS_ARROW = re.compile(
    r"^[ \t]*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(?:async\s*)?"
    r"(?:\([^)\n]*\)|[A-Za-z_$][\w$]*)\s*(?::\s*[\w<>\[\], |.]+)?\s*=>",
    re.M,
)
JS_CLASS = re.compile(r"^[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)", re.M)
JS_IMPORT = re.compile(r"""(?:import\s+(?:[^'"]*?from\s+)?|require\(\s*)['"]([^'"]+)['"]""")
JS_ROUTE = re.compile(r"""\b(?:app|router|server)\.(get|post|put|delete|patch|all)\(\s*(['"`])([^'"`]+)\2""")
JS_FETCH = re.compile(r"""\bfetch\(\s*(`[^`]*`|'[^']*'|"[^"]*")""")
JS_AXIOS = re.compile(r"""\baxios(?:\.(get|post|put|delete|patch))?\(\s*(`[^`]*`|'[^']*'|"[^"]*")""")
JS_METHOD = re.compile(r"""method\s*:\s*['"](\w+)['"]""")


def _match_bracket(text: str, pos: int, open_ch: str, close_ch: str) -> int:
    """Index of the bracket closing the one at pos, skipping strings and comments. -1 if unbalanced."""
    depth, i, n = 0, pos, len(text)
    while i < n:
        c = text[i]
        two = text[i:i + 2]
        if two == "//":
            i = text.find("\n", i)
            if i == -1:
                return -1
            continue
        if two == "/*":
            j = text.find("*/", i + 2)
            if j == -1:
                return -1
            i = j + 2
            continue
        if c in "\"'":  # quotes end at newline: JSX text like "don't" must not swallow the file
            j = i + 1
            while j < n and text[j] not in (c, "\n"):
                j += 2 if text[j] == "\\" else 1
            i = j + 1
            continue
        if c == "`":
            j = i + 1
            while j < n and text[j] != "`":
                j += 2 if text[j] == "\\" else 1
            i = j + 1
            continue
        if c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def _decl_end(text: str, m: re.Match, rx: re.Pattern) -> int:
    """End offset of a JS/TS declaration by bracket matching, or -1."""
    if rx is JS_FUNC:
        close = _match_bracket(text, m.end() - 1, "(", ")")
        brace = text.find("{", close) if close != -1 else -1
    elif rx is JS_CLASS:
        brace = text.find("{", m.end())
    else:
        j = m.end()
        while j < len(text) and text[j] in " \t\r\n":
            j += 1
        if text[j:j + 1] == "{":
            brace = j
        elif text[j:j + 1] == "(":
            return _match_bracket(text, j, "(", ")")
        else:
            k = text.find("\n", j)
            return len(text) - 1 if k == -1 else k
    return _match_bracket(text, brace, "{", "}") if brace != -1 else -1


JS_URL_CONST = re.compile(r"""(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(`[^`]*`|'[^']*'|"[^"]*")""")


def normalize_url(raw: str, consts: dict[str, str] | None = None) -> str:
    """`${BASE}/a/${id}/b?x=1` -> `/a/{}/b`. A known BASE constant contributes its path (e.g. /api)."""
    s = raw.strip("`'\"")
    lead = re.match(r"^\$\{(\w+)\}", s)
    if lead and consts and lead.group(1) in consts:
        s = consts[lead.group(1)].rstrip("/") + s[lead.end():]
    s = re.sub(r"^\$\{[^}]*\}", "", s)
    s = re.sub(r"\$\{[^}]*\}", "{}", s)
    s = re.sub(r"^https?://[^/]+", "", s)
    s = s.split("?")[0]
    return s if s.startswith("/") else "/" + s


def index_js(text: str, lang: str) -> FileIndex:
    idx = FileIndex()
    lines = text.splitlines()
    found: list[tuple[int, str, str, int]] = []
    for rx, kind in ((JS_FUNC, "function"), (JS_ARROW, "function"), (JS_CLASS, "class")):
        for m in rx.finditer(text):
            end_pos = _decl_end(text, m, rx)
            end_line = text.count("\n", 0, end_pos) + 1 if end_pos != -1 else -1
            found.append((text.count("\n", 0, m.start()) + 1, m.group(1), kind, end_line))
    found.sort()
    for i, (line, name, kind, end) in enumerate(found):
        if end < line:  # bracket matching failed: fall back to "until the next symbol"
            end = found[i + 1][0] - 1 if i + 1 < len(found) else len(lines)
        idx.symbols.append(_sym(name, name, kind, line, max(line, end), [], lines))
    consts = {m.group(1): normalize_url(m.group(2)) for m in JS_URL_CONST.finditer(text)
              if "http" in m.group(2) or m.group(2).strip("`'\"").startswith(("/", "${"))}
    for m in JS_IMPORT.finditer(text):
        idx.imports.append(Import(m.group(1), text.count("\n", 0, m.start()) + 1, 0))
    for m in JS_ROUTE.finditer(text):
        idx.routes.append(Route(m.group(1).upper(), m.group(3), text.count("\n", 0, m.start()) + 1, ""))
    for m in JS_FETCH.finditer(text):
        ahead = text[m.end():m.end() + 250]
        meth = JS_METHOD.search(ahead.split("fetch(")[0])
        idx.calls.append(Call(meth.group(1).upper() if meth else "GET", normalize_url(m.group(1), consts),
                              text.count("\n", 0, m.start()) + 1, m.group(1)[:120]))
    for m in JS_AXIOS.finditer(text):
        idx.calls.append(Call((m.group(1) or "GET").upper(), normalize_url(m.group(2), consts),
                              text.count("\n", 0, m.start()) + 1, m.group(2)[:120]))
    for m in re.finditer(r"\b(eval|new Function|setInterval|setTimeout)\s*\(", text):
        kind = "reflection" if m.group(1) in ("eval", "new Function") else "background_work"
        idx.markers.append(Marker(text.count("\n", 0, m.start()) + 1, kind, m.group(1)))
    for m in re.finditer(r"\b(?:require|import)\(\s*[^'\"\s)]", text):
        idx.markers.append(Marker(text.count("\n", 0, m.start()) + 1, "dynamic_import", "computed import path"))
    return idx


SQL_OBJ = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?(TABLE|VIEW|INDEX|TRIGGER|PROCEDURE|FUNCTION)\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.\"`\[\]]+)",
    re.I,
)


def index_sql(text: str) -> FileIndex:
    idx = FileIndex()
    for m in SQL_OBJ.finditer(text):
        kind = m.group(1).lower()
        end = text.find(";", m.end())
        detail = text[m.start():(end if end != -1 else m.end() + 600) + 1][:1500]
        line = text.count("\n", 0, m.start()) + 1
        idx.db_objects.append(DbObj(m.group(2).strip('"`[]'), kind, line, detail))
        if kind in ("trigger", "procedure", "function"):
            idx.markers.append(Marker(line, "db_logic", f"{kind} {m.group(2)}"))
    return idx


def index_file(text: str, lang: str) -> FileIndex:
    if lang == "python":
        return index_python(text)
    if lang in ("javascript", "typescript", "vue"):
        return index_js(text, lang)
    if lang == "sql":
        return index_sql(text)
    return FileIndex()
