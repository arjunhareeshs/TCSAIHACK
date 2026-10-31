export type AnalysisStatus = 'Not Analysed' | 'In Progress' | 'Completed' | 'Failed';

export interface ProjectSourceFile {
  name: string;
  path: string;
  size: number;
  type: string;
  linesCount?: number;
  contentSnippet?: string;
}

export interface SupportingEvidenceFile {
  id: string;
  name: string;
  size: number;
  category: 'database_schema' | 'api_definition' | 'documentation' | 'config' | 'incident_log' | 'change_ticket';
  validationStatus: 'valid' | 'invalid' | 'warning';
  validationMessage?: string;
  uploadedAt: string;
}

export interface AnalysisSettings {
  technologyDetection: boolean;
  businessRuleExtraction: boolean;
  dependencyAnalysis: boolean;
  databaseDependencyAnalysis: boolean;
  obsoleteCodeIdentification: boolean;
  undocumentedBehaviourDetection: boolean;
  technicalDebtAnalysis: boolean;
  modernizationRiskAnalysis: boolean;
  migrationPlanning: boolean;
  regressionStrategyGeneration: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  language: string;
  database: string;
  status: AnalysisStatus;
  lastUpdated: string;
  createdAt: string;
  filesCount: number;
  linesOfCode: number;
  businessRulesCount: number;
  dependenciesCount: number;
  technicalDebtIssuesCount: number;
  criticalRisksCount: number;
  testCasesCount: number;
  sourceFiles: ProjectSourceFile[];
  supportingEvidence: SupportingEvidenceFile[];
  analysisSettings: AnalysisSettings;
  analysisProgress?: number;
  currentAnalysisStep?: string;
  detectedTechnologies?: string[];
}

export interface ActivityEvent {
  id: string;
  projectId: string;
  projectName: string;
  type: 'project_uploaded' | 'analysis_started' | 'analysis_completed' | 'report_generated' | 'analysis_failed';
  timestamp: string;
  details: string;
}

// Module 01: Current-State Understanding
export interface TechStackItem {
  name: string;
  category: 'Framework' | 'Runtime' | 'Database' | 'Library' | 'Build Tool';
  currentVersion: string;
  latestVersion: string;
  eolStatus: 'Active' | 'Deprecated' | 'End-of-Life';
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface ArchitectureLayer {
  name: string;
  description: string;
  components: string[];
  protocolOrTech: string;
}

export interface CurrentStateData {
  summary: string;
  totalComponents: number;
  cyclomaticComplexityAvg: number;
  maintainabilityIndexAvg: number;
  techStack: TechStackItem[];
  layers: ArchitectureLayer[];
  components: {
    name: string;
    type: string;
    path: string;
    loc: number;
    description: string;
  }[];
}

// Module 02: Business-Rule Catalogue
export interface BusinessRule {
  id: string;
  ruleCode: string;
  title: string;
  description: string;
  sourceCodeRef: {
    file: string;
    lineStart: number;
    lineEnd: number;
    codeSnippet: string;
  };
  relatedModule: string;
  criticality: 'High' | 'Medium' | 'Low';
  verificationStatus: 'Verified' | 'Pending Review' | 'Flagged';
  businessDomain: string;
  impactScore: number;
}

// Module 03: Dependency Map
export interface DependencyNode {
  id: string;
  label: string;
  type: 'module' | 'service' | 'database' | 'api' | 'external';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  loc?: number;
}

export interface DependencyLink {
  source: string;
  target: string;
  type: 'calls' | 'queries' | 'imports' | 'reads_from' | 'publishes_to';
  callsCount?: number;
  isCircular?: boolean;
}

export interface DatabaseDependency {
  tableOrProc: string;
  type: 'Table' | 'Stored Procedure' | 'View' | 'Trigger';
  referencedByModules: string[];
  accessPattern: 'Read-Heavy' | 'Write-Heavy' | 'Read/Write' | 'Batch Bulk';
  couplingRisk: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface ApiRelationship {
  endpoint: string;
  protocol: 'REST' | 'SOAP' | 'RPC' | 'JMS';
  consumerModules: string[];
  providerModule: string;
  payloadType: string;
}

export interface DependencyMapData {
  nodes: DependencyNode[];
  links: DependencyLink[];
  databaseDependencies: DatabaseDependency[];
  apiRelationships: ApiRelationship[];
  circularCount: number;
  couplingScore: number;
}

// Module 04: Modernization Heat Map
export interface HeatMapComponent {
  id: string;
  name: string;
  module: string;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  modernizationPriority: 'P1 - Immediate' | 'P2 - Near-term' | 'P3 - Deferred';
  businessImpact: 'High' | 'Medium' | 'Low';
  technicalDebtScore: number; // 0 - 100
  complexityScore: number; // 0 - 100
  riskExplanation: string;
  evidencePoints: string[];
}

export interface ModernizationHeatMapData {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  components: HeatMapComponent[];
}

// Module 05: Technical-Debt Assessment
export interface TechDebtFinding {
  id: string;
  category: 'Outdated Technologies' | 'Code Duplication' | 'High Complexity' | 'Maintainability' | 'Obsolete/Dead Code';
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  location: string;
  lineNumbers?: string;
  description: string;
  impact: string;
  evidenceSnippet: string;
  recommendation: string;
  remediationHours: number;
}

export interface TechnicalDebtData {
  totalEstimatedRemediationHours: number;
  debtRatioPercentage: number;
  maintainabilityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  findings: TechDebtFinding[];
  duplicateBlocksCount: number;
  obsoleteFunctionsCount: number;
}

// Module 06: Target Architecture
export interface RestructuredComponent {
  legacyComponent: string;
  targetMicroservice: string;
  pattern: 'Event-Driven' | 'Synchronous REST' | 'Serverless Function' | 'Async Batch';
  databaseStrategy: 'Dedicated Database per Service' | 'Read Replica' | 'CQRS Store' | 'Cache-Aside';
  status: 'Planned' | 'In Design';
}

export interface TargetArchitectureData {
  recommendedPattern: string;
  targetTechStack: {
    category: string;
    technologies: string[];
  }[];
  componentRestructuring: RestructuredComponent[];
  databaseArchitecture: {
    layer: string;
    recommendation: string;
    rationale: string;
  }[];
  apiArchitecture: {
    gateway: string;
    style: string;
    security: string;
    protocol: string;
  };
  comparisonPoints: {
    dimension: string;
    currentState: string;
    targetState: string;
    benefit: string;
  }[];
}

// Module 07: Migration Options
export interface MigrationStrategy {
  type: 'Rehost' | 'Replatform' | 'Refactor' | 'Rearchitect';
  title: string;
  shortDescription: string;
  suitabilityScore: number; // 0 - 100
  effortMonths: string;
  costEstimate: 'Low' | 'Moderate' | 'High' | 'Significant';
  timeToValue: string;
  riskRating: 'Low' | 'Medium' | 'High';
  pros: string[];
  cons: string[];
  recommended: boolean;
  evidenceRationale: string;
}

export interface MigrationOptionsData {
  primaryRecommendation: string;
  rationale: string;
  strategies: MigrationStrategy[];
}

// Module 08: Phased Modernization Roadmap
export interface RoadmapPhase {
  phaseNumber: number;
  title: string;
  durationWeeks: string;
  focusArea: string;
  keyDeliverables: string[];
  modulesCovered: string[];
  complexity: 'Low' | 'Medium' | 'High';
  riskMitigation: string;
  dependencies: string[];
}

export interface PhasedRoadmapData {
  totalEstimatedDuration: string;
  phases: RoadmapPhase[];
}

// Module 09: Regression / Testing Strategy
export interface RegressionTestCase {
  id: string;
  ruleCodeRef: string;
  title: string;
  scenario: string;
  given: string;
  when: string;
  then: string;
  coverageType: 'Unit' | 'Integration' | 'End-to-End' | 'Contract';
  status: 'Passed' | 'Failed' | 'Unexecuted';
  lastRunDate?: string;
  generatedTestCodeSnippet: string;
}

export interface RegressionStrategyData {
  testCoveragePercentage: number;
  totalIdentifiedTests: number;
  passedTests: number;
  failedTests: number;
  unexecutedTests: number;
  testingRecommendations: string[];
  testCases: RegressionTestCase[];
}

// Full Analysis Results Container
export interface ProjectAnalysisResult {
  projectId: string;
  analyzedAt: string;
  version: string;
  currentState: CurrentStateData;
  businessRules: BusinessRule[];
  dependencyMap: DependencyMapData;
  heatMap: ModernizationHeatMapData;
  technicalDebt: TechnicalDebtData;
  targetArchitecture: TargetArchitectureData;
  migrationOptions: MigrationOptionsData;
  roadmap: PhasedRoadmapData;
  regressionStrategy: RegressionStrategyData;
}

// AI Copilot Chat Message
export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourceReferences?: {
    file: string;
    lines?: string;
    snippet?: string;
  }[];
}

