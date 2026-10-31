import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderGit2,
  Cpu,
  Layers,
  Network,
  Flame,
  AlertTriangle,
  Compass,
  ArrowRightLeft,
  CalendarRange,
  CheckCheck,
  RefreshCw,
  FileDown,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Code2,
  ExternalLink,
  ChevronRight,
  Database,
  Terminal,
  Bot,
  Send,
  Sparkles,
  Maximize2,
  X,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import {
  Project,
  ProjectAnalysisResult,
  BusinessRule,
  AIChatMessage,
} from '../../shared/api/types';

export const ProjectOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ProjectAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<number>(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState('');

  // AI Assistant Drawer
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  // Business Rules filter
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleDomainFilter, setRuleDomainFilter] = useState('All');
  const [selectedRuleSnippet, setSelectedRuleSnippet] = useState<BusinessRule | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Dependency Map active node
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const proj = await apiClient.getProject(id);
      setProject(proj);
      if (proj && proj.status === 'Completed') {
        const result = await apiClient.getAnalysisResult(id);
        setAnalysisResult(result);
      }
      const history = await apiClient.getChatHistory(id);
      setChatMessages(history);
    } catch (err) {
      console.error('Failed to load project overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleReanalyze = async () => {
    if (!id) return;
    try {
      setAnalyzing(true);
      setAnalysisProgress(5);
      setAnalysisStep('Initializing modernization AST parser...');
      const result = await apiClient.runAnalysis(id, (pct, step) => {
        setAnalysisProgress(pct);
        setAnalysisStep(step);
      });
      setAnalysisResult(result);
      const updatedProj = await apiClient.getProject(id);
      setProject(updatedProj);
    } catch (err) {
      console.error('Re-analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAskCopilot = async (q?: string) => {
    const question = q || inputQuestion;
    if (!id || !question.trim()) return;

    setInputQuestion('');
    setIsAsking(true);

    // Optimistic user message
    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const response = await apiClient.askCopilot(id, question);
      setChatMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error('Copilot query error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
        Loading project analysis workspace...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0C0F14' }}>Project Not Found</h2>
        <p style={{ color: '#64748B', fontSize: '13px' }}>The requested project ID does not exist or has been removed.</p>
        <Link to="/projects" className="btn-primary" style={{ marginTop: '12px' }}>
          Back to Projects
        </Link>
      </div>
    );
  }

  // 9 Modules Navigation Definition
  const modules = [
    { num: 1, title: 'Current-State Understanding', icon: Layers },
    { num: 2, title: 'Business-Rule Catalogue', icon: Code2 },
    { num: 3, title: 'Dependency Map', icon: Network },
    { num: 4, title: 'Modernization Heat Map', icon: Flame },
    { num: 5, title: 'Technical-Debt Assessment', icon: AlertTriangle },
    { num: 6, title: 'Target Architecture', icon: Compass },
    { num: 7, title: 'Migration Options', icon: ArrowRightLeft },
    { num: 8, title: 'Phased Modernization Roadmap', icon: CalendarRange },
    { num: 9, title: 'Regression / Testing Strategy', icon: CheckCheck },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Project Overview Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '24px 28px',
          borderLeft: '4px solid #1A5CFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '800px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0C0F14', margin: 0, letterSpacing: '-0.02em' }}>
                {project.name}
              </h1>
              <span
                className={`badge ${
                  project.status === 'Completed'
                    ? 'badge-success'
                    : project.status === 'In Progress'
                    ? 'badge-warning'
                    : 'badge-neutral'
                }`}
              >
                {project.status === 'Completed' ? <CheckCircle2 size={12} /> : null}
                {project.status}
              </span>
            </div>

            <p style={{ fontSize: '13.5px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              {project.description}
            </p>

            {/* Tech Badges & Metadata */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '4px', fontSize: '12px', color: '#64748B' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Terminal size={14} color="#1A5CFF" />
                <strong>Runtime:</strong> {project.language}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Database size={14} color="#1A5CFF" />
                <strong>Database:</strong> {project.database}
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                <strong>Last Analysed:</strong> {new Date(project.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setCopilotOpen(true)}
              className="btn-secondary"
              style={{ borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', color: '#1A5CFF', fontWeight: 600 }}
            >
              <Bot size={16} />
              <span>AI Copilot</span>
            </button>
            <button
              onClick={handleReanalyze}
              disabled={analyzing}
              className="btn-secondary"
            >
              <RefreshCw size={15} className={analyzing ? 'animate-spin' : ''} />
              <span>{analyzing ? 'Analyzing...' : 'Re-analyse'}</span>
            </button>
            <Link
              to={`/reports?project=${project.id}`}
              className="btn-primary"
            >
              <FileDown size={15} />
              <span>Export Report</span>
            </Link>
          </div>
        </div>

        {/* Dynamic Project Metrics Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            backgroundColor: '#F8FAFC',
            padding: '14px 18px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Files Analysed
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0C0F14', marginTop: '2px' }}>
              {project.filesCount}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Business Rules
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#1A5CFF', marginTop: '2px' }}>
              {project.businessRulesCount}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Dependencies
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0C0F14', marginTop: '2px' }}>
              {project.dependenciesCount}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Technical Debt
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>
              {project.technicalDebtIssuesCount} issues
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Critical Risks
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: project.criticalRisksCount > 0 ? '#EF4444' : '#10B981', marginTop: '2px' }}>
              {project.criticalRisksCount}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
              Test Cases
            </span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
              {project.testCasesCount}
            </div>
          </div>
        </div>
      </div>

      {/* If Not Analysed yet, show explicit empty state requiring analysis */}
      {project.status !== 'Completed' && !analysisResult && (
        <div
          className="card"
          style={{
            padding: '50px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <Cpu size={44} color="#1A5CFF" className={analyzing ? 'animate-spin' : ''} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
            {analyzing ? 'Modernization Analysis in Progress...' : 'Analysis Required'}
          </h2>
          <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '520px', margin: 0, lineHeight: 1.5 }}>
            {analyzing
              ? `${analysisStep} (${analysisProgress}%)`
              : 'This project has not completed full static AST parsing. Click "Run Analysis" to generate evidence-based insights across all 9 modules.'}
          </p>
          {!analyzing && (
            <button onClick={handleReanalyze} className="btn-primary" style={{ marginTop: '8px' }}>
              <Zap size={16} />
              <span>Run Analysis Now</span>
            </button>
          )}
        </div>
      )}

      {/* 9 Analysis Modules Tabs & Content Viewport */}
      {analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Module Selector Navigation Pill Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              paddingBottom: '8px',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            {modules.map((m) => {
              const Icon = m.icon;
              const isActive = activeModule === m.num;
              return (
                <button
                  key={m.num}
                  onClick={() => setActiveModule(m.num)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: isActive ? '#1A5CFF' : '#E2E8F0',
                    backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                    color: isActive ? '#1A5CFF' : '#475569',
                    fontSize: '12.5px',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: isActive ? '#1A5CFF' : '#F1F5F9',
                      color: isActive ? '#FFFFFF' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    0{m.num}
                  </span>
                  <span>{m.title}</span>
                </button>
              );
            })}
          </div>

          {/* Module 01: CURRENT-STATE UNDERSTANDING */}
          {activeModule === 1 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Layers size={20} color="#1A5CFF" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0F14' }}>
                    01. Current-State Understanding
                  </h2>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
                  {analysisResult.currentState.summary}
                </p>

                {/* Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px' }}>
                  <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Avg Cyclomatic Complexity</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>
                      {analysisResult.currentState.cyclomaticComplexityAvg}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Threshold target &lt; 10</span>
                  </div>
                  <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Maintainability Index</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>
                      {analysisResult.currentState.maintainabilityIndexAvg} / 100
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Grade: D (High refactor need)</span>
                  </div>
                  <div style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Total Modules Identified</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0C0F14', marginTop: '2px' }}>
                      {analysisResult.currentState.totalComponents}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Tightly coupled architecture</span>
                  </div>
                </div>
              </div>

              {/* Technology Stack Table with EOL flags */}
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0', color: '#0C0F14' }}>
                  Technology Stack & Lifecycle Risk
                </h3>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Technology</th>
                        <th>Category</th>
                        <th>Current Version</th>
                        <th>Modern LTS Target</th>
                        <th>Lifecycle Status</th>
                        <th>Migration Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.currentState.techStack.map((ts, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{ts.name}</td>
                          <td>{ts.category}</td>
                          <td><code>{ts.currentVersion}</code></td>
                          <td><code>{ts.latestVersion}</code></td>
                          <td>
                            <span
                              className={`badge ${
                                ts.eolStatus === 'End-of-Life'
                                  ? 'badge-danger'
                                  : ts.eolStatus === 'Deprecated'
                                  ? 'badge-warning'
                                  : 'badge-success'
                              }`}
                            >
                              {ts.eolStatus}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${ts.risk === 'Critical' ? 'badge-danger' : ts.risk === 'High' ? 'badge-warning' : 'badge-neutral'}`}>
                              {ts.risk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Architecture Layers Breakdown */}
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px 0', color: '#0C0F14' }}>
                  Existing Architectural Layers
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  {analysisResult.currentState.layers.map((layer, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0C0F14' }}>
                        {layer.name}
                      </span>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                        {layer.description}
                      </p>
                      <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #E2E8F0', fontSize: '11px', color: '#64748B' }}>
                        <strong>Protocol / Tech:</strong> {layer.protocolOrTech}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 02: BUSINESS-RULE CATALOGUE */}
          {activeModule === 2 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Code2 size={20} color="#1A5CFF" />
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0F14' }}>
                        02. Business-Rule Catalogue
                      </h2>
                      <span style={{ fontSize: '12.5px', color: '#64748B' }}>
                        Extracted core business logic with exact source file line references
                      </span>
                    </div>
                  </div>

                  {/* Rule Filters */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        width: '200px',
                      }}
                    >
                      <Search size={14} color="#64748B" />
                      <input
                        type="text"
                        placeholder="Search rules..."
                        value={ruleSearch}
                        onChange={(e) => setRuleSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Rules List Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {analysisResult.businessRules
                    .filter((r) => r.title.toLowerCase().includes(ruleSearch.toLowerCase()) || r.ruleCode.toLowerCase().includes(ruleSearch.toLowerCase()))
                    .map((rule) => (
                      <div
                        key={rule.id}
                        style={{
                          padding: '18px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          backgroundColor: '#FFFFFF',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#1A5CFF', padding: '3px 8px', borderRadius: '4px' }}>
                              {rule.id}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: '#0C0F14' }}>
                              {rule.ruleCode}
                            </span>
                            <span className={`badge ${rule.criticality === 'High' ? 'badge-danger' : 'badge-warning'}`}>
                              {rule.criticality} Criticality
                            </span>
                            <span className="badge badge-success">
                              <CheckCircle2 size={11} /> {rule.verificationStatus}
                            </span>
                          </div>

                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            Impact Score: <strong>{rule.impactScore}/100</strong>
                          </span>
                        </div>

                        <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                          {rule.title}
                        </h4>

                        <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                          {rule.description}
                        </p>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#F8FAFC',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B' }}>
                            <Code2 size={14} color="#1A5CFF" />
                            <span>Source Reference:</span>
                            <code style={{ color: '#0C0F14', fontWeight: 600 }}>
                              {rule.sourceCodeRef.file} (L{rule.sourceCodeRef.lineStart} - L{rule.sourceCodeRef.lineEnd})
                            </code>
                          </div>

                          <button
                            onClick={() => setSelectedRuleSnippet(rule)}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#1A5CFF',
                              cursor: 'pointer',
                            }}
                          >
                            Inspect Code Snippet
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 03: DEPENDENCY MAP */}
          {activeModule === 3 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Network size={20} color="#1A5CFF" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0F14' }}>
                    03. Dependency Map
                  </h2>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: 0, lineHeight: 1.6 }}>
                  Interactive visualization of cross-module method calls, database locks, and external integrations. Highlighted red links indicate circular dependency hazards.
                </p>

                {/* Interactive SVG Dependency Graph */}
                <div
                  style={{
                    marginTop: '16px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '24px',
                    position: 'relative',
                    minHeight: '360px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg viewBox="0 0 800 320" style={{ width: '100%', height: '320px' }}>
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#94A3B8" />
                      </marker>
                      <marker id="arrow-circ" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444" />
                      </marker>
                    </defs>

                    {/* Links */}
                    {/* UI to Core */}
                    <path d="M 120 70 C 240 70, 240 160, 360 160" fill="none" stroke="#94A3B8" strokeWidth="2" markerEnd="url(#arrow)" />
                    {/* UI to Auth */}
                    <path d="M 120 70 C 180 70, 180 250, 240 250" fill="none" stroke="#94A3B8" strokeWidth="2" markerEnd="url(#arrow)" />
                    {/* Core to DAO */}
                    <path d="M 440 160 C 500 160, 500 90, 560 90" fill="none" stroke="#94A3B8" strokeWidth="2.5" markerEnd="url(#arrow)" />
                    {/* DAO to DB */}
                    <path d="M 640 90 C 680 90, 680 160, 720 160" fill="none" stroke="#EF4444" strokeWidth="2.5" markerEnd="url(#arrow-circ)" />
                    {/* Batch to DAO */}
                    <path d="M 440 250 C 500 250, 500 90, 560 90" fill="none" stroke="#94A3B8" strokeWidth="2" markerEnd="url(#arrow)" />
                    {/* Circular Auth <-> Core */}
                    <path d="M 280 230 C 320 200, 340 180, 380 170" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#arrow-circ)" />
                    <path d="M 370 185 C 330 215, 310 235, 270 245" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="5,4" markerEnd="url(#arrow-circ)" />

                    {/* Nodes */}
                    {/* Node 1: UI */}
                    <g transform="translate(60, 50)" style={{ cursor: 'pointer' }} onClick={() => setSelectedNodeId('UI_WEB')}>
                      <rect width="110" height="40" rx="8" fill="#FFFFFF" stroke="#1A5CFF" strokeWidth="2" />
                      <text x="55" y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0C0F14">Web UI Layer</text>
                    </g>

                    {/* Node 2: Core Engine */}
                    <g transform="translate(360, 140)" style={{ cursor: 'pointer' }} onClick={() => setSelectedNodeId('CORE_ENGINE')}>
                      <rect width="130" height="42" rx="8" fill="#FEF2F2" stroke="#EF4444" strokeWidth="2.5" />
                      <text x="65" y="25" textAnchor="middle" fontSize="12" fontWeight="700" fill="#EF4444">Core Monolith</text>
                    </g>

                    {/* Node 3: Auth Module */}
                    <g transform="translate(190, 230)" style={{ cursor: 'pointer' }} onClick={() => setSelectedNodeId('AUTH_MOD')}>
                      <rect width="120" height="40" rx="8" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="2" />
                      <text x="60" y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0C0F14">Auth / Session</text>
                    </g>

                    {/* Node 4: DAO */}
                    <g transform="translate(560, 70)" style={{ cursor: 'pointer' }} onClick={() => setSelectedNodeId('TXN_DAO')}>
                      <rect width="110" height="40" rx="8" fill="#FEF2F2" stroke="#EF4444" strokeWidth="2" />
                      <text x="55" y="24" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0C0F14">Data Access</text>
                    </g>

                    {/* Node 5: Legacy DB */}
                    <g transform="translate(680, 140)" style={{ cursor: 'pointer' }} onClick={() => setSelectedNodeId('LEGACY_DB')}>
                      <rect width="105" height="42" rx="8" fill="#EFF6FF" stroke="#1A5CFF" strokeWidth="2" />
                      <text x="52" y="25" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#1A5CFF">Oracle DB</text>
                    </g>

                    {/* Node 6: Batch Job */}
                    <g transform="translate(360, 230)" style={{ cursor: 'pointer' }} onClick={() => setSelectedNodeId('BATCH_JOB')}>
                      <rect width="120" height="40" rx="8" fill="#FFFFFF" stroke="#64748B" strokeWidth="1.5" />
                      <text x="60" y="24" textAnchor="middle" fontSize="12" fontWeight="600" fill="#0C0F14">Batch Worker</text>
                    </g>
                  </svg>

                  <div style={{ position: 'absolute', bottom: '12px', right: '16px', display: 'flex', gap: '12px', fontSize: '11px', color: '#64748B' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '2px', backgroundColor: '#94A3B8' }} /> Synchronous Call
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '10px', height: '2px', backgroundColor: '#EF4444' }} /> Circular / High Coupling
                    </span>
                  </div>
                </div>
              </div>

              {/* Database Dependencies & Table Locks */}
              <div className="card">
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0', color: '#0C0F14' }}>
                  Database Dependencies & Coupling Risks
                </h3>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Artifact / Object</th>
                        <th>Type</th>
                        <th>Accessing Modules</th>
                        <th>Access Pattern</th>
                        <th>Coupling Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.dependencyMap.databaseDependencies.map((dbd, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}><code>{dbd.tableOrProc}</code></td>
                          <td>{dbd.type}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {dbd.referencedByModules.map((m, idx) => (
                                <span key={idx} className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                                  {m}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>{dbd.accessPattern}</td>
                          <td>
                            <span className={`badge ${dbd.couplingRisk === 'Critical' ? 'badge-danger' : dbd.couplingRisk === 'Medium' ? 'badge-warning' : 'badge-neutral'}`}>
                              {dbd.couplingRisk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Module 04: MODERNIZATION HEAT MAP */}
          {activeModule === 4 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Flame size={20} color="#EF4444" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0F14' }}>
                    04. Modernization Heat Map
                  </h2>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                  Risk prioritization based on business criticality, technical debt density, and failure blast radius.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                  {analysisResult.heatMap.components.map((comp) => (
                    <div
                      key={comp.id}
                      style={{
                        padding: '18px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: comp.riskLevel === 'Critical' ? '#FECACA' : '#E2E8F0',
                        backgroundColor: comp.riskLevel === 'Critical' ? '#FFF5F5' : '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                          {comp.module}
                        </span>
                        <span className={`badge ${comp.riskLevel === 'Critical' ? 'badge-danger' : comp.riskLevel === 'High' ? 'badge-warning' : 'badge-neutral'}`}>
                          {comp.riskLevel} Risk
                        </span>
                      </div>

                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0C0F14', margin: 0 }}>
                        {comp.name}
                      </h4>

                      <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                        {comp.riskExplanation}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                        <span>Priority: <strong>{comp.modernizationPriority}</strong></span>
                        <span>Debt Score: <strong>{comp.technicalDebtScore}/100</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 05: TECHNICAL-DEBT ASSESSMENT */}
          {activeModule === 5 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <AlertTriangle size={20} color="#F59E0B" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0F14' }}>
                    05. Technical-Debt Assessment
                  </h2>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                  Total estimated remediation effort: <strong>{analysisResult.technicalDebt.totalEstimatedRemediationHours} engineering hours</strong> across {analysisResult.technicalDebt.findings.length} prioritized findings.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {analysisResult.technicalDebt.findings.map((debt) => (
                    <div
                      key={debt.id}
                      style={{
                        padding: '18px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '4px' }}>
                            {debt.id}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
                            {debt.category}
                          </span>
                          <span className={`badge ${debt.severity === 'Critical' ? 'badge-danger' : debt.severity === 'High' ? 'badge-warning' : 'badge-neutral'}`}>
                            {debt.severity}
                          </span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          Remediation: <strong>~{debt.remediationHours} hrs</strong>
                        </span>
                      </div>

                      <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                        {debt.title}
                      </h4>

                      <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                        {debt.description}
                      </p>

                      <div style={{ padding: '10px 14px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', fontFamily: 'monospace', fontSize: '12px' }}>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#0C0F14' }}>
                          {debt.evidenceSnippet}
                        </pre>
                      </div>

                      <div style={{ fontSize: '12.5px', color: '#065F46', backgroundColor: '#ECFDF5', padding: '8px 12px', borderRadius: '6px' }}>
                        <strong>AI Recommendation:</strong> {debt.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 06: TARGET ARCHITECTURE */}
          {activeModule === 6 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Compass size={20} color="#1A5CFF" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0F14' }}>
                    06. Target Architecture
                  </h2>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                  Recommended Pattern: <strong>{analysisResult.targetArchitecture.recommendedPattern}</strong>
                </p>

                {/* Side-by-Side Comparison Points */}
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0', color: '#0C0F14' }}>
                  Current vs. Target Architecture Comparison
                </h3>
                <div className="data-table-container" style={{ marginBottom: '24px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Architectural Dimension</th>
                        <th>Current Legacy State</th>
                        <th>Target Modern State</th>
                        <th>Business / Operational Benefit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.targetArchitecture.comparisonPoints.map((cp, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{cp.dimension}</td>
                          <td style={{ color: '#EF4444' }}>{cp.currentState}</td>
                          <td style={{ color: '#059669', fontWeight: 600 }}>{cp.targetState}</td>
                          <td>{cp.benefit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Target Stack Recommendations */}
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0', color: '#0C0F14' }}>
                  Target Technology Stack
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  {analysisResult.targetArchitecture.targetTechStack.map((st, i) => (
                    <div key={i} style={{ padding: '14px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                        {st.category}
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                        {st.technologies.map((t, idx) => (
                          <span key={idx} style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14' }}>
                            • {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 07: MIGRATION OPTIONS */}
          {activeModule === 7 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <ArrowRightLeft size={20} color="#1A5CFF" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0F14' }}>
                    07. Migration Options (6R / 4R Comparative Framework)
                  </h2>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                  {analysisResult.migrationOptions.rationale}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {analysisResult.migrationOptions.strategies.map((strat, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '20px',
                        borderRadius: '10px',
                        border: '2px solid',
                        borderColor: strat.recommended ? '#1A5CFF' : '#E2E8F0',
                        backgroundColor: strat.recommended ? '#F0F6FF' : '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        position: 'relative',
                      }}
                    >
                      {strat.recommended && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-10px',
                            right: '16px',
                            backgroundColor: '#1A5CFF',
                            color: '#FFFFFF',
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            letterSpacing: '0.04em',
                          }}
                        >
                          AI RECOMMENDED
                        </span>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                          {strat.type}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#1A5CFF' }}>
                          {strat.suitabilityScore}/100
                        </span>
                      </div>

                      <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                        {strat.title}
                      </h4>

                      <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                        {strat.shortDescription}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px', padding: '10px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <div>Effort: <strong>{strat.effortMonths}</strong></div>
                        <div>Cost: <strong>{strat.costEstimate}</strong></div>
                        <div>Time-to-Value: <strong>{strat.timeToValue}</strong></div>
                        <div>Risk: <strong>{strat.riskRating}</strong></div>
                      </div>

                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        <strong>Rationale:</strong> {strat.evidenceRationale}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 08: PHASED MODERNIZATION ROADMAP */}
          {activeModule === 8 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <CalendarRange size={20} color="#1A5CFF" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0F14' }}>
                    08. Phased Modernization Roadmap
                  </h2>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 20px 0', lineHeight: 1.6 }}>
                  Total Estimated Modernization Duration: <strong>{analysisResult.roadmap.totalEstimatedDuration}</strong> across 4 progressive Strangler Fig milestones.
                </p>

                {/* Phased Visual Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {analysisResult.roadmap.phases.map((ph) => (
                    <div
                      key={ph.phaseNumber}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        padding: '18px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: '#EFF6FF',
                          color: '#1A5CFF',
                          fontWeight: 800,
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        P{ph.phaseNumber}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                          <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                            Phase {ph.phaseNumber}: {ph.title}
                          </h4>
                          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                            {ph.durationWeeks}
                          </span>
                        </div>

                        <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                          <strong>Focus:</strong> {ph.focusArea}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          {ph.keyDeliverables.map((kd, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12.5px', color: '#334155' }}>
                              <CheckCircle2 size={13} color="#10B981" style={{ marginTop: '2px', flexShrink: 0 }} />
                              <span>{kd}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#065F46', backgroundColor: '#ECFDF5', padding: '6px 10px', borderRadius: '4px' }}>
                          <strong>Risk Mitigation:</strong> {ph.riskMitigation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 09: REGRESSION / TESTING STRATEGY */}
          {activeModule === 9 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <CheckCheck size={20} color="#10B981" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0F14' }}>
                    09. Regression / Testing Strategy
                  </h2>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                  Behavior-driven test suites synthesized from extracted business rules to guarantee zero regression during service decoupling.
                </p>

                {/* Test Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Coverage</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
                      {analysisResult.regressionStrategy.testCoveragePercentage}%
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Tests</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0C0F14' }}>
                      {analysisResult.regressionStrategy.totalIdentifiedTests}
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Passed</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>
                      {analysisResult.regressionStrategy.passedTests}
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Pending</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#64748B' }}>
                      {analysisResult.regressionStrategy.unexecutedTests}
                    </div>
                  </div>
                </div>

                {/* Synthesized Test Cases */}
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0', color: '#0C0F14' }}>
                  Synthesized Business-Rule Test Scenarios
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {analysisResult.regressionStrategy.testCases.map((tc) => (
                    <div
                      key={tc.id}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#ECFDF5', color: '#065F46', padding: '3px 8px', borderRadius: '4px' }}>
                            {tc.id}
                          </span>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0C0F14' }}>
                            {tc.title}
                          </span>
                        </div>
                        <span className="badge badge-success">
                          <CheckCircle2 size={11} /> {tc.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12.5px', color: '#475569', backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '6px' }}>
                        <div><strong>GIVEN:</strong> {tc.given}</div>
                        <div><strong>WHEN:</strong> {tc.when}</div>
                        <div><strong>THEN:</strong> {tc.then}</div>
                      </div>

                      <div style={{ marginTop: '4px' }}>
                        <pre style={{ margin: 0, padding: '10px 14px', backgroundColor: '#0F172A', color: '#E2E8F0', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', fontFamily: 'monospace' }}>
                          {tc.generatedTestCodeSnippet}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code Snippet Drawer Modal */}
      {selectedRuleSnippet && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setSelectedRuleSnippet(null)}
        >
          <div
            className="card"
            style={{ width: '680px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                  {selectedRuleSnippet.ruleCode} – Source Evidence
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  {selectedRuleSnippet.sourceCodeRef.file} (Lines {selectedRuleSnippet.sourceCodeRef.lineStart} - {selectedRuleSnippet.sourceCodeRef.lineEnd})
                </span>
              </div>
              <button
                onClick={() => setSelectedRuleSnippet(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => copyCode(selectedRuleSnippet.sourceCodeRef.codeSnippet)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  backgroundColor: '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                {copiedSnippet ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
              </button>
              <pre
                style={{
                  margin: 0,
                  padding: '16px',
                  backgroundColor: '#0F172A',
                  color: '#F8FAFC',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  overflowX: 'auto',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                }}
              >
                {selectedRuleSnippet.sourceCodeRef.codeSnippet}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setSelectedRuleSnippet(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Slide-Out Drawer (Copilot) */}
      {copilotOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '420px',
            maxWidth: '100vw',
            height: '100vh',
            backgroundColor: '#FFFFFF',
            borderLeft: '1px solid #E2E8F0',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
            zIndex: 90,
            display: 'flex',
            flexDirection: 'column',
          }}
          className="animate-slide-in"
        >
          {/* Copilot Header */}
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#1A5CFF',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                  Modernization Copilot
                </h3>
                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>
                  ● Codebase RAG Active (Langfuse Traced)
                </span>
              </div>
            </div>
            <button
              onClick={() => setCopilotOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Questions suggestion strip */}
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              backgroundColor: '#FFFFFF',
            }}
          >
            {[
              'Where is settlement fee calculated?',
              'Which tables have locks?',
              'Explain target microservices',
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleAskCopilot(prompt)}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '11px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: msg.role === 'user' ? '#1A5CFF' : '#F1F5F9',
                    color: msg.role === 'user' ? '#FFFFFF' : '#0C0F14',
                    fontSize: '13px',
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                  {/* Source citations */}
                  {msg.sourceReferences && msg.sourceReferences.length > 0 && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #CBD5E1', fontSize: '11.5px' }}>
                      <span style={{ fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                        Source Citations:
                      </span>
                      {msg.sourceReferences.map((ref, idx) => (
                        <div key={idx} style={{ fontFamily: 'monospace', color: '#1E293B' }}>
                          📄 {ref.file} ({ref.lines})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: '10px', color: '#94A3B8', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.timestamp}
                </span>
              </div>
            ))}
            {isAsking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', fontSize: '12px' }}>
                <Bot size={15} className="animate-spin" color="#1A5CFF" />
                <span>Searching AST references and generating evidence-backed answer...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div style={{ padding: '14px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask about this codebase..."
              className="input-field"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAskCopilot();
              }}
            />
            <button
              onClick={() => handleAskCopilot()}
              disabled={isAsking || !inputQuestion.trim()}
              className="btn-primary"
              style={{ padding: '8px 14px' }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectOverviewPage;

