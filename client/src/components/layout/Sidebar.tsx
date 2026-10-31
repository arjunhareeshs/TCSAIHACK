import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  FileBarChart2,
  Settings,
  HelpCircle,
  Cpu,
  LogOut,
  Pin,
  PinOff,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenHelp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed: externalCollapsed,
  onOpenHelp,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Internal hover state: expands when hovering on the logo or inside the sidebar
  const [isHovered, setIsHovered] = useState(false);
  // Pin state so user can pin it open if desired
  const [isPinned, setIsPinned] = useState(false);
  // Tooltip hover state when collapsed
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // The sidebar is expanded if it's pinned, or hovered, or externally uncollapsed
  const isExpanded = isPinned || isHovered || !externalCollapsed;

  const navItems = [
    {
      id: 'home',
      name: 'Home',
      subtext: 'Dashboard & metrics',
      path: '/',
      icon: LayoutDashboard,
      isActive: location.pathname === '/' || location.pathname === '/dashboard',
    },
    {
      id: 'projects',
      name: 'Project Review',
      subtext: 'Portfolios & 9-module analysis',
      path: '/projects',
      icon: FolderGit2,
      isActive: location.pathname.startsWith('/projects'),
    },
    {
      id: 'reports',
      name: 'Reports & Analysis',
      subtext: 'Executive dossiers & export',
      path: '/reports',
      icon: FileBarChart2,
      isActive: location.pathname.startsWith('/reports'),
    },
  ];

  const secondaryNavItems = [
    {
      id: 'settings',
      name: 'Settings',
      subtext: 'AI engine & preferences',
      path: '/settings',
      icon: Settings,
      isActive: location.pathname.startsWith('/settings'),
    },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setHoveredItem(null);
      }}
      style={{
        width: isExpanded ? '264px' : '72px',
        minWidth: isExpanded ? '264px' : '72px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        zIndex: 50,
        transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: isExpanded ? '4px 0 28px rgba(12, 15, 20, 0.12)' : 'none',
        userSelect: 'none',
      }}
    >
      {/* Top Logo / Brand Container */}
      <div
        style={{
          height: '72px',
          padding: isExpanded ? '0 18px' : '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'space-between' : 'center',
          borderBottom: '1px solid #E2E8F0',
          position: 'relative',
        }}
      >
        <div
          onClick={() => navigate('/')}
          onMouseEnter={() => {
            setIsHovered(true);
            setHoveredItem('logo');
          }}
          onMouseLeave={() => setHoveredItem(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          {/* Logo Chip Icon (matching user screenshot with hover scale & glow) */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#1A5CFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: isHovered
                ? '0 4px 14px rgba(26, 92, 255, 0.45)'
                : '0 2px 6px rgba(26, 92, 255, 0.3)',
              flexShrink: 0,
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            <Cpu size={22} strokeWidth={2.2} />
          </div>

          {/* Expanded Brand Details */}
          {isExpanded && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                minWidth: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '15.5px', letterSpacing: '-0.02em', color: '#0C0F14' }}>
                  LEGACY IQ
                </span>
                <span
                  style={{
                    fontSize: '9.5px',
                    fontWeight: 700,
                    backgroundColor: '#EFF6FF',
                    color: '#1A5CFF',
                    padding: '2px 5px',
                    borderRadius: '4px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  TCS 2026
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                Application Modernization
              </span>
            </div>
          )}
        </div>

        {/* Pin / Unpin control when expanded */}
        {isExpanded && (
          <button
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isPinned ? '#1A5CFF' : '#94A3B8',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        )}

        {/* Floating Tooltip on Logo when collapsed */}
        {!isExpanded && hoveredItem === 'logo' && (
          <div
            className="sidebar-tooltip"
            style={{
              position: 'absolute',
              left: '78px',
              top: '18px',
              backgroundColor: '#0C0F14',
              color: '#FFFFFF',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 60,
              pointerEvents: 'none',
            }}
          >
            LEGACY IQ <span style={{ color: '#93C5FD', fontSize: '11px' }}>• Hover to expand</span>
          </div>
        )}
      </div>

      {/* Centralized Navigation Section (Vertically Centered in the Viewport) */}
      <div
        style={{
          margin: 'auto 0',
          padding: isExpanded ? '0 14px' : '0 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {isExpanded && (
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#94A3B8',
              letterSpacing: '0.06em',
              padding: '0 10px 4px 10px',
              textTransform: 'uppercase',
            }}
          >
            NAVIGATION
          </div>
        )}

        {/* Primary Nav Items: Home, Project Review, Reports & Analysis */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          const isItemHovered = hoveredItem === item.id;

          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <NavLink
                to={item.path}
                onMouseEnter={(e) => {
                  setHoveredItem(item.id);
                  if (!isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  setHoveredItem(null);
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: isExpanded ? '11px 14px' : '12px',
                  justifyContent: isExpanded ? 'flex-start' : 'center',
                  borderRadius: '10px',
                  color: isActive ? '#1A5CFF' : '#475569',
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13.5px',
                  textDecoration: 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Active Indicator Bar on Left */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '0px',
                      top: '6px',
                      bottom: '6px',
                      width: '4px',
                      backgroundColor: '#1A5CFF',
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'transform 0.15s ease',
                    transform: isItemHovered && !isActive ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.4 : 1.9}
                    color={isActive ? '#1A5CFF' : '#64748B'}
                  />
                </div>

                {/* Expanded Details: Home / Project Review title and subtext */}
                {isExpanded && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: isActive ? 700 : 600,
                        color: isActive ? '#1A5CFF' : '#0C0F14',
                        fontSize: '13.5px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#64748B',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      {item.subtext}
                    </span>
                  </div>
                )}
              </NavLink>

              {/* Floating Tooltip on Hover when Collapsed */}
              {!isExpanded && isItemHovered && (
                <div
                  className="sidebar-tooltip"
                  style={{
                    position: 'absolute',
                    left: '68px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#0C0F14',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 60,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <span style={{ fontSize: '9px', backgroundColor: '#1A5CFF', padding: '1px 5px', borderRadius: '4px' }}>
                      Active
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Subtle Separator */}
        <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 6px' }} />

        {/* Secondary Nav Items: Settings */}
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          const isItemHovered = hoveredItem === item.id;

          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <NavLink
                to={item.path}
                onMouseEnter={(e) => {
                  setHoveredItem(item.id);
                  if (!isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  setHoveredItem(null);
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: isExpanded ? '11px 14px' : '12px',
                  justifyContent: isExpanded ? 'flex-start' : 'center',
                  borderRadius: '10px',
                  color: isActive ? '#1A5CFF' : '#475569',
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13.5px',
                  textDecoration: 'none',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '0px',
                      top: '6px',
                      bottom: '6px',
                      width: '4px',
                      backgroundColor: '#1A5CFF',
                      borderRadius: '0 4px 4px 0',
                    }}
                  />
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'transform 0.15s ease',
                    transform: isItemHovered && !isActive ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.4 : 1.9}
                    color={isActive ? '#1A5CFF' : '#64748B'}
                  />
                </div>

                {isExpanded && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: isActive ? 700 : 600,
                        color: isActive ? '#1A5CFF' : '#0C0F14',
                        fontSize: '13.5px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#64748B',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                      }}
                    >
                      {item.subtext}
                    </span>
                  </div>
                )}
              </NavLink>

              {!isExpanded && isItemHovered && (
                <div
                  className="sidebar-tooltip"
                  style={{
                    position: 'absolute',
                    left: '68px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#0C0F14',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 60,
                    pointerEvents: 'none',
                  }}
                >
                  {item.name}
                </div>
              )}
            </div>
          );
        })}

        {/* Help & Support Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={onOpenHelp}
            onMouseEnter={(e) => {
              setHoveredItem('help');
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            }}
            onMouseLeave={(e) => {
              setHoveredItem(null);
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: isExpanded ? '11px 14px' : '12px',
              justifyContent: isExpanded ? 'flex-start' : 'center',
              borderRadius: '10px',
              color: '#475569',
              backgroundColor: 'transparent',
              fontWeight: 500,
              fontSize: '13.5px',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.15s ease',
                transform: hoveredItem === 'help' ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              <HelpCircle size={21} strokeWidth={1.9} color="#64748B" />
            </div>

            {isExpanded && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 0,
                  animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <span style={{ fontWeight: 600, color: '#0C0F14', fontSize: '13.5px', whiteSpace: 'nowrap' }}>
                  Help & Support
                </span>
                <span style={{ fontSize: '11px', color: '#64748B', whiteSpace: 'nowrap' }}>
                  Documentation & hackathon guide
                </span>
              </div>
            )}
          </button>

          {!isExpanded && hoveredItem === 'help' && (
            <div
              className="sidebar-tooltip"
              style={{
                position: 'absolute',
                left: '68px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: '#0C0F14',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 60,
                pointerEvents: 'none',
              }}
            >
              Help & Support
            </div>
          )}
        </div>
      </div>

      {/* Bottom User Profile Section */}
      <div
        style={{
          borderTop: '1px solid #E2E8F0',
          padding: isExpanded ? '14px 18px' : '14px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isExpanded ? 'space-between' : 'center',
          backgroundColor: '#FFFFFF',
          position: 'relative',
        }}
      >
        <div
          onClick={() => navigate('/settings')}
          onMouseEnter={() => setHoveredItem('profile')}
          onMouseLeave={() => setHoveredItem(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
              position: 'relative',
            }}
          >
            AI
            <span
              style={{
                position: 'absolute',
                bottom: '1px',
                right: '1px',
                width: '8px',
                height: '8px',
                backgroundColor: '#10B981',
                borderRadius: '50%',
                border: '1.5px solid #FFFFFF',
              }}
            />
          </div>

          {isExpanded && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0C0F14',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                Lead Architect
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#64748B',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                TCS AI Modernization
              </span>
            </div>
          )}
        </div>

        {isExpanded && (
          <button
            onClick={() => navigate('/login')}
            title="Account / Sign in"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut size={16} />
          </button>
        )}

        {!isExpanded && hoveredItem === 'profile' && (
          <div
            className="sidebar-tooltip"
            style={{
              position: 'absolute',
              left: '68px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: '#0C0F14',
              color: '#FFFFFF',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 60,
              pointerEvents: 'none',
            }}
          >
            Lead Architect
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
