"""Business Logic and Obsolescence Adjudication Crew (A7 & A8)."""

from __future__ import annotations

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from app.core.llm import get_llm
from app.modernizer.tools import get_tools_for_agent


@CrewBase
class BusinessLogicCrew:
    """Business Logic Extraction and Obsolescence vs Critical Rule Adjudication Crew."""

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @agent
    def business_rule_extractor(self) -> Agent:
        return Agent(
            config=self.agents_config["business_rule_extractor"],
            tools=get_tools_for_agent("A7"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @agent
    def obsolescence_adjudicator(self) -> Agent:
        return Agent(
            config=self.agents_config["obsolescence_adjudicator"],
            tools=get_tools_for_agent("A8"),
            llm=get_llm("fast"),
            verbose=False,
            max_iter=3,
            max_retry_limit=2,
            allow_delegation=False,
        )

    @task
    def extract_business_rules_task(self) -> Task:
        return Task(config=self.tasks_config["extract_business_rules_task"], context=[])

    @task
    def adjudicate_obsolescence_task(self) -> Task:
        return Task(config=self.tasks_config["adjudicate_obsolescence_task"], context=[])

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
