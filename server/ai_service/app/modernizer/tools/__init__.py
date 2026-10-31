"""Tool registry mapping agents to allowed tools per Section 7.11 of the modernization plan."""

from __future__ import annotations

from app.modernizer.tools.repo_tools import (
    list_tree, find_files, read_file, search_code, file_metadata, set_active_workspace
)
from app.modernizer.tools.graph_tools import (
    find_symbol, get_references, trace_calls, get_module_dependencies, trace_request_flow, get_dynamic_markers
)
from app.modernizer.tools.db_tools import (
    get_schema_objects, db_check_connection, db_list_objects, db_describe_object, db_get_relationships
)
from app.modernizer.tools.ops_tools import (
    git_file_history, git_blame_range, git_change_coupling, search_operational_records, get_records_for_component
)
from app.modernizer.tools.inspection_tools import run_inspection
from app.modernizer.tools.evidence_tools import (
    cite_code, record_finding, record_business_rule, list_findings
)
from app.modernizer.tools.obsolescence_tools import (
    get_liveness_report, submit_liveness_verdict
)
from app.modernizer.tools.doc_tools import (
    read_document, write_section, read_memory, append_memory, validate_document
)
from app.modernizer.tools.research_tools import (
    check_package_vulnerabilities, get_package_versions, record_research, web_search
)
from app.modernizer.tools.supervisor_tools import (
    get_coverage_report, validate_citations, compare_findings, request_reinvestigation
)
from app.modernizer.tools.project_tools import (
    inspect_project_overview, find_project_entrypoints, read_project_file, read_project_manifest, run_project_check
)


def get_tools_for_agent(agent_code: str) -> list:
    """Return granted tools for an agent code (A0, A1, A2, A3, A4, A5, A6, A7, A8, R1, R2, R3, S1, W1, W2, W3)."""
    code = agent_code.upper()

    doc_tools = [read_document, write_section]
    base_repo_tools = [find_files, list_tree, read_file]
    evidence_tools = [cite_code, record_finding]

    if code == "A0":
        return [find_files, list_tree, read_file, record_finding, cite_code, write_section]

    if code in ("A1", "FRONTEND"):
        return [find_files, read_file, search_code, record_finding, cite_code, write_section]

    if code in ("A2", "BACKEND"):
        return [find_files, read_file, search_code, find_symbol, trace_calls, record_finding, cite_code, write_section]

    if code in ("A3", "DATABASE"):
        return [find_files, read_file, search_code, get_schema_objects, record_finding, cite_code, write_section]

    if code in ("A4", "DEPLOYMENT"):
        return [find_files, read_file, search_code, record_finding, cite_code, write_section]

    if code in ("A5", "STACK"):
        return [find_files, read_file, search_code, record_finding, cite_code, write_section]

    if code in ("A6", "OPERATIONAL"):
        return [find_files, read_file, search_code, record_finding, cite_code, write_section]

    if code in ("A7", "BUSINESS_RULES"):
        return [find_files, read_file, search_code, record_business_rule, cite_code, write_section]

    if code in ("A8", "OBSOLESCENCE"):
        return [find_files, read_file, search_code, get_liveness_report, submit_liveness_verdict, write_section]

    if code in ("R1", "R2", "R3", "RESEARCH"):
        return [check_package_vulnerabilities, get_package_versions, record_research, write_section]

    if code in ("S1", "SUPERVISOR"):
        return [get_coverage_report, validate_citations, compare_findings, write_section]

    if code in ("W1", "W2", "W3", "SYNTHESIS"):
        return [read_document, write_section, list_findings]

    return base_repo_tools + doc_tools
