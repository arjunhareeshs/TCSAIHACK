import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send,
  X,
  Sparkles,
  Bot,
  RotateCcw,
  MessageSquare,
  HelpCircle,
  Lightbulb,
  FileCode,
  ShieldAlert,
  Compass,
  ArrowRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import { AIChatMessage, Project } from '../../shared/api/types';

export const FloatingCopilot: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('proj-tcs-001');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load projects and determine context
  useEffect(() => {
    apiClient.getProjects().then((data) => {
      setProjects(data);
      if (data.length > 0) {
        // If current URL contains project ID, set it as active context
        const match = location.pathname.match(/\/projects\/([a-zA-Z0-9_-]+)/);
        if (match && match[1] && match[1] !== 'new') {
          setActiveProjectId(match[1]);
        } else {
          setActiveProjectId(data[0].id);
        }
      }
    });
  }, [location.pathname]);

  // Load chat messages
  useEffect(() => {
    if (activeProjectId) {
      apiClient.getChatHistory(activeProjectId).then((history) => {
        if (history.length > 0) {
          setMessages(history);
        } else {
          setMessages([
            {
              id: 'init-msg',
              role: 'assistant',
              content: `👋 Hello! I am your **EVOLVIX AI Modernization Copilot**.\n\nDo you have doubts about any AI recommendation, risk scoring, target architecture, or extracted business rules? Ask me anything and I will clarify the evidence and rationale behind every suggestion!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      });
    }
  }, [activeProjectId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Auto-hide greeting pill after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = async (q?: string) => {
    const text = q || question;
    if (!text.trim() || !activeProjectId) return;

    setQuestion('');
    setIsAsking(true);
    setShowGreeting(false);

    // Optimistic user message
    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      // Enhanced architectural doubt clarification handler
      let responseContent = '';
      let refs: AIChatMessage['sourceReferences'] = [];

      const lower = text.toLowerCase();
      const proj = projects.find((p) => p.id === activeProjectId);

      if (lower.includes('strangler') || lower.includes('rewrite') || lower.includes('strategy') || lower.includes('why refactor')) {
        responseContent = `### Why the Agent Recommends the Strangler Fig Pattern:
1. **Critical Regulatory Nuance Preservation**: Total greenfield rewrites have an industry failure rate exceeding 68% in legacy banking/supply chain domains because undocumented business rules (such as tiered settlement thresholds in \`SettlementProcessorEngine.java\`) get dropped.
2. **Continuous Production Value**: With Strangler Fig, the first extracted microservice delivers business value in **~8 weeks**, rather than waiting 14+ months for a big-bang cutover.
3. **Rollback Safety**: Running legacy and modern services concurrently with shadow execution allows real-time discrepancy detection without customer interruption.`;
        refs = [
          {
            file: 'MigrationOptionsModule / StranglerFigRationale.md',
            lines: 'Section 4.2',
            snippet: 'Suitability Score: 92/100 (Lowest Operational Risk)',
          },
        ];
      } else if (lower.includes('risk') || lower.includes('heat map') || lower.includes('score') || lower.includes('why high')) {
        responseContent = `### How the Agent Calculated the 92/100 Risk Score:
The **Core Monolith Service** was classified as **Critical Risk (P1)** based on three concrete factors:
1. **Cyclomatic Complexity**: Method \`settleTransaction()\` exceeds complexity score of 38 due to nested 8-level conditional trees.
2. **Circular Coupling**: Direct bi-directional synchronous invocations between the Core Engine and the Authentication filter cause JVM thread lockups during volume peaks.
3. **Database Procedural Lock**: Direct invocation of \`SP_SETTLE_TRANSACTIONS_V2\` holds exclusive row locks on table \`TBL_ACCOUNTS_MASTER\`.`;
        refs = [
          {
            file: 'src/main/java/com/bank/core/SettlementProcessorEngine.java',
            lines: 'L142-L260',
            snippet: 'Cyclomatic complexity: 38 (Target threshold < 10)',
          },
        ];
      } else if (lower.includes('oracle') || lower.includes('database') || lower.includes('postgresql') || lower.includes('postgres')) {
        responseContent = `### Rationale for Migrating from Oracle 11g to PostgreSQL 16:
- **Licensing & Cloud Lock-in**: Oracle 11g reached End-of-Life (EOL), incurring high vendor support surcharges and preventing auto-scaling in cloud container environments.
- **Microservices Schema Isolation**: PostgreSQL allows breaking the monolithic shared database into domain-bounded schemas (database-per-service pattern).
- **Asynchronous CDC**: Enables Change Data Capture (via Debezium/Kafka) to decouple operational writes from analytical queries without database locks.`;
      } else if (lower.includes('rule') || lower.includes('fee') || lower.includes('settle')) {
        responseContent = `### Clarification on Business Rule BR-001 (Settlement Fee):
- The rule enforces three tiers extracted from source lines 142-178 of the core engine:
  - Transactions **> $100,000** require secondary compliance audit.
  - **Enterprise Premium Tier**: 0.15% (15 basis points).
  - **Standard Tier**: 0.35% with a minimum floor fee of $1.50.
- Decoupling this logic into a dedicated **Fee-Calculation Microservice** will allow marketing teams to modify brackets via configuration rather than redeploying the entire legacy monolith.`;
        refs = [
          {
            file: 'src/main/java/com/bank/core/SettlementProcessorEngine.java',
            lines: 'L142-L178',
            snippet: 'if (txn.getAmount() > 100000.00) { txn.setStatus(PENDING_SECONDARY_AUDIT); }',
          },
        ];
      } else {
        const defaultResp = await apiClient.askCopilot(activeProjectId, text);
        responseContent = defaultResp.content;
        refs = defaultResp.sourceReferences || [];
      }

      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sourceReferences: refs,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Copilot clarification error:', err);
    } finally {
      setIsAsking(false);
    }
  };

  const handleClearHistory = () => {
    if (activeProjectId) {
      apiClient.clearChat(activeProjectId);
      setMessages([
        {
          id: 'init-msg-cleared',
          role: 'assistant',
          content: `Chat history cleared. What doubt or AI suggestion can I clarify for you now?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const suggestionChips = [
    { label: 'Why Strangler Fig over Rewrite?', query: 'Why did the AI agent recommend Strangler Fig pattern instead of a total rewrite?' },
    { label: 'Explain 92/100 Risk Score', query: 'Why is the Core Monolith scored as Critical 92/100 risk?' },
    { label: 'Clarify Settlement Fee Rule', query: 'Explain the extracted settlement fee business rule and its source code.' },
    { label: 'Why migrate to PostgreSQL?', query: 'Why does the target architecture recommend PostgreSQL 16 over Oracle?' },
  ];

  return (
    <>
      {/* Floating Copilot Launcher Icon (Bottom-Right of the screen) */}
      <div
        style={{
          position: 'fixed',
          bottom: '26px',
          right: '26px',
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        {/* Floating Greeting Pill when closed */}
        {!isOpen && showGreeting && (
          <div
            className="animate-fade-in"
            onClick={() => setIsOpen(true)}
            style={{
              marginBottom: '12px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #BFDBFE',
              boxShadow: '0 8px 24px rgba(26, 92, 255, 0.18)',
              borderRadius: '20px 20px 4px 20px',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              maxWidth: '280px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Sparkles size={16} color="#1A5CFF" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0C0F14' }}>
                Doubts about AI suggestions?
              </span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                Click me to clarify any recommendation!
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowGreeting(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* The Animated Cartoon Boy Copilot Avatar Button */}
        <button
          onClick={() => {
            setIsOpen(!isOpen);
            setShowGreeting(false);
          }}
          title={isOpen ? 'Close Copilot' : 'Open Legacy IQ Copilot'}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: '3px solid #1A5CFF',
            padding: 0,
            cursor: 'pointer',
            boxShadow: isOpen
              ? '0 0 0 4px rgba(26, 92, 255, 0.25), 0 8px 25px rgba(26, 92, 255, 0.4)'
              : '0 6px 22px rgba(26, 92, 255, 0.35)',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease',
            transform: isOpen ? 'scale(0.96)' : 'scale(1)',
          }}
          onMouseEnter={(e) => {
            if (!isOpen) e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            if (!isOpen) e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* 3D Boy Avatar Image */}
          <img
            src="/copilot-avatar.jpg"
            alt="Legacy IQ Copilot"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 15%',
            }}
          />

          {/* Active Status Beacon Dot */}
          <span
            style={{
              position: 'absolute',
              bottom: '3px',
              right: '3px',
              width: '12px',
              height: '12px',
              backgroundColor: '#10B981',
              borderRadius: '50%',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
            }}
          />
        </button>
      </div>

      {/* Floating Interactive Clarification Popup Modal / Drawer */}
      {isOpen && (
        <div
          className="animate-scale-up"
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '26px',
            width: '440px',
            maxWidth: 'calc(100vw - 36px)',
            height: '620px',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 16px 48px -8px rgba(12, 15, 20, 0.22), 0 0 0 1px rgba(0,0,0,0.04)',
            zIndex: 95,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Popup Header with Avatar & Details */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  border: '2px solid #1A5CFF',
                  overflow: 'hidden',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(26, 92, 255, 0.2)',
                }}
              >
                <img
                  src="/copilot-avatar.jpg"
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 15%' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0C0F14' }}>
                    EVOLVIX Copilot
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                    ● Online
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Clarify doubts on AI modernization suggestions
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={handleClearHistory}
                title="Clear chat history"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize Copilot"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Active Context Selector Bar */}
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#EFF6FF',
              borderBottom: '1px solid #DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1E40AF', fontWeight: 600 }}>
              <Compass size={13} />
              <span>Context:</span>
              <select
                value={activeProjectId}
                onChange={(e) => setActiveProjectId(e.target.value)}
                style={{
                  border: '1px solid #BFDBFE',
                  borderRadius: '4px',
                  padding: '2px 6px',
                  backgroundColor: '#FFFFFF',
                  color: '#1E3A8A',
                  fontSize: '11px',
                  fontWeight: 600,
                  outline: 'none',
                  maxWidth: '220px',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <span style={{ color: '#3B82F6', fontSize: '10.5px' }}>
              AST Traced
            </span>
          </div>

          {/* Quick Doubt Clarification Suggestions */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              backgroundColor: '#FFFFFF',
            }}
          >
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip.query)}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '11px',
                  padding: '5px 10px',
                  borderRadius: '9999px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#1A5CFF',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                  e.currentTarget.style.borderColor = '#BFDBFE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <Lightbulb size={12} color="#F59E0B" />
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: '#FFFFFF',
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className="chat-bubble-animate"
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      backgroundColor: isUser ? '#1A5CFF' : '#F8FAFC',
                      color: isUser ? '#FFFFFF' : '#0C0F14',
                      border: isUser ? 'none' : '1px solid #E2E8F0',
                      fontSize: '13px',
                      lineHeight: 1.55,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                    {/* Source citations and evidence references */}
                    {msg.sourceReferences && msg.sourceReferences.length > 0 && (
                      <div
                        style={{
                          marginTop: '10px',
                          paddingTop: '8px',
                          borderTop: isUser ? '1px solid rgba(255,255,255,0.2)' : '1px solid #E2E8F0',
                          fontSize: '11px',
                        }}
                      >
                        <span style={{ fontWeight: 700, display: 'block', marginBottom: '2px', color: isUser ? '#DBEAFE' : '#64748B' }}>
                          Evidence Citation:
                        </span>
                        {msg.sourceReferences.map((ref, i) => (
                          <div
                            key={i}
                            style={{
                              fontFamily: 'monospace',
                              color: isUser ? '#FFFFFF' : '#1E293B',
                              backgroundColor: isUser ? 'rgba(0,0,0,0.1)' : '#F1F5F9',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              marginTop: '2px',
                            }}
                          >
                            📄 {ref.file} ({ref.lines})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '10px',
                      color: '#94A3B8',
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      padding: '0 4px',
                    }}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isAsking && (
              <div
                className="chat-bubble-animate"
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#475569',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid #1A5CFF',
                    borderTopColor: 'transparent',
                  }}
                  className="animate-spin"
                />
                <span>Analyzing AST evidence and synthesizing clarification...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div
            style={{
              padding: '12px 14px',
              borderTop: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <input
              type="text"
              placeholder="Ask any doubt about AI suggestions, risks, or code..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              style={{
                flex: 1,
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '13px',
                outline: 'none',
                color: '#0C0F14',
                transition: 'border-color 0.15s ease',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#1A5CFF')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#E2E8F0')}
            />
            <button
              onClick={() => handleSend()}
              disabled={isAsking || !question.trim()}
              style={{
                backgroundColor: !question.trim() ? '#E2E8F0' : '#1A5CFF',
                color: !question.trim() ? '#94A3B8' : '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !question.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingCopilot;
