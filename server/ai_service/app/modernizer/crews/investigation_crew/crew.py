"""Investigation Crew (A1 to A6)."""

from __future__ import annotations

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from app.core.llm import get_llm
from app.modernizer.tools import get_tools_for_agent


@CrewBase
class InvestigationCrew:
    """Parallel Investigation Crew across Frontend, Backend, Database, Deployment, Stack, and Operations."""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @agent
    def frontend_specialist(self) -> Agent:
        return Agent(
            config=self.agents_config["frontend_specialist"],
            tools=get_tools_for_agent("A1"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def backend_specialist(self) -> Agent:
        return Agent(
            config=self.agents_config["backend_specialist"],
            tools=get_tools_for_agent("A2"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def database_specialist(self) -> Agent:
        return Agent(
            config=self.agents_config["database_specialist"],
            tools=get_tools_for_agent("A3"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def deployment_specialist(self) -> Agent:
        return Agent(
            config=self.agents_config["deployment_specialist"],
            tools=get_tools_for_agent("A4"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def stack_config_specialist(self) -> Agent:
        return Agent(
            config=self.agents_config["stack_config_specialist"],
            tools=get_tools_for_agent("A5"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def operational_evidence_specialist(self) -> Agent:
        return Agent(
            config=self.agents_config["operational_evidence_specialist"],
            tools=get_tools_for_agent("A6"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @task
    def investigate_frontend_task(self) -> Task:
        return Task(config=self.tasks_config["investigate_frontend_task"], context=[])

    @task
    def investigate_backend_task(self) -> Task:
        return Task(config=self.tasks_config["investigate_backend_task"], context=[])

    @task
    def investigate_database_task(self) -> Task:
        return Task(config=self.tasks_config["investigate_database_task"], context=[])

    @task
    def investigate_deployment_task(self) -> Task:
        return Task(config=self.tasks_config["investigate_deployment_task"], context=[])

    @task
    def investigate_stack_config_task(self) -> Task:
        return Task(config=self.tasks_config["investigate_stack_config_task"], context=[])

    @task
    def investigate_operational_evidence_task(self) -> Task:
        return Task(config=self.tasks_config["investigate_operational_evidence_task"], context=[])

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
