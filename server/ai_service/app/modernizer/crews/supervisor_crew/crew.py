"""Supervisor Verification Crew (S1)."""

from __future__ import annotations

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from app.core.llm import get_llm
from app.modernizer.tools import get_tools_for_agent


@CrewBase
class SupervisorCrew:
    """Supervisor Verification and Quality Gate Enforcement Crew."""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @agent
    def modernization_supervisor(self) -> Agent:
        return Agent(
            config=self.agents_config["modernization_supervisor"],
            tools=get_tools_for_agent("S1"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @task
    def verify_investigation_gate1_task(self) -> Task:
        return Task(config=self.tasks_config["verify_investigation_gate1_task"], context=[])

    @task
    def verify_consistency_gate2_task(self) -> Task:
        return Task(config=self.tasks_config["verify_consistency_gate2_task"], context=[])

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
