import React from 'react';
import { X, BookOpen, Layers, Terminal, Sparkles, CheckCircle, ExternalLink } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(12, 15, 20, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
        onClick={(e) => e.stopPropagation()}
        className="animate-fade-in"
      >
        <div
          style={{
            padding: '18px 24px',
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
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1A5CFF',
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                LEGACY IQ – User Guide & Architecture Reference
              </h2>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                TCS AI Engineering Hackathon 2026 Documentation
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0C0F14', marginBottom: '8px' }}>
              Autonomous 9-Module Legacy Modernization Platform
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
              LEGACY IQ is an autonomous agent designed for enterprise legacy software analysis and cloud transformation. It ingests legacy source code (Java/J2EE, C#/.NET, COBOL, etc.) and supporting schemas to generate evidence-backed modernization roadmaps without synthetic hallucination.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#0C0F14', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} color="#1A5CFF" />
                <span>1. Current-State & Rules</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                AST code parsing, technology stack detection, and automated extraction of business rules with line-by-line evidence.
              </p>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#0C0F14', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Terminal size={15} color="#1A5CFF" />
                <span>2. Coupling & Heat Map</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Interactive dependency graphs, database coupling risk scoring, and P1-P3 component modernization priorities.
              </p>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#0C0F14', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={15} color="#1A5CFF" />
                <span>3. Target Architecture</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Strangler Fig pattern microservice mapping, database decomposition strategy, and event-driven patterns.
              </p>
            </div>

            <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#0C0F14', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={15} color="#10B981" />
                <span>4. Regression Test Suites</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                Behavior-driven Given-When-Then test cases automatically generated to prevent regression during migration.
              </p>
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#1E40AF', display: 'block', marginBottom: '4px' }}>
              Langfuse Observability & LLM Tracing
            </span>
            <span style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: 1.5 }}>
              The application backend implements production-grade telemetry with generation tracing, retriever evaluations, session grouping, and automated PII sanitization.
            </span>
          </div>
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button className="btn-primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

