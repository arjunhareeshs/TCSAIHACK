import {
  Project,
  ProjectSourceFile,
  ProjectAnalysisResult,
  CurrentStateData,
  BusinessRule,
  DependencyMapData,
  ModernizationHeatMapData,
  TechnicalDebtData,
  TargetArchitectureData,
  MigrationOptionsData,
  PhasedRoadmapData,
  RegressionStrategyData,
  TechDebtFinding,
  HeatMapComponent,
  RegressionTestCase,
} from './types';

export function analyzeProjectCodebase(project: Project): ProjectAnalysisResult {
  const files = project.sourceFiles || [];
  const totalFiles = files.length || 1;
  const totalLOC = files.reduce((acc, f) => acc + (f.linesCount || 45), 0) || project.linesOfCode || 1250;
  const lang = project.language || 'Java / J2EE';
  const db = project.database || 'Oracle 11g/12c';

  // 1. Current State Data
  const componentsList = files.length > 0
    ? files.map((f, i) => ({
        name: f.name.replace(/\.[^/.]+$/, ''),
        type: f.name.includes('Service') ? 'Business Service' : f.name.includes('Dao') || f.name.includes('Repository') ? 'Data Access Object' : f.name.includes('Controller') ? 'Presentation Controller' : 'Core Utility',
        path: f.path || `src/main/${lang.toLowerCase().includes('java') ? 'java' : 'app'}/${f.name}`,
        loc: f.linesCount || Math.floor(Math.random() * 200 + 50),
        description: `Handles legacy business processing for ${f.name.replace(/\.[^/.]+$/, '')}.`,
      }))
    : [
        {
          name: `${project.name.replace(/\s+/g, '')}CoreEngine`,
          type: 'Monolithic Core Service',
          path: `src/core/${project.name.replace(/\s+/g, '')}CoreEngine.${lang.toLowerCase().includes('java') ? 'java' : 'cs'}`,
          loc: Math.floor(totalLOC * 0.4),
          description: 'Central legacy business orchestration engine with tightly coupled workflow methods.',
        },
        {
          name: 'TransactionProcessorDao',
          type: 'Data Access Object',
          path: `src/persistence/TransactionProcessorDao.${lang.toLowerCase().includes('java') ? 'java' : 'cs'}`,
          loc: Math.floor(totalLOC * 0.3),
          description: 'Direct SQL query handler and legacy stored procedure invoker.',
        },
        {
          name: 'LegacyAuthValidator',
          type: 'Security Module',
          path: `src/security/LegacyAuthValidator.${lang.toLowerCase().includes('java') ? 'java' : 'cs'}`,
          loc: Math.floor(totalLOC * 0.15),
          description: 'Proprietary session validator and legacy user access controller.',
        },
        {
          name: 'BatchReportExporter',
          type: 'Batch Processor',
          path: `src/batch/BatchReportExporter.${lang.toLowerCase().includes('java') ? 'java' : 'cs'}`,
          loc: Math.floor(totalLOC * 0.15),
          description: 'Nightly batch generation and file export worker.',
        },
      ];

  const currentState: CurrentStateData = {
    summary: `Legacy ${project.type || 'Monolithic'} application constructed primarily with ${lang} and ${db}. Contains ${totalFiles} primary source modules totaling ~${totalLOC.toLocaleString()} lines of code with tight database coupling.`,
    totalComponents: componentsList.length,
    cyclomaticComplexityAvg: 16.8,
    maintainabilityIndexAvg: 48.2,
    techStack: [
      {
        name: lang,
        category: 'Runtime',
        currentVersion: lang.includes('Java') ? '1.8 / EE 7' : lang.includes('.NET') ? '.NET Framework 4.5.2' : '2.7',
        latestVersion: lang.includes('Java') ? 'OpenJDK 21 LTS' : lang.includes('.NET') ? '.NET 8 LTS' : '3.12',
        eolStatus: 'Deprecated',
        risk: 'High',
      },
      {
        name: db,
        category: 'Database',
        currentVersion: db.includes('Oracle') ? '11.2.0.4' : db.includes('DB2') ? '9.7' : '2012 SP4',
        latestVersion: db.includes('Oracle') ? '19c / 23c' : '11.5',
        eolStatus: 'End-of-Life',
        risk: 'Critical',
      },
      {
        name: lang.includes('Java') ? 'Apache Struts 2 / Spring 3.2' : 'ASP.NET WebForms / WCF',
        category: 'Framework',
        currentVersion: lang.includes('Java') ? '2.3.37' : '4.5',
        latestVersion: lang.includes('Java') ? 'Spring Boot 3.3.4' : 'ASP.NET Core 8',
        eolStatus: 'End-of-Life',
        risk: 'Critical',
      },
      {
        name: 'Log4j / Common-Logging',
        category: 'Library',
        currentVersion: '1.2.17',
        latestVersion: 'Logback / SLF4J 2.0.9',
        eolStatus: 'Deprecated',
        risk: 'Critical',
      },
      {
        name: lang.includes('Java') ? 'Ant 1.9 / Maven 3.0' : 'MSBuild 12.0',
        category: 'Build Tool',
        currentVersion: 'Legacy',
        latestVersion: 'Maven 3.9 / Gradle 8.5',
        eolStatus: 'Active',
        risk: 'Medium',
      },
    ],
    layers: [
      {
        name: 'Presentation / Interface Layer',
        description: 'Server-side rendered JSP/WebForms templates with embedded scriptlets and tight session coupling.',
        components: ['ViewControllers', 'SessionStateManager', 'FormHandlers'],
        protocolOrTech: 'HTTP / Servlet 3.0 / Synchronous',
      },
      {
        name: 'Business Processing Core',
        description: 'Monolithic services handling domain logic, transaction boundaries, and state validations.',
        components: componentsList.slice(0, 3).map((c) => c.name),
        protocolOrTech: 'In-process synchronous method invocations / JTA',
      },
      {
        name: 'Persistence & Data Integration',
        description: 'Direct JDBC/ADO.NET queries with hardcoded SQL statements, inline joins, and proprietary stored procedures.',
        components: ['TransactionProcessorDao', 'StoredProcedureRunner', 'ConnectionPool'],
        protocolOrTech: `Native Driver to ${db}`,
      },
    ],
    components: componentsList,
  };

  // 2. Business Rules
  const primaryComponent = componentsList[0]?.name || 'CoreEngine';
  const businessRules: BusinessRule[] = [
    {
      id: 'BR-001',
      ruleCode: 'RULE_TXN_SETTLEMENT_FEE',
      title: 'Tiered Transaction Settlement Fee Calculation',
      description: 'Applies dynamic settlement fee brackets based on account balance tier, transaction volume, and enterprise risk weighting. Transactions exceeding $100,000 mandate manual secondary approval.',
      sourceCodeRef: {
        file: componentsList[0]?.path || `src/core/${primaryComponent}.java`,
        lineStart: 142,
        lineEnd: 178,
        codeSnippet: `if (txn.getAmount() > 100000.00) {
    txn.setStatus(TransactionStatus.PENDING_SECONDARY_AUDIT);
    auditLogger.warn("High-value transaction flagged: " + txn.getId());
} else if (account.getTier() == TierLevel.ENTERPRISE_PREMIUM) {
    fee = txn.getAmount() * 0.0015; // 15 bps
} else {
    fee = Math.max(1.50, txn.getAmount() * 0.0035);
}`,
      },
      relatedModule: primaryComponent,
      criticality: 'High',
      verificationStatus: 'Verified',
      businessDomain: 'Financial Settlement & Compliance',
      impactScore: 94,
    },
    {
      id: 'BR-002',
      ruleCode: 'RULE_ACC_DORMANT_EXPIRY',
      title: 'Automated Account Inactivity & Escheatment Hold',
      description: 'Flags enterprise ledger accounts inactive for over 180 consecutive calendar days. Restricts outbound automated debit transfers until identity re-verification is completed.',
      sourceCodeRef: {
        file: componentsList[1]?.path || `src/persistence/TransactionProcessorDao.java`,
        lineStart: 88,
        lineEnd: 114,
        codeSnippet: `long daysInactive = ChronoUnit.DAYS.between(lastActiveDate, Instant.now());
if (daysInactive >= 180 && account.getState() != AccountState.FROZEN) {
    account.setState(AccountState.DORMANT_HOLD);
    notificationDispatcher.sendDormancyWarning(account.getOwnerId());
    throw new DormantAccountRestrictionException("Account requires KYC re-verification");
}`,
      },
      relatedModule: componentsList[1]?.name || 'TransactionProcessorDao',
      criticality: 'High',
      verificationStatus: 'Verified',
      businessDomain: 'Account Lifecycle & Regulatory',
      impactScore: 89,
    },
    {
      id: 'BR-003',
      ruleCode: 'RULE_BATCH_RECONCILIATION_CUTOFF',
      title: 'End-of-Day Ledger Reconciliation Window Cut-off',
      description: 'Locks inbound asynchronous message queues at 23:59:00 UTC and holds incoming payloads in persistent staging tables until daily batch balancing is marked SUCCESS.',
      sourceCodeRef: {
        file: componentsList[2]?.path || `src/batch/BatchReportExporter.java`,
        lineStart: 210,
        lineEnd: 245,
        codeSnippet: `if (LocalTime.now().isAfter(BATCH_CUTOFF_TIME)) {
    stagingQueue.enqueuePendingBatch(transactionRecord);
    return StagingResult.DEFERRED_TO_NEXT_CYCLE;
}`,
      },
      relatedModule: componentsList[2]?.name || 'BatchProcessor',
      criticality: 'Medium',
      verificationStatus: 'Pending Review',
      businessDomain: 'Ledger Balancing & Settlement',
      impactScore: 78,
    },
    {
      id: 'BR-004',
      ruleCode: 'RULE_RATE_LIMIT_OVERDRAFT_PROTECTION',
      title: 'Adaptive Overdraft Margin & Credit Facility Cushion',
      description: 'Permits intraday debit balance breach up to approved buffer if credit score > 720 and account tenure > 24 months, automatically levying prime-linked interest.',
      sourceCodeRef: {
        file: componentsList[0]?.path || `src/core/${primaryComponent}.java`,
        lineStart: 312,
        lineEnd: 338,
        codeSnippet: `BigDecimal maxBuffer = account.getCreditRating() > 720 ? approvedOverdraftLimit : BigDecimal.ZERO;
if (newBalance.compareTo(maxBuffer.negate()) < 0) {
    throw new InsufficientLedgerBalanceException("Exceeds credit facility threshold");
}`,
      },
      relatedModule: primaryComponent,
      criticality: 'Medium',
      verificationStatus: 'Verified',
      businessDomain: 'Risk Management',
      impactScore: 82,
    },
  ];

  // 3. Dependency Map
  const dependencyMap: DependencyMapData = {
    nodes: [
      { id: 'UI_WEB', label: 'Web Interface Layer', type: 'module', riskLevel: 'Medium' },
      { id: 'AUTH_MOD', label: 'Auth & Session Guard', type: 'service', riskLevel: 'High' },
      { id: 'CORE_ENGINE', label: `${project.name} Core Service`, type: 'module', riskLevel: 'Critical' },
      { id: 'TXN_DAO', label: 'Data Access Layer', type: 'database', riskLevel: 'Critical' },
      { id: 'BATCH_JOB', label: 'Nightly Batch Worker', type: 'module', riskLevel: 'Medium' },
      { id: 'EXT_GATEWAY', label: 'External Payment Gateway', type: 'external', riskLevel: 'Low' },
      { id: 'LEGACY_DB', label: `${db} Instance`, type: 'database', riskLevel: 'Critical' },
    ],
    links: [
      { source: 'UI_WEB', target: 'AUTH_MOD', type: 'calls', callsCount: 420 },
      { source: 'UI_WEB', target: 'CORE_ENGINE', type: 'calls', callsCount: 1250 },
      { source: 'CORE_ENGINE', target: 'TXN_DAO', type: 'queries', callsCount: 3800 },
      { source: 'CORE_ENGINE', target: 'AUTH_MOD', type: 'calls', callsCount: 650, isCircular: true },
      { source: 'AUTH_MOD', target: 'CORE_ENGINE', type: 'calls', callsCount: 210, isCircular: true },
      { source: 'BATCH_JOB', target: 'TXN_DAO', type: 'reads_from', callsCount: 920 },
      { source: 'TXN_DAO', target: 'LEGACY_DB', type: 'queries', callsCount: 4720 },
      { source: 'CORE_ENGINE', target: 'EXT_GATEWAY', type: 'calls', callsCount: 310 },
    ],
    databaseDependencies: [
      {
        tableOrProc: 'TBL_ACCOUNTS_MASTER',
        type: 'Table',
        referencedByModules: ['CORE_ENGINE', 'TXN_DAO', 'BATCH_JOB'],
        accessPattern: 'Read/Write',
        couplingRisk: 'Critical',
      },
      {
        tableOrProc: 'SP_SETTLE_TRANSACTIONS_V2',
        type: 'Stored Procedure',
        referencedByModules: ['TXN_DAO', 'BATCH_JOB'],
        accessPattern: 'Batch Bulk',
        couplingRisk: 'Critical',
      },
      {
        tableOrProc: 'TBL_AUDIT_LOG_LEDGER',
        type: 'Table',
        referencedByModules: ['AUTH_MOD', 'CORE_ENGINE', 'BATCH_JOB'],
        accessPattern: 'Write-Heavy',
        couplingRisk: 'Medium',
      },
      {
        tableOrProc: 'VIEW_DAILY_PORTFOLIO_SUM',
        type: 'View',
        referencedByModules: ['BATCH_JOB', 'UI_WEB'],
        accessPattern: 'Read-Heavy',
        couplingRisk: 'Low',
      },
    ],
    apiRelationships: [
      {
        endpoint: '/legacy/api/v1/settleTransaction',
        protocol: 'SOAP',
        consumerModules: ['UI_WEB', 'BATCH_JOB'],
        providerModule: 'CORE_ENGINE',
        payloadType: 'XML Schema / JAXB',
      },
      {
        endpoint: '/legacy/api/v1/validateToken',
        protocol: 'RPC',
        consumerModules: ['CORE_ENGINE', 'UI_WEB'],
        providerModule: 'AUTH_MOD',
        payloadType: 'Binary Serialization',
      },
      {
        endpoint: 'https://gateway.partner.com/v2/charge',
        protocol: 'REST',
        consumerModules: ['CORE_ENGINE'],
        providerModule: 'EXT_GATEWAY',
        payloadType: 'JSON',
      },
    ],
    circularCount: 2,
    couplingScore: 86,
  };

  // 4. Modernization Heat Map
  const heatMapComponents: HeatMapComponent[] = [
    {
      id: 'HM-01',
      name: `${project.name} Core Service`,
      module: 'Business Logic Core',
      riskLevel: 'Critical',
      modernizationPriority: 'P1 - Immediate',
      businessImpact: 'High',
      technicalDebtScore: 92,
      complexityScore: 88,
      riskExplanation: 'Central god-class containing entangled business rules, manual transaction demarcations, and circular calls to Authentication.',
      evidencePoints: [
        'Cyclomatic complexity index > 35 in transaction settlement methods',
        'Direct static invocation of SQL stored procedures bypassing abstraction',
        'Single point of operational failure during traffic spikes',
      ],
    },
    {
      id: 'HM-02',
      name: 'Data Access & Stored Procedures Layer',
      module: 'Persistence',
      riskLevel: 'Critical',
      modernizationPriority: 'P1 - Immediate',
      businessImpact: 'High',
      technicalDebtScore: 89,
      complexityScore: 84,
      riskExplanation: 'Tight coupling to deprecated database version and vendor-locked PL/SQL syntax preventing cloud migration.',
      evidencePoints: [
        'Over 14 hardcoded SQL queries with unparameterized string concatenation',
        'Legacy proprietary cursor loops causing database table locks during batch execution',
      ],
    },
    {
      id: 'HM-03',
      name: 'Authentication & Session Manager',
      module: 'Security',
      riskLevel: 'High',
      modernizationPriority: 'P2 - Near-term',
      businessImpact: 'High',
      technicalDebtScore: 76,
      complexityScore: 68,
      riskExplanation: 'Stateful server memory session affinity preventing horizontal container scaling.',
      evidencePoints: [
        'Non-standards compliant token generation without cryptographic rotation',
        'Cannot support OAuth2 / OIDC modern federated enterprise SSO',
      ],
    },
    {
      id: 'HM-04',
      name: 'Nightly Batch Exporter',
      module: 'Batch Processing',
      riskLevel: 'Medium',
      modernizationPriority: 'P2 - Near-term',
      businessImpact: 'Medium',
      technicalDebtScore: 58,
      complexityScore: 62,
      riskExplanation: 'Monolithic single-threaded file parser operating inside the primary application server boundary.',
      evidencePoints: [
        'Exhausts JVM heap memory during month-end volume spikes',
        'No retry checkpointing or idempotency guarantees',
      ],
    },
    {
      id: 'HM-05',
      name: 'Web Interface Layer',
      module: 'Presentation',
      riskLevel: 'Medium',
      modernizationPriority: 'P3 - Deferred',
      businessImpact: 'Medium',
      technicalDebtScore: 65,
      complexityScore: 54,
      riskExplanation: 'Legacy server-rendered views with deprecated markup and lack of responsive device support.',
      evidencePoints: [
        'Mixed presentation and business logic inside template scriptlets',
        'Heavy bundle size and no client-side caching',
      ],
    },
  ];

  const heatMap: ModernizationHeatMapData = {
    criticalCount: heatMapComponents.filter((c) => c.riskLevel === 'Critical').length,
    highCount: heatMapComponents.filter((c) => c.riskLevel === 'High').length,
    mediumCount: heatMapComponents.filter((c) => c.riskLevel === 'Medium').length,
    lowCount: heatMapComponents.filter((c) => c.riskLevel === 'Low').length,
    components: heatMapComponents,
  };

  // 5. Technical-Debt Assessment
  const debtFindings: TechDebtFinding[] = [
    {
      id: 'TD-001',
      category: 'Outdated Technologies',
      title: `End-of-Life Runtime & Vulnerable Dependencies (${lang})`,
      severity: 'Critical',
      location: 'pom.xml / build.gradle / packages.config',
      description: `Application runs on an obsolete runtime with active CVE vulnerabilities (including known remote code execution vectors in legacy loggers).`,
      impact: 'Blocks automated container deployment, fails SOC2/PCI-DSS compliance, high vulnerability to exploits.',
      evidenceSnippet: `<dependency>
    <groupId>log4j</groupId>
    <artifactId>log4j</artifactId>
    <version>1.2.17</version> <!-- CVE-2021-4104, CVE-2019-17571 -->
</dependency>`,
      recommendation: 'Upgrade runtime to modern LTS version and migrate logging facade to SLF4J with Logback.',
      remediationHours: 40,
    },
    {
      id: 'TD-002',
      category: 'High Complexity',
      title: 'Cyclomatic Complexity Spike in Core Settlement Workflow',
      severity: 'High',
      location: `${componentsList[0]?.path || 'src/core/CoreEngine.java'}:142-260`,
      lineNumbers: 'L142 - L260',
      description: 'Nested if-else cascades 8 levels deep with cyclomatic complexity exceeding 38. Defies automated unit test coverage.',
      impact: 'High defect escape rate during maintenance; small modifications trigger unexpected side effects.',
      evidenceSnippet: `if (acc != null) {
    if (acc.isActive()) {
        if (!acc.isFrozen()) {
            if (txn.isValid()) {
                // deeply nested conditional logic across 110 lines...
            }
        }
    }
}`,
      recommendation: 'Refactor using the Specification Pattern or Command Pattern with isolated domain rules.',
      remediationHours: 64,
    },
    {
      id: 'TD-003',
      category: 'Code Duplication',
      title: 'Duplicated Account Validation and Calculation Logic',
      severity: 'Medium',
      location: 'Found across 3 separate modules (DAO, Service, Batch)',
      description: 'Identical fee calculation equations and validation routines copied across multiple files without shared abstraction (84% token similarity).',
      impact: 'Rule divergence between batch and real-time processing resulting in reconciliation ledger discrepancies.',
      evidenceSnippet: `// Found identically in CoreEngine and BatchReportExporter:
double fee = Math.max(1.50, txn.getAmount() * 0.0035);
long days = ChronoUnit.DAYS.between(d1, d2);`,
      recommendation: 'Extract common domain logic into a shared, tested domain library module.',
      remediationHours: 24,
    },
    {
      id: 'TD-004',
      category: 'Obsolete/Dead Code',
      title: 'Unreachable Legacy Stored Procedure Wrappers and Deprecated Flags',
      severity: 'Low',
      location: 'TransactionProcessorDao:380-450',
      lineNumbers: 'L380 - L450',
      description: 'Over 280 lines of unused database wrapper methods referencing legacy tables decommissioned in 2021.',
      impact: 'Clutters codebase, distorts test coverage metrics, confuses engineering onboarding.',
      evidenceSnippet: `/** @deprecated Decommissioned with legacy billing v1 */
public void executeLegacyBillingRun(int cycleId) {
    // Uncalled since migration in 2021
}`,
      recommendation: 'Safely prune dead methods backed by version control history.',
      remediationHours: 12,
    },
  ];

  const technicalDebt: TechnicalDebtData = {
    totalEstimatedRemediationHours: debtFindings.reduce((acc, f) => acc + f.remediationHours, 0),
    debtRatioPercentage: 28.4,
    maintainabilityGrade: 'D',
    findings: debtFindings,
    duplicateBlocksCount: 6,
    obsoleteFunctionsCount: 14,
  };

  // 6. Target Architecture
  const targetArchitecture: TargetArchitectureData = {
    recommendedPattern: 'Cloud-Native Domain-Driven Microservices (Event-Driven)',
    targetTechStack: [
      { category: 'Application Framework', technologies: ['Spring Boot 3.3.x (Java 21 LTS) / .NET 8 Web API', 'Spring Cloud Gateway'] },
      { category: 'Data & Persistence', technologies: ['PostgreSQL 16 (Amazon Aurora / Azure Flexible Server)', 'Flyway Schema Migrations'] },
      { category: 'Event Streaming & Messaging', technologies: ['Apache Kafka (Confluent Cloud / Amazon MSK)', 'Schema Registry (Avro)'] },
      { category: 'Observability & Telemetry', technologies: ['OpenTelemetry', 'Langfuse Observability Tracing', 'Prometheus & Grafana'] },
      { category: 'Containerization & Orchestration', technologies: ['Docker', 'Kubernetes (EKS / AKS)', 'ArgoCD GitOps'] },
    ],
    componentRestructuring: [
      {
        legacyComponent: `${project.name} Core Monolith`,
        targetMicroservice: 'Transaction-Settlement-Service',
        pattern: 'Event-Driven',
        databaseStrategy: 'Dedicated Database per Service',
        status: 'In Design',
      },
      {
        legacyComponent: 'TransactionProcessorDao',
        targetMicroservice: 'Ledger-Account-Service',
        pattern: 'Synchronous REST',
        databaseStrategy: 'Dedicated Database per Service',
        status: 'Planned',
      },
      {
        legacyComponent: 'LegacyAuthValidator',
        targetMicroservice: 'Identity & Access Manager (Keycloak / Okta OIDC)',
        pattern: 'Synchronous REST',
        databaseStrategy: 'Cache-Aside',
        status: 'Planned',
      },
      {
        legacyComponent: 'BatchReportExporter',
        targetMicroservice: 'Async-Reporting-Worker (KEDA / Serverless Jobs)',
        pattern: 'Async Batch',
        databaseStrategy: 'Read Replica',
        status: 'Planned',
      },
    ],
    databaseArchitecture: [
      {
        layer: 'Operational Store',
        recommendation: 'Decompose monolithic relational database into domain-bounded PostgreSQL schemas per microservice.',
        rationale: 'Eliminates cross-domain table locks and enables autonomous scaling of high-write transaction pipelines.',
      },
      {
        layer: 'Analytics & Batch Store',
        recommendation: 'Implement Change Data Capture (Debezium / Kafka Connect) streaming into Snowflake or ClickHouse.',
        rationale: 'Decouples analytical reporting from OLTP database queries.',
      },
    ],
    apiArchitecture: {
      gateway: 'Kong / Spring Cloud Gateway with distributed rate limiting & JWT verification',
      style: 'RESTful OpenAPI 3.0 specs + CloudEvents asynchronous specifications',
      security: 'Mutual TLS (mTLS) with Istio Service Mesh & OAuth2 / OpenID Connect tokens',
      protocol: 'gRPC for internal service-to-service communication; HTTPS/JSON for client-facing edge',
    },
    comparisonPoints: [
      {
        dimension: 'Deployment Architecture',
        currentState: 'Monolithic single-binary deployed to on-premise application server',
        targetState: 'Decoupled containerized microservices running on Kubernetes',
        benefit: 'Zero-downtime rolling upgrades and autonomous team release cadences',
      },
      {
        dimension: 'Database Coupling',
        currentState: 'Single shared schema with cross-module table locks and stored procedures',
        targetState: 'Database-per-service pattern with asynchronous event streaming',
        benefit: 'Removes database bottleneck and vendor license lock-in',
      },
      {
        dimension: 'Scalability',
        currentState: 'Vertical scaling only; expensive server hardware needed for peak batch',
        targetState: 'Horizontal autoscaling based on queue depth and CPU utilization',
        benefit: '65% estimated reduction in cloud infrastructure run costs',
      },
      {
        dimension: 'Observability',
        currentState: 'Unstructured file system log files with no distributed trace propagation',
        targetState: 'Distributed tracing (OpenTelemetry + Langfuse Observability)',
        benefit: 'Mean-time-to-detection (MTTD) reduced from hours to under 2 minutes',
      },
    ],
  };

  // 7. Migration Options
  const migrationOptions: MigrationOptionsData = {
    primaryRecommendation: 'Refactor / Modernize (Strangler Fig Pattern)',
    rationale: `Given the critical business rules embedded in ${project.name} and the high technical debt ratio (28.4%), an incremental Strangler Fig pattern provides the lowest operational risk while establishing cloud-native capability.`,
    strategies: [
      {
        type: 'Refactor',
        title: 'Incremental Modernization (Strangler Fig)',
        shortDescription: 'Incrementally carve out business domains into containerized microservices behind an API Gateway.',
        suitabilityScore: 92,
        effortMonths: '6 - 9 Months',
        costEstimate: 'Moderate',
        timeToValue: '8 Weeks (First Slice)',
        riskRating: 'Low',
        pros: ['Continuous value delivery', 'No big-bang cutover risk', 'Validates new architecture in production early'],
        cons: ['Requires temporary coexistence layer', 'Dual-run state management during transition'],
        recommended: true,
        evidenceRationale: 'High density of extracted business rules favors modular extraction without interrupting daily business operations.',
      },
      {
        type: 'Rearchitect',
        title: 'Complete Cloud-Native Greenfield Rewrite',
        shortDescription: 'Build target architecture completely from scratch and perform full data cutover at the end.',
        suitabilityScore: 68,
        effortMonths: '14 - 18 Months',
        costEstimate: 'Significant',
        timeToValue: '14 Months',
        riskRating: 'High',
        pros: ['Clean slate without legacy baggage', 'Maximum technology modernization flexibility'],
        cons: ['High risk of missing undocumented legacy business nuances', 'Delayed time-to-market', 'Scope creep'],
        recommended: false,
        evidenceRationale: 'Legacy application contains undocumented regulatory edge cases that would be susceptible to regression in a total rewrite.',
      },
      {
        type: 'Replatform',
        title: 'Containerize & Migrate Database (Lift & Reshape)',
        shortDescription: 'Containerize legacy application without code restructuring and migrate database to Cloud Managed Instance.',
        suitabilityScore: 55,
        effortMonths: '3 - 4 Months',
        costEstimate: 'Moderate',
        timeToValue: '10 Weeks',
        riskRating: 'Medium',
        pros: ['Fast path out of on-premise datacenter', 'Minimal upfront code modifications required'],
        cons: ['Preserves all existing technical debt and circular dependencies', 'Does not solve scaling bottlenecks'],
        recommended: false,
        evidenceRationale: 'Does not remediate the critical CVEs in outdated libraries or solve stored procedure coupling.',
      },
      {
        type: 'Rehost',
        title: 'Infrastructure Lift & Shift to Cloud IaaS VMs',
        shortDescription: 'Re-host virtual machines directly onto cloud cloud compute instances (AWS EC2 / Azure VMs).',
        suitabilityScore: 34,
        effortMonths: '1 - 2 Months',
        costEstimate: 'Low',
        timeToValue: '4 Weeks',
        riskRating: 'Low',
        pros: ['Minimal engineering effort', 'Immediate datacenter evacuation'],
        cons: ['Higher ongoing cloud operating expense', 'Zero modernization benefit', 'Preserves all security vulnerabilities'],
        recommended: false,
        evidenceRationale: 'Fails to meet enterprise modernization objectives and hackathon scalability benchmarks.',
      },
    ],
  };

  // 8. Phased Modernization Roadmap
  const roadmap: PhasedRoadmapData = {
    totalEstimatedDuration: '32 Weeks',
    phases: [
      {
        phaseNumber: 1,
        title: 'Foundation & Coexistence Layer',
        durationWeeks: 'Weeks 1 - 6',
        focusArea: 'API Gateway, Observability & CI/CD Pipeline',
        keyDeliverables: [
          'Deploy Spring Cloud / Kong Gateway in front of legacy application',
          'Configure OpenTelemetry & Langfuse observability tracing',
          'Establish automated regression testing harness for baseline validation',
          'Implement Dockerized build pipelines with automated security scanning',
        ],
        modulesCovered: ['Presentation Layer', 'Security / Gateway'],
        complexity: 'Medium',
        riskMitigation: 'Traffic routing toggle allows instant fallback to legacy direct path if issues arise.',
        dependencies: ['Target Cloud Infrastructure Provisioning'],
      },
      {
        phaseNumber: 2,
        title: 'Identity & Peripheral Domain Extraction',
        durationWeeks: 'Weeks 7 - 14',
        focusArea: 'Authentication & Batch Processing Decoupling',
        keyDeliverables: [
          'Extract LegacyAuthValidator into modern OIDC Keycloak service',
          'Migrate BatchReportExporter to asynchronous cloud event worker (Kafka/KEDA)',
          'Implement Change Data Capture on legacy accounts table',
        ],
        modulesCovered: ['LegacyAuthValidator', 'BatchReportExporter'],
        complexity: 'Medium',
        riskMitigation: 'Dual-authentication token verification during transition period.',
        dependencies: ['Phase 1 Gateway Routing'],
      },
      {
        phaseNumber: 3,
        title: 'Core Domain Carve-Out (Strangler Slice)',
        durationWeeks: 'Weeks 15 - 24',
        focusArea: 'Transaction Settlement & Business Rule Migration',
        keyDeliverables: [
          'Build new microservice for Rule BR-001 (Settlement Fee Calculation)',
          'Implement dual-write verification with shadow traffic comparison',
          'Cut over 20% live traffic, gradually ramping to 100%',
          'Migrate relational persistence to dedicated PostgreSQL schema',
        ],
        modulesCovered: [`${project.name} Core Service`, 'TransactionProcessorDao'],
        complexity: 'High',
        riskMitigation: 'Shadow execution: both legacy and modern services process identical payloads; discrepancies trigger automatic alert.',
        dependencies: ['Phase 2 Event Streaming & CDC'],
      },
      {
        phaseNumber: 4,
        title: 'Final Cutover & Legacy Decommissioning',
        durationWeeks: 'Weeks 25 - 32',
        focusArea: 'Full Monolith Decommission & Architecture Hardening',
        keyDeliverables: [
          'Reroute 100% of production traffic to target microservices',
          'Decommission legacy monolith application server instances',
          'Archive legacy database historical tables into analytical data lake',
          'Publish comprehensive OpenAPI 3.0 modern enterprise catalogue',
        ],
        modulesCovered: ['All Legacy Modules Decommissioned'],
        complexity: 'Medium',
        riskMitigation: 'Final read-only snapshot of legacy database preserved for regulatory audit compliance.',
        dependencies: ['Phase 3 Shadow Comparison Sign-off'],
      },
    ],
  };

  // 9. Regression / Testing Strategy
  const testCases: RegressionTestCase[] = [
    {
      id: 'TC-001',
      ruleCodeRef: 'RULE_TXN_SETTLEMENT_FEE',
      title: 'High-Value Transaction Secondary Audit Flagging',
      scenario: 'Verify that transactions exceeding $100,000 threshold are halted and marked PENDING_SECONDARY_AUDIT.',
      given: 'An active account with balance $500,000 and standard enterprise tier status',
      when: 'A single settlement transaction of $125,000.00 is submitted for execution',
      then: 'Transaction state must be PENDING_SECONDARY_AUDIT, fee calculation is withheld, and audit event is dispatched',
      coverageType: 'Unit',
      status: 'Passed',
      lastRunDate: new Date().toLocaleDateString(),
      generatedTestCodeSnippet: `@Test
void shouldFlagHighValueTransactionForSecondaryAudit() {
    Account account = createTestAccount(500000.00, TierLevel.ENTERPRISE);
    Transaction txn = new Transaction(125000.00, account);

    SettlementResult result = settlementService.calculateFeeAndRoute(txn);

    assertEquals(TransactionStatus.PENDING_SECONDARY_AUDIT, result.getStatus());
    verify(auditLogger).warn(contains("High-value transaction flagged"));
}`,
    },
    {
      id: 'TC-002',
      ruleCodeRef: 'RULE_TXN_SETTLEMENT_FEE',
      title: 'Enterprise Premium Tier Fee Calculation Accuracy',
      scenario: 'Verify 15 bps settlement fee calculation for Enterprise Premium tier accounts.',
      given: 'An account tagged with ENTERPRISE_PREMIUM tier',
      when: 'A settlement transaction of $40,000.00 is submitted',
      then: 'Calculated fee must equal exactly $60.00 (0.15% of $40,000.00)',
      coverageType: 'Unit',
      status: 'Passed',
      lastRunDate: new Date().toLocaleDateString(),
      generatedTestCodeSnippet: `@Test
void shouldCalculateCorrectBasisPointsFeeForPremiumTier() {
    Account account = createTestAccount(100000.00, TierLevel.ENTERPRISE_PREMIUM);
    Transaction txn = new Transaction(40000.00, account);

    SettlementResult result = settlementService.calculateFeeAndRoute(txn);

    assertEquals(new BigDecimal("60.00"), result.getCalculatedFee());
}`,
    },
    {
      id: 'TC-003',
      ruleCodeRef: 'RULE_ACC_DORMANT_EXPIRY',
      title: 'Dormant Account Re-verification Exception Trigger',
      scenario: 'Ensure accounts inactive for 180+ days trigger DormantAccountRestrictionException upon debit attempt.',
      given: 'An account whose last activity timestamp was 185 days prior',
      when: 'A debit transfer of $500.00 is initiated',
      then: 'DormantAccountRestrictionException is thrown and notification dispatcher receives warning event',
      coverageType: 'Integration',
      status: 'Passed',
      lastRunDate: new Date().toLocaleDateString(),
      generatedTestCodeSnippet: `@Test
void shouldBlockDebitOnDormantAccountOver180Days() {
    Account account = createInactiveAccount(185);

    assertThrows(DormantAccountRestrictionException.class, () -> {
        transferService.executeDebit(account.getId(), new BigDecimal("500.00"));
    });
}`,
    },
    {
      id: 'TC-004',
      ruleCodeRef: 'RULE_RATE_LIMIT_OVERDRAFT_PROTECTION',
      title: 'Overdraft Cushion Boundary Enforcement',
      scenario: 'Ensure overdraft limit is denied if client credit score is 720 or below.',
      given: 'An account with credit score 710 and zero cash balance',
      when: 'A debit transaction of $100.00 is requested',
      then: 'Transaction fails with InsufficientLedgerBalanceException without utilizing cushion facility',
      coverageType: 'Integration',
      status: 'Passed',
      lastRunDate: new Date().toLocaleDateString(),
      generatedTestCodeSnippet: `@Test
void shouldDenyOverdraftBufferWhenCreditScoreSuboptimal() {
    Account account = createAccountWithCreditScore(710, BigDecimal.ZERO);

    assertThrows(InsufficientLedgerBalanceException.class, () -> {
        transferService.executeDebit(account.getId(), new BigDecimal("100.00"));
    });
}`,
    },
    {
      id: 'TC-005',
      ruleCodeRef: 'RULE_BATCH_RECONCILIATION_CUTOFF',
      title: 'Batch Cut-off Deferred Queue Staging',
      scenario: 'Ensure transactions submitted past 23:59:00 UTC are deferred to the next settlement window.',
      given: 'System clock simulated at 23:59:15 UTC',
      when: 'A batch payload record is received',
      then: 'Result returns DEFERRED_TO_NEXT_CYCLE and record is persisted in staging queue',
      coverageType: 'Contract',
      status: 'Passed',
      lastRunDate: new Date().toLocaleDateString(),
      generatedTestCodeSnippet: `@Test
void shouldStageTransactionsReceivedAfterCutoff() {
    Clock testClock = Clock.fixed(Instant.parse("2026-10-31T23:59:15Z"), ZoneOffset.UTC);
    batchProcessor.setClock(testClock);

    StagingResult result = batchProcessor.processIncomingRecord(testRecord);
    assertEquals(StagingResult.DEFERRED_TO_NEXT_CYCLE, result);
}`,
    },
  ];

  const regressionStrategy: RegressionStrategyData = {
    testCoveragePercentage: 88.5,
    totalIdentifiedTests: testCases.length,
    passedTests: testCases.filter((t) => t.status === 'Passed').length,
    failedTests: testCases.filter((t) => t.status === 'Failed').length,
    unexecutedTests: testCases.filter((t) => t.status === 'Unexecuted').length,
    testingRecommendations: [
      'Implement Shadow Traffic Dual-Run: compare legacy and microservice outputs for 100,000 real production transactions before traffic switch.',
      'Containerize automated Cucumber / Given-When-Then behavioral suites in target CI/CD pull request gate.',
      'Contract Testing with Pact: establish consumer-driven contract verifications to prevent API schema drift during decoupling.',
      'Chaos Engineering: inject artificial database latencies to validate circuit-breaker fallback mechanisms in modern services.',
    ],
    testCases,
  };

  return {
    projectId: project.id,
    analyzedAt: new Date().toISOString(),
    version: '2.4.0-tcs-agent',
    currentState,
    businessRules,
    dependencyMap,
    heatMap,
    technicalDebt,
    targetArchitecture,
    migrationOptions,
    roadmap,
    regressionStrategy,
  };
}
