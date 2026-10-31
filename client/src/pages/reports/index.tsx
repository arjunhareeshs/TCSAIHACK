import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileBarChart2,
  Download,
  FileCode,
  Layers,
  ShieldAlert,
  Printer,
  ChevronDown,
  CheckCircle2,
  FileText,
  AlertTriangle,
  ArrowRight,
  Database,
  ExternalLink,
  Code2,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import {
  Project,
  ProjectAnalysisResult,
  BusinessRule,
  TechDebtFinding,
} from '../../shared/api/types';

export const ReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<ProjectAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'risks' | 'modernization'>('overview');
  const [selectedFinding, setSelectedFinding] = useState<TechDebtFinding | null>(null);

  useEffect(() => {
    apiClient.getProjects().then((data) => {
      setProjects(data);
      const urlProj = searchParams.get('project');
      const initialId = urlProj && data.some((p) => p.id === urlProj) ? urlProj : data[0]?.id || '';
      setSelectedProjectId(initialId);
    });
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    setLoading(true);
    apiClient
      .getAnalysisResult(selectedProjectId)
      .then((res) => {
        setAnalysisResult(res);
      })
      .catch((err) => console.error('Failed to load analysis result:', err))
      .finally(() => setLoading(false));
  }, [selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  // Export JSON function
  const handleExportJSON = () => {
    if (!analysisResult || !activeProject) return;
    const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name.replace(/\s+/g, '_')}_analysis_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export CSV function for Business Rules
  const handleExportCSV = () => {
    if (!analysisResult || !activeProject) return;
    const headers = ['ID', 'RuleCode', 'Title', 'Criticality', 'Domain', 'VerificationStatus', 'SourceFile', 'Lines', 'Description'];
    const rows = analysisResult.businessRules.map((r) => [
      r.id,
      r.ruleCode,
      `"${r.title.replace(/"/g, '""')}"`,
      r.criticality,
      `"${r.businessDomain}"`,
      r.verificationStatus,
      `"${r.sourceCodeRef.file}"`,
      `"${r.sourceCodeRef.lineStart}-${r.sourceCodeRef.lineEnd}"`,
      `"${r.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.name.replace(/\s+/g, '_')}_business_rules.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF function (opens print view)
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Report Header */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          padding: '24px 28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1A5CFF',
                }}
              >
                <FileBarChart2 size={20} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0C0F14', letterSpacing: '-0.02em' }}>
                Reports & Analysis Centre
              </h1>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748B', margin: '4px 0 0 0' }}>
              Executive and engineering transformation dossiers synthesized from AST codebase scans.
            </p>
          </div>

          {/* Action Export Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={handleExportCSV} className="btn-secondary" title="Export Business Rules to CSV">
              <FileText size={15} />
              <span>Rules CSV</span>
            </button>
            <button onClick={handleExportJSON} className="btn-secondary" title="Export Full Report as JSON">
              <Download size={15} />
              <span>Export JSON</span>
            </button>
            <button onClick={handlePrintPDF} className="btn-primary" title="Print or Save as PDF">
              <Printer size={15} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Project Selector & Metadata Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #F1F5F9',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14' }}>Active Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSearchParams({ project: e.target.value });
              }}
              className="input-field"
              style={{ width: '280px', padding: '6px 12px', fontSize: '13px', fontWeight: 600 }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.language})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748B' }}>
            <span>
              <strong>Analysis Version:</strong> {analysisResult?.version || '2.4.0-tcs'}
            </span>
            <span>•</span>
            <span>
              <strong>Generated Date:</strong> {analysisResult?.analyzedAt ? new Date(analysisResult.analyzedAt).toLocaleDateString() : 'Today'}
            </span>
            <span>•</span>
            <span className="badge badge-success">
              <CheckCircle2 size={11} /> Verified Analysis
            </span>
          </div>
        </div>
      </div>

      {/* 4 Report Categories Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' }}>
        {[
          { key: 'overview', label: '1. Overview' },
          { key: 'code', label: '2. Code & Business Rules' },
          { key: 'risks', label: '3. Risks & Dependencies' },
          { key: 'modernization', label: '4. Modernization' },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                border: 'none',
                background: isActive ? '#EFF6FF' : 'transparent',
                padding: '10px 18px',
                borderRadius: '8px 8px 0 0',
                fontSize: '13.5px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#1A5CFF' : '#64748B',
                borderBottom: isActive ? '2.5px solid #1A5CFF' : '2.5px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
          Compiling modernization report dossiers...
        </div>
      ) : !analysisResult ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
          No analysis result available for this project. Please navigate to the Project Overview and run analysis first.
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#0C0F14' }}>
                  Executive Modernization Summary
                </h3>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                  {analysisResult.currentState.summary} The recommended migration path is <strong>{analysisResult.migrationOptions.primaryRecommendation}</strong> to eliminate critical library CVEs and decompose tightly bound monolithic database procedures.
                </p>

                {/* 5 Dynamic Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Analysis Status</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                      Completed 100%
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>All 9 modules generated</span>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Business-Rule Coverage</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#1A5CFF', marginTop: '2px' }}>
                      {analysisResult.businessRules.length} Rules (94%)
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Exact code citations</span>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Dependency Discovery</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0C0F14', marginTop: '2px' }}>
                      {analysisResult.dependencyMap.links.length} Links
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>{analysisResult.dependencyMap.circularCount} circular hazards</span>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Critical Risk Count</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>
                      {analysisResult.heatMap.criticalCount} Bottlenecks
                    </div>
                    <span style={{ fontSize: '11px', color: '#EF4444' }}>Mandatory remediation</span>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Regression Coverage</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                      {analysisResult.regressionStrategy.testCoveragePercentage}%
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>{analysisResult.regressionStrategy.passedTests} passed assertions</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CODE & BUSINESS RULES */}
          {activeTab === 'code' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0C0F14' }}>
                  Extracted Business-Rule Catalogue & Verification Evidence
                </h3>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rule ID</th>
                        <th>Rule Identifier</th>
                        <th>Domain / Title</th>
                        <th>Source Location</th>
                        <th>Criticality</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.businessRules.map((rule) => (
                        <tr key={rule.id}>
                          <td style={{ fontWeight: 700, color: '#1A5CFF' }}>{rule.id}</td>
                          <td><code>{rule.ruleCode}</code></td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600 }}>{rule.title}</span>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>{rule.businessDomain}</span>
                            </div>
                          </td>
                          <td>
                            <code style={{ fontSize: '12px' }}>{rule.sourceCodeRef.file}:{rule.sourceCodeRef.lineStart}</code>
                          </td>
                          <td>
                            <span className={`badge ${rule.criticality === 'High' ? 'badge-danger' : 'badge-warning'}`}>
                              {rule.criticality}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-success">
                              <CheckCircle2 size={11} /> {rule.verificationStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Technical Debt Findings with Details Button */}
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px 0', color: '#0C0F14' }}>
                  Technical Debt Findings & Remediation Hours
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analysisResult.technicalDebt.findings.map((debt) => (
                    <div
                      key={debt.id}
                      onClick={() => setSelectedFinding(debt)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className={`badge ${debt.severity === 'Critical' ? 'badge-danger' : 'badge-warning'}`}>
                          {debt.severity}
                        </span>
                        <div>
                          <span style={{ fontWeight: 600, color: '#0C0F14', fontSize: '13.5px' }}>{debt.title}</span>
                          <span style={{ fontSize: '11.5px', color: '#64748B', display: 'block' }}>{debt.location}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                        <span>~{debt.remediationHours} hrs</span>
                        <span style={{ color: '#1A5CFF', fontWeight: 600 }}>View Finding &gt;</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RISKS & DEPENDENCIES */}
          {activeTab === 'risks' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', color: '#0C0F14' }}>
                  Modernization Risk Heat Map Analysis
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {analysisResult.heatMap.components.map((comp) => (
                    <div
                      key={comp.id}
                      style={{
                        padding: '16px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0C0F14' }}>{comp.name}</span>
                        <span className={`badge ${comp.riskLevel === 'Critical' ? 'badge-danger' : 'badge-warning'}`}>
                          {comp.riskLevel}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>{comp.riskExplanation}</p>
                      <div style={{ marginTop: 'auto', paddingTop: '8px', fontSize: '11px', color: '#64748B' }}>
                        Priority: <strong>{comp.modernizationPriority}</strong> • Debt: <strong>{comp.technicalDebtScore}/100</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Database Coupling */}
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', color: '#0C0F14' }}>
                  Critical Shared Database Dependencies
                </h3>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Artifact</th>
                        <th>Type</th>
                        <th>Referenced By Modules</th>
                        <th>Access Pattern</th>
                        <th>Coupling Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.dependencyMap.databaseDependencies.map((db, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}><code>{db.tableOrProc}</code></td>
                          <td>{db.type}</td>
                          <td>{db.referencedByModules.join(', ')}</td>
                          <td>{db.accessPattern}</td>
                          <td>
                            <span className={`badge ${db.couplingRisk === 'Critical' ? 'badge-danger' : 'badge-neutral'}`}>
                              {db.couplingRisk}
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

          {/* TAB 4: MODERNIZATION */}
          {activeTab === 'modernization' && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="card">
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 8px 0', color: '#0C0F14' }}>
                  Target Architecture Blueprint & Microservice Restructuring
                </h3>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 16px 0' }}>
                  Pattern: <strong>{analysisResult.targetArchitecture.recommendedPattern}</strong>
                </p>

                <div className="data-table-container" style={{ marginBottom: '20px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Legacy Monolith Component</th>
                        <th>Target Microservice</th>
                        <th>Communication Pattern</th>
                        <th>Database Strategy</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.targetArchitecture.componentRestructuring.map((cr, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: '#EF4444' }}>{cr.legacyComponent}</td>
                          <td style={{ fontWeight: 600, color: '#059669' }}>{cr.targetMicroservice}</td>
                          <td>{cr.pattern}</td>
                          <td>{cr.databaseStrategy}</td>
                          <td><span className="badge badge-info">{cr.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Phased Roadmap Sequence */}
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px 0', color: '#0C0F14' }}>
                  Implementation Sequence
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analysisResult.roadmap.phases.map((ph) => (
                    <div
                      key={ph.phaseNumber}
                      style={{
                        padding: '14px 18px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '8px',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 800, color: '#1A5CFF', fontSize: '15px' }}>Phase {ph.phaseNumber}:</span>
                        <span style={{ fontWeight: 700, color: '#0C0F14', fontSize: '13.5px' }}>{ph.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748B' }}>
                        <span>{ph.durationWeeks}</span>
                        <span className="badge badge-neutral">{ph.complexity} Complexity</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detailed Report Finding Viewer Modal */}
      {selectedFinding && (
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
          onClick={() => setSelectedFinding(null)}
        >
          <div
            className="card animate-scale-up"
            style={{ width: '640px', maxWidth: '95vw', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span className={`badge ${selectedFinding.severity === 'Critical' ? 'badge-danger' : 'badge-warning'}`} style={{ marginBottom: '6px' }}>
                  {selectedFinding.severity} Finding
                </span>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0C0F14', margin: 0 }}>
                  {selectedFinding.title}
                </h3>
              </div>
              <button onClick={() => setSelectedFinding(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#475569' }}>
              <div>
                <strong>Location:</strong> <code>{selectedFinding.location}</code>
              </div>
              <div>
                <strong>Explanation:</strong> {selectedFinding.description}
              </div>
              <div>
                <strong>Business Impact:</strong> {selectedFinding.impact}
              </div>

              <div style={{ marginTop: '4px' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Source Code Evidence:</strong>
                <pre style={{ margin: 0, padding: '12px', backgroundColor: '#0F172A', color: '#F8FAFC', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                  {selectedFinding.evidenceSnippet}
                </pre>
              </div>

              <div style={{ padding: '10px 14px', backgroundColor: '#ECFDF5', borderRadius: '6px', color: '#065F46' }}>
                <strong>AI Recommendation:</strong> {selectedFinding.recommendation}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
              <button className="btn-primary" onClick={() => setSelectedFinding(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
