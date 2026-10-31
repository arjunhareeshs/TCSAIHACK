"""Discovery Crew (A0)."""

from __future__ import annotations

from pathlib import Path
from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from app.core.llm import get_llm
from app.modernizer.tools import get_tools_for_agent


@CrewBase
class DiscoveryCrew:
    """Discovery Crew for legacy architecture inventory and boundary validation."""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @agent
    def discovery_reviewer(self) -> Agent:
        return Agent(
            config=self.agents_config["discovery_reviewer"],
            tools=get_tools_for_agent("A0"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @task
    def review_discovery_task(self) -> Task:
        return Task(
            config=self.tasks_config["review_discovery_task"],
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
