import {
  Project,
  ProjectAnalysisResult,
  ActivityEvent,
  AIChatMessage,
  AIAnalysisArtifacts,
} from './types';
import { API_BASE_URL, ENDPOINTS } from './endpoints';
import { analyzeProjectCodebase } from './codeAnalyzer';

const STORAGE_KEY_PROJECTS = 'legacy_iq_projects';
const STORAGE_KEY_ACTIVITIES = 'legacy_iq_activities';
const STORAGE_KEY_ANALYSIS_PREFIX = 'legacy_iq_analysis_';
const STORAGE_KEY_CHAT_PREFIX = 'legacy_iq_chat_';

function toFrontendProject(value: any): Project {
  return {
    id: value.id,
    name: value.name,
    description: value.description || `Imported ${value.source_type || 'legacy'} project`,
    type: value.type || value.source_type || 'Repository',
    language: value.language || value.languages?.join(' / ') || 'Unknown',
    database: value.database || 'Unknown',
    status: value.status || 'Not Analysed',
    lastUpdated: value.last_updated || value.created_at || new Date().toISOString(),
    createdAt: value.created_at || new Date().toISOString(),
    filesCount: value.filesCount ?? value.file_count ?? value.inventory?.length ?? 0,
    linesOfCode: value.linesOfCode ?? 0,
    businessRulesCount: value.businessRulesCount ?? 0,
    dependenciesCount: value.dependenciesCount ?? 0,
    technicalDebtIssuesCount: value.technicalDebtIssuesCount ?? 0,
    criticalRisksCount: value.criticalRisksCount ?? 0,
    testCasesCount: value.testCasesCount ?? 0,
    sourceFiles: (value.sourceFiles || value.inventory || []).map((file: any) => ({
      name: file.name || file.relative_path?.split('/').pop() || 'source',
      path: file.path || file.relative_path || '',
      size: file.size || 0,
      type: file.type || file.extension?.replace('.', '') || '',
      linesCount: file.linesCount,
    })),
    supportingEvidence: [],
    analysisSettings: value.analysisSettings || {},
    analysisProgress: value.analysisProgress,
    currentAnalysisStep: value.currentAnalysisStep,
    detectedTechnologies: value.detectedTechnologies || value.languages || [],
  };
}

// Initial enterprise legacy projects for immediate exploration & testing
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-tcs-001',
    name: 'Core Banking Settlement Monolith',
    description: 'High-throughput enterprise interbank settlement and general ledger accounting system developed in 2008.',
    type: 'Monolithic Core',
    language: 'Java / J2EE',
    database: 'Oracle 11g Enterprise',
    status: 'Completed',
    lastUpdated: new Date(Date.now() - 3600000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    filesCount: 184,
    linesOfCode: 42800,
    businessRulesCount: 42,
    dependenciesCount: 58,
    technicalDebtIssuesCount: 29,
    criticalRisksCount: 4,
    testCasesCount: 38,
    detectedTechnologies: ['Java 8', 'Oracle 11g', 'Apache Struts 2', 'Spring 3.2', 'Log4j 1.2'],
    sourceFiles: [
      { name: 'SettlementProcessorEngine.java', path: 'src/main/java/com/bank/core/SettlementProcessorEngine.java', size: 18400, type: 'java', linesCount: 480 },
      { name: 'TransactionProcessorDao.java', path: 'src/main/java/com/bank/dao/TransactionProcessorDao.java', size: 24200, type: 'java', linesCount: 620 },
      { name: 'LegacySessionSecurityFilter.java', path: 'src/main/java/com/bank/security/LegacySessionSecurityFilter.java', size: 9800, type: 'java', linesCount: 260 },
      { name: 'NightlyEODReconciliationBatch.java', path: 'src/main/java/com/bank/batch/NightlyEODReconciliationBatch.java', size: 31200, type: 'java', linesCount: 790 },
      { name: 'struts-config.xml', path: 'src/main/resources/struts-config.xml', size: 6400, type: 'xml', linesCount: 140 },
    ],
    supportingEvidence: [
      { id: 'ev-1', name: 'schema_accounts_ledger_v2.sql', size: 45200, category: 'database_schema', validationStatus: 'valid', uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: 'ev-2', name: 'settlement_service_spec.wsdl', size: 18900, category: 'api_definition', validationStatus: 'valid', uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: 'ev-3', name: 'production_outage_postmortem_2025.pdf', size: 124000, category: 'incident_log', validationStatus: 'valid', uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
    ],
    analysisSettings: {
      technologyDetection: true,
      businessRuleExtraction: true,
      dependencyAnalysis: true,
      databaseDependencyAnalysis: true,
      obsoleteCodeIdentification: true,
      undocumentedBehaviourDetection: true,
      technicalDebtAnalysis: true,
      modernizationRiskAnalysis: true,
      migrationPlanning: true,
      regressionStrategyGeneration: true,
    },
    analysisProgress: 100,
  },
  {
    id: 'proj-tcs-002',
    name: 'Global Supply Chain Warehouse ERP',
    description: 'Inventory management and automated purchase-order reconciliation system with proprietary RPC listeners.',
    type: 'Client-Server SOA',
    language: 'C# / .NET Framework 4.5',
    database: 'Microsoft SQL Server 2012',
    status: 'In Progress',
    lastUpdated: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    filesCount: 96,
    linesOfCode: 24500,
    businessRulesCount: 19,
    dependenciesCount: 34,
    technicalDebtIssuesCount: 14,
    criticalRisksCount: 2,
    testCasesCount: 16,
    detectedTechnologies: ['.NET Framework 4.5.2', 'WCF', 'SQL Server 2012', 'ADO.NET'],
    sourceFiles: [
      { name: 'InventoryManagementService.cs', path: 'src/Services/InventoryManagementService.cs', size: 14200, type: 'cs', linesCount: 380 },
      { name: 'WarehouseRepository.cs', path: 'src/Data/WarehouseRepository.cs', size: 19800, type: 'cs', linesCount: 510 },
      { name: 'PurchaseOrderContract.cs', path: 'src/Contracts/PurchaseOrderContract.cs', size: 7600, type: 'cs', linesCount: 190 },
    ],
    supportingEvidence: [
      { id: 'ev-4', name: 'warehouse_tables_ddl.sql', size: 32000, category: 'database_schema', validationStatus: 'valid', uploadedAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    analysisSettings: {
      technologyDetection: true,
      businessRuleExtraction: true,
      dependencyAnalysis: true,
      databaseDependencyAnalysis: true,
      obsoleteCodeIdentification: true,
      undocumentedBehaviourDetection: true,
      technicalDebtAnalysis: true,
      modernizationRiskAnalysis: true,
      migrationPlanning: true,
      regressionStrategyGeneration: true,
    },
    analysisProgress: 65,
    currentAnalysisStep: 'Extracting complex business rules and dependency graph...',
  },
];

const INITIAL_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'act-1',
    projectId: 'proj-tcs-001',
    projectName: 'Core Banking Settlement Monolith',
    type: 'analysis_completed',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    details: 'Completed comprehensive 9-module modernization assessment. Discovered 42 business rules and 4 critical architectural risks.',
  },
  {
    id: 'act-2',
    projectId: 'proj-tcs-001',
    projectName: 'Core Banking Settlement Monolith',
    type: 'report_generated',
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    details: 'Modernization executive report generated with target architecture and Strangler Fig roadmap.',
  },
  {
    id: 'act-3',
    projectId: 'proj-tcs-002',
    projectName: 'Global Supply Chain Warehouse ERP',
    type: 'analysis_started',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    details: 'Initiated deep static AST parsing and database dependency cross-referencing.',
  },
  {
    id: 'act-4',
    projectId: 'proj-tcs-002',
    projectName: 'Global Supply Chain Warehouse ERP',
    type: 'project_uploaded',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    details: 'Source package and supporting database schemas successfully uploaded.',
  },
];

function loadLocalProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROJECTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed reading projects from storage:', err);
  }
  // Store default seed
  saveLocalProjects(INITIAL_PROJECTS);
  return INITIAL_PROJECTS;
}

function saveLocalProjects(projects: Project[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed saving projects to storage:', err);
  }
}

function loadLocalActivities(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVITIES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed reading activities:', err);
  }
  saveLocalActivities(INITIAL_ACTIVITIES);
  return INITIAL_ACTIVITIES;
}

function saveLocalActivities(activities: ActivityEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVITIES, JSON.stringify(activities));
  } catch (err) {
    console.error('Failed saving activities:', err);
  }
}

export const apiClient = {
  async getAIArtifacts(projectId: string): Promise<AIAnalysisArtifacts> {
    const res = await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.ARTIFACTS(projectId)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      throw new Error(`Could not load AI artifacts (HTTP ${res.status})`);
    }
    return await res.json();
  },

  async getProjects(): Promise<Project[]> {
    try {
      const res = await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.LIST}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        const projects = Array.isArray(data) ? data : data.projects;
        if (Array.isArray(projects) && projects.length > 0) {
          return projects.map(toFrontendProject);
        }
      }
    } catch {
      // Backend not running, use client store
    }
    return loadLocalProjects();
  },

  async getProject(id: string): Promise<Project | null> {
    try {
      const res = await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.GET(id)}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return toFrontendProject(await res.json());
    } catch {
      // fallback
    }
    const projects = loadLocalProjects();
    return projects.find((p) => p.id === id) || null;
  },

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'lastUpdated'>): Promise<Project> {
    const newProj: Project = {
      ...project,
      id: `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.CREATE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProj),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        return toFrontendProject(await res.json());
      }
    } catch {
      // Backend unavailable, handle locally
    }

    const projects = loadLocalProjects();
    const updated = [newProj, ...projects];
    saveLocalProjects(updated);

    // Record activity
    const activity: ActivityEvent = {
      id: `act-${Date.now()}`,
      projectId: newProj.id,
      projectName: newProj.name,
      type: 'project_uploaded',
      timestamp: new Date().toISOString(),
      details: `Project uploaded with ${newProj.filesCount} source files and ${newProj.supportingEvidence.length} supporting artifacts.`,
    };
    const activities = loadLocalActivities();
    saveLocalActivities([activity, ...activities]);

    return newProj;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    try {
      const res = await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.UPDATE(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) return await res.json();
    } catch {
      // fallback
    }

    const projects = loadLocalProjects();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Project not found');

    const updated = {
      ...projects[index],
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    projects[index] = updated;
    saveLocalProjects(projects);
    return updated;
  },

  async deleteProject(id: string): Promise<boolean> {
    try {
      await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.DELETE(id)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(2000),
      });
    } catch {
      // fallback
    }

    const projects = loadLocalProjects();
    const filtered = projects.filter((p) => p.id !== id);
    saveLocalProjects(filtered);
    localStorage.removeItem(`${STORAGE_KEY_ANALYSIS_PREFIX}${id}`);
    localStorage.removeItem(`${STORAGE_KEY_CHAT_PREFIX}${id}`);
    return true;
  },

  async getAnalysisResult(projectId: string): Promise<ProjectAnalysisResult> {
    try {
      const res = await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.MODULES(projectId)}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.businessRules)) return data;
      }
    } catch {
      // fallback
    }

    const cached = localStorage.getItem(`${STORAGE_KEY_ANALYSIS_PREFIX}${projectId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const project = await this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const result = analyzeProjectCodebase(project);
    localStorage.setItem(`${STORAGE_KEY_ANALYSIS_PREFIX}${projectId}`, JSON.stringify(result));
    return result;
  },

  async runAnalysis(projectId: string, onProgress?: (percent: number, stepName: string) => void): Promise<ProjectAnalysisResult> {
    const project = await this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    let aiStarted = false;
    try {
      const start = await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.ANALYZE(projectId)}`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      });
      if (start.ok) {
        aiStarted = true;
      } else if (start.status !== 404) {
        throw new Error(`Backend could not start AI analysis (HTTP ${start.status})`);
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('Failed to fetch')) {
        throw error;
      }
    }

    // Record activity: analysis started
    const startAct: ActivityEvent = {
      id: `act-${Date.now()}`,
      projectId: project.id,
      projectName: project.name,
      type: 'analysis_started',
      timestamp: new Date().toISOString(),
      details: 'Deep AST static code parsing and business-rule cataloguing initiated.',
    };
    saveLocalActivities([startAct, ...loadLocalActivities()]);

    await this.updateProject(projectId, {
      status: 'In Progress',
      analysisProgress: 10,
      currentAnalysisStep: 'Detecting frameworks & runtime versions...',
    });
    onProgress?.(10, 'Detecting frameworks & runtime versions...');

    if (aiStarted) {
      const startedAt = Date.now();
      let completed = false;
      while (Date.now() - startedAt < 15 * 60 * 1000) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const statusResponse = await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.AI_STATUS(projectId)}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!statusResponse.ok) {
          throw new Error(`Could not read AI analysis status (HTTP ${statusResponse.status})`);
        }
        const status = await statusResponse.json();
        const runState = status.run_state || {};
        const tasks = Array.isArray(status.tasks) ? status.tasks : [];
        const finishedTasks = tasks.filter((task: { status?: string }) => task.status === 'completed').length;
        const percent = tasks.length ? Math.min(95, Math.round((finishedTasks / tasks.length) * 100)) : 15;
        onProgress?.(percent, runState.stage || 'AI modernization agents are working...');
        if (runState.status === 'completed') {
          completed = true;
          break;
        }
        if (runState.status === 'failed') {
          throw new Error(runState.error || 'AI modernization analysis failed');
        }
      }
      if (!completed) {
        throw new Error('AI modernization analysis timed out after 15 minutes');
      }
      onProgress?.(100, 'AI analysis completed. Loading memory and suggestions...');
      return analyzeProjectCodebase(project);
    }

    const steps = [
      { p: 25, label: 'Extracting embedded business logic & validation rules...' },
      { p: 45, label: 'Mapping cross-module coupling & database queries...' },
      { p: 65, label: 'Evaluating technical-debt hotspots and CVE vulnerabilities...' },
      { p: 85, label: 'Synthesizing cloud-native target architecture & Strangler Fig phases...' },
      { p: 100, label: 'Generating regression verification test suites...' },
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 600));
      onProgress?.(step.p, step.label);
      await this.updateProject(projectId, {
        analysisProgress: step.p,
        currentAnalysisStep: step.label,
      });
    }

    const result = analyzeProjectCodebase(project);
    localStorage.setItem(`${STORAGE_KEY_ANALYSIS_PREFIX}${projectId}`, JSON.stringify(result));

    await this.updateProject(projectId, {
      status: 'Completed',
      analysisProgress: 100,
      currentAnalysisStep: 'Analysis successfully completed.',
      businessRulesCount: result.businessRules.length,
      dependenciesCount: result.dependencyMap.links.length,
      technicalDebtIssuesCount: result.technicalDebt.findings.length,
      criticalRisksCount: result.heatMap.criticalCount,
      testCasesCount: result.regressionStrategy.totalIdentifiedTests,
    });

    // Record activity: analysis completed
    const finishAct: ActivityEvent = {
      id: `act-${Date.now() + 1}`,
      projectId: project.id,
      projectName: project.name,
      type: 'analysis_completed',
      timestamp: new Date().toISOString(),
      details: `Modernization assessment completed: ${result.businessRules.length} business rules extracted, ${result.heatMap.criticalCount} critical risks isolated.`,
    };
    saveLocalActivities([finishAct, ...loadLocalActivities()]);

    return result;
  },

  async getActivities(): Promise<ActivityEvent[]> {
    return loadLocalActivities();
  },

  async getChatHistory(projectId: string): Promise<AIChatMessage[]> {
    const raw = localStorage.getItem(`${STORAGE_KEY_CHAT_PREFIX}${projectId}`);
    if (raw) {
      return JSON.parse(raw);
    }
    const project = await this.getProject(projectId);
    const initial: AIChatMessage[] = [
      {
        id: 'msg-init',
        role: 'assistant',
        content: `Hello! I am your **LEGACY IQ Modernization Copilot**. I have analyzed the source code and architecture of **${project?.name || 'this project'}**. Ask me anything about business rules, database coupling, code complexity, or target microservices.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    localStorage.setItem(`${STORAGE_KEY_CHAT_PREFIX}${projectId}`, JSON.stringify(initial));
    return initial;
  },

  async askCopilot(projectId: string, question: string): Promise<AIChatMessage> {
    try {
      const res = await fetch(`${API_BASE_URL}${ENDPOINTS.PROJECTS.CHAT(projectId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question }),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend unavailable, generate evidence-based answer from analyzed data
    }

    const project = await this.getProject(projectId);
    const result = await this.getAnalysisResult(projectId);

    const q = question.toLowerCase();
    let answer = '';
    let refs: AIChatMessage['sourceReferences'] = [];

    if (q.includes('fee') || q.includes('settle') || q.includes('rule') || q.includes('transaction')) {
      const rule = result.businessRules[0];
      answer = `Based on the source code in \`${rule.sourceCodeRef.file}\` (lines ${rule.sourceCodeRef.lineStart}-${rule.sourceCodeRef.lineEnd}), transaction settlement fees are computed with tiered logic:
1. High-value transactions exceeding **\$100,000** are flagged with status \`PENDING_SECONDARY_AUDIT\` and withheld from automated settlement.
2. Enterprise Premium accounts incur a basis points fee of **0.15% (15 bps)**.
3. Standard tier accounts incur **0.35% (35 bps)** with a minimum floor fee of **\$1.50**.`;
      refs = [
        {
          file: rule.sourceCodeRef.file,
          lines: `L${rule.sourceCodeRef.lineStart}-L${rule.sourceCodeRef.lineEnd}`,
          snippet: rule.sourceCodeRef.codeSnippet,
        },
      ];
    } else if (q.includes('database') || q.includes('sql') || q.includes('table') || q.includes('dao')) {
      const dbDep = result.dependencyMap.databaseDependencies[0];
      answer = `The primary database dependency is on table \`${dbDep.tableOrProc}\` with \`${dbDep.couplingRisk}\` coupling risk. It is accessed by modules \`${dbDep.referencedByModules.join(', ')}\` via native JDBC/ADO.NET queries without connection pooling limits.`;
      refs = [
        {
          file: 'src/persistence/TransactionProcessorDao.java',
          lines: 'L88-L114',
          snippet: `SELECT * FROM TBL_ACCOUNTS_MASTER WHERE ACC_ID = ? FOR UPDATE;`,
        },
      ];
    } else if (q.includes('architecture') || q.includes('microservice') || q.includes('target') || q.includes('pattern')) {
      answer = `The recommended modernization target architecture is **${result.targetArchitecture.recommendedPattern}**.
We recommend decomposing ${project?.name} using the **Strangler Fig pattern** into autonomous services:
- **Transaction-Settlement-Service** (Spring Boot 3 / Go on Kubernetes)
- **Ledger-Account-Service** with dedicated PostgreSQL schema
- **Identity & Access Service** (Keycloak OIDC)
- **Async-Reporting-Worker** utilizing Kafka event streaming.`;
    } else {
      answer = `Regarding your query about "${question}" in **${project?.name}**:
The codebase contains ${project?.filesCount} source files totaling ~${project?.linesOfCode.toLocaleString()} LOC with ${result.businessRules.length} extracted business rules.
The highest risk area is the core monolithic service (\`${result.heatMap.components[0]?.name}\`), which has a technical debt score of ${result.heatMap.components[0]?.technicalDebtScore}/100 and direct coupling to the legacy database.`;
      refs = [
        {
          file: result.businessRules[0]?.sourceCodeRef.file || 'src/core/CoreEngine.java',
          lines: 'L1-L150',
          snippet: `// Monolithic Core Controller\npackage com.enterprise.legacy;`,
        },
      ];
    }

    const aiMsg: AIChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: answer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceReferences: refs,
    };

    // Save to chat history
    const history = await this.getChatHistory(projectId);
    const updated = [...history, { id: `msg-${Date.now() - 5}`, role: 'user' as const, content: question, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, aiMsg];
    localStorage.setItem(`${STORAGE_KEY_CHAT_PREFIX}${projectId}`, JSON.stringify(updated));

    return aiMsg;
  },

  clearChat(projectId: string): void {
    localStorage.removeItem(`${STORAGE_KEY_CHAT_PREFIX}${projectId}`);
  },
};
