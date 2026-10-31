"""Synthesis Crew (W1, W2, W3)."""

from __future__ import annotations

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from app.core.llm import get_llm
from app.modernizer.tools import get_tools_for_agent


@CrewBase
class SynthesisCrew:
    """Final Deliverables Synthesis Crew: Current State, Target Architecture, and Migration Roadmap."""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @agent
    def current_state_architect(self) -> Agent:
        return Agent(
            config=self.agents_config["current_state_architect"],
            tools=get_tools_for_agent("W1"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def modernization_architect(self) -> Agent:
        return Agent(
            config=self.agents_config["modernization_architect"],
            tools=get_tools_for_agent("W2"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def roadmap_test_strategist(self) -> Agent:
        return Agent(
            config=self.agents_config["roadmap_test_strategist"],
            tools=get_tools_for_agent("W3"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @task
    def synthesize_current_state_task(self) -> Task:
        return Task(config=self.tasks_config["synthesize_current_state_task"], context=[])

    @task
    def synthesize_target_architecture_task(self) -> Task:
        return Task(config=self.tasks_config["synthesize_target_architecture_task"], context=[])

    @task
    def synthesize_roadmap_and_tests_task(self) -> Task:
        return Task(config=self.tasks_config["synthesize_roadmap_and_tests_task"], context=[])

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
