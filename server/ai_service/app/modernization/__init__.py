"""Evidence-first legacy application reverse engineering and modernization system."""
import os

# Set before CrewAI is imported anywhere: no external telemetry from analysis of private source code.
os.environ.setdefault("OTEL_SDK_DISABLED", "true")
os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
os.environ.setdefault("CREWAI_DISABLE_TRACKING", "true")
