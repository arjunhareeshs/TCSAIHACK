param (
    [Parameter(Mandatory=$false, Position=0)]
    [string]$ProjectPath = "C:\A I  - P R O J E C T S\grassroots-extraction"
)

$ErrorActionPreference = "Stop"
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONPATH = "C:\A I  - P R O J E C T S\TCS AI HACK\server\ai_service"

$PythonExe = "C:\A I  - P R O J E C T S\TCS AI HACK\server\ai_service\.venv\Scripts\python.exe"
$Runner = "C:\A I  - P R O J E C T S\TCS AI HACK\server\ai_service\run_ai.py"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Autonomous CrewAI Modernization Execution Runner" -ForegroundColor Yellow
Write-Host " Project Target: $ProjectPath" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

& $PythonExe $Runner $ProjectPath
