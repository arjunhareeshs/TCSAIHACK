"""Research Crew (R1, R2, R3)."""

from __future__ import annotations

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from app.core.llm import get_llm
from app.modernizer.tools import get_tools_for_agent


@CrewBase
class ResearchCrew:
    """External Technology, Security, and Architecture Research Crew."""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @agent
    def technology_researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["technology_researcher"],
            tools=get_tools_for_agent("R1"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def security_researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["security_researcher"],
            tools=get_tools_for_agent("R2"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def architecture_researcher(self) -> Agent:
        return Agent(
            config=self.agents_config["architecture_researcher"],
            tools=get_tools_for_agent("R3"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @task
    def research_technology_task(self) -> Task:
        return Task(config=self.tasks_config["research_technology_task"], context=[])

    @task
    def research_security_task(self) -> Task:
        return Task(config=self.tasks_config["research_security_task"], context=[])

    @task
    def research_architecture_task(self) -> Task:
        return Task(config=self.tasks_config["research_architecture_task"], context=[])

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
