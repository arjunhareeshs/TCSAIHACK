import React, { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  Cpu,
  Lock,
  Database,
  CheckCircle2,
  Save,
  Trash2,
  Download,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  // User Profile
  const [name, setName] = useState('Lead Enterprise Architect');
  const [email, setEmail] = useState('architect@tcs.modernize.ai');
  const [title, setTitle] = useState('Principal Cloud Architect');
  const [organization, setOrganization] = useState('TCS Modernization Practice 2026');

  // Notifications
  const [notifyAnalysisComplete, setNotifyAnalysisComplete] = useState(true);
  const [notifyCriticalRisks, setNotifyCriticalRisks] = useState(true);
  const [notifyWeeklySummary, setNotifyWeeklySummary] = useState(false);

  // AI Configuration
  const [aiModel, setAiModel] = useState('TCS Autonomous Agent v2.4 (Langfuse Instrumented)');
  const [temperature, setTemperature] = useState(0.2);
  const [observabilityEnabled, setObservabilityEnabled] = useState(true);

  // Privacy
  const [piiScrubbing, setPiiScrubbing] = useState(true);
  const [localParsingOnly, setLocalParsingOnly] = useState(false);

  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const handleClearCache = () => {
    if (window.confirm('Clear all local project cache and analysis sessions?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleExportData = () => {
    const raw = localStorage.getItem('legacy_iq_projects') || '[]';
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legacy_iq_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', color: '#0C0F14', letterSpacing: '-0.02em' }}>
            Settings & Preferences
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Configure enterprise user profiles, AI analysis engine, telemetry, and local data persistence.
          </p>
        </div>

        <button onClick={handleSave} className="btn-primary" style={{ padding: '9px 18px' }}>
          <Save size={16} />
          <span>Save Preferences</span>
        </button>
      </div>

      {savedMessage && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '8px',
            color: '#065F46',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>Settings successfully updated.</span>
        </div>
      )}

      {/* 1. User Profile */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
          <User size={18} color="#1A5CFF" />
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
            User Profile & Identity
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Full Name
            </label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Work Email
            </label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Job Title / Designation
            </label>
            <input
              type="text"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Organization / Practice
            </label>
            <input
              type="text"
              className="input-field"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 2. Account Information */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
          <Shield size={18} color="#1A5CFF" />
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
            Account & License Information
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', fontSize: '13px' }}>
          <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Edition</span>
            <strong style={{ color: '#0C0F14' }}>TCS AI Hackathon 2026</strong>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Quota Limit</span>
            <strong style={{ color: '#059669' }}>Unlimited Local AST Scans</strong>
          </div>
          <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Observability</span>
            <strong style={{ color: '#1A5CFF' }}>Langfuse v2 Connected</strong>
          </div>
        </div>
      </div>

      {/* 3. AI Model & Telemetry Configuration */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
          <Cpu size={18} color="#1A5CFF" />
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
            AI Model & Telemetry Tracing
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Inference Agent Model
            </label>
            <select
              className="input-field"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
            >
              <option value="TCS Autonomous Agent v2.4 (Langfuse Instrumented)">
                TCS Autonomous Agent v2.4 (Langfuse Instrumented)
              </option>
              <option value="Claude 3.5 Sonnet (Deterministic Code Mode)">
                Claude 3.5 Sonnet (Deterministic Code Mode)
              </option>
              <option value="Gemini 1.5 Pro (Long-Context AST Scan)">
                Gemini 1.5 Pro (Long-Context AST Scan)
              </option>
              <option value="GPT-4o Enterprise">GPT-4o Enterprise</option>
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
              <span>Generation Temperature (Creativity vs Determinism)</span>
              <span>{temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              Recommended: 0.1 - 0.2 for strict code syntax and business-rule fidelity.
            </span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={observabilityEnabled}
              onChange={(e) => setObservabilityEnabled(e.target.checked)}
            />
            <span style={{ fontSize: '13px', color: '#0C0F14' }}>
              Enable Langfuse Tracing & Observability for RAG Retrievers and Generation Steps
            </span>
          </label>
        </div>
      </div>

      {/* 4. Privacy & Data Security */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
          <Lock size={18} color="#1A5CFF" />
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
            Privacy & Enterprise Code Protection
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={piiScrubbing}
              onChange={(e) => setPiiScrubbing(e.target.checked)}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14' }}>
                Automated PII & Password Redaction
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Scrub hardcoded credentials, connection strings, and authorization tokens before indexing.
              </span>
            </div>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={localParsingOnly}
              onChange={(e) => setLocalParsingOnly(e.target.checked)}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14' }}>
                Air-Gapped Local-Only Static Parsing
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                Never stream un-minified code outside the host workstation boundary.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* 5. Project Data Management */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
          <Database size={18} color="#1A5CFF" />
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
            Project Data & Storage Management
          </h2>
        </div>

        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          Manage your locally cached repositories, analysis results, and copilot chat sessions.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleExportData} className="btn-secondary">
            <Download size={15} />
            <span>Export All Projects JSON</span>
          </button>
          <button onClick={handleClearCache} className="btn-outline-danger">
            <Trash2 size={15} />
            <span>Clear Cache & Reset Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

