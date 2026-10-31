import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderGit2,
  FileBarChart2,
  Settings,
  HelpCircle,
  Cpu,
  LogOut,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenHelp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenHelp }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // ONLY the logo expands when the cursor hovers near/over it
  const [isLogoExpanded, setIsLogoExpanded] = useState(false);
  // Tooltip hover state for dock icons
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);

  const logoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoMouseEnter = () => {
    if (logoTimeoutRef.current) {
      clearTimeout(logoTimeoutRef.current);
      logoTimeoutRef.current = null;
    }
    setIsLogoExpanded(true);
  };

  const handleLogoMouseLeave = () => {
    logoTimeoutRef.current = setTimeout(() => {
      setIsLogoExpanded(false);
    }, 220); // Smooth delay to allow moving into expanded flyout without jitter
  };

  useEffect(() => {
    return () => {
      if (logoTimeoutRef.current) clearTimeout(logoTimeoutRef.current);
    };
  }, []);

  const navItems = [
    {
      id: 'home',
      name: 'Home',
      subtext: 'Dashboard & live metrics',
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
      subtext: 'Executive dossiers & audit export',
      path: '/reports',
      icon: FileBarChart2,
      isActive: location.pathname.startsWith('/reports'),
    },
  ];

  const secondaryNavItems = [
    {
      id: 'settings',
      name: 'Settings',
      subtext: 'AI engine & system preferences',
      path: '/settings',
      icon: Settings,
      isActive: location.pathname.startsWith('/settings'),
    },
  ];

  return (
    <aside
      style={{
        width: '72px',
        minWidth: '72px',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 50,
        userSelect: 'none',
      }}
    >
      {/* ============================================================ */}
      {/* TOP: LOGO SECTION (ONLY THIS EXPANDS WHEN CURSOR GOES NEAR IT) */}
      {/* ============================================================ */}
      <div
        onMouseEnter={handleLogoMouseEnter}
        onMouseLeave={handleLogoMouseLeave}
        style={{
          width: '72px',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        {/* Trigger Chip Icon */}
        <div
          onClick={() => navigate('/')}
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '11px',
            backgroundColor: '#1A5CFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: isLogoExpanded
              ? '0 6px 18px rgba(26, 92, 255, 0.45)'
              : '0 2px 8px rgba(26, 92, 255, 0.28)',
            transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease',
            transform: isLogoExpanded ? 'scale(1.08)' : 'scale(1)',
            position: 'relative',
          }}
          title="LEGACY IQ – Hover to expand details"
        >
          <Cpu size={22} strokeWidth={2.4} />

          {/* Tiny live active pulse badge on the logo */}
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '9px',
              height: '9px',
              backgroundColor: '#10B981',
              borderRadius: '50%',
              border: '2px solid #FFFFFF',
              boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
            }}
          />
        </div>

        {/* ============================================================ */}
        {/* EXPANDED MENU DRAWER (OPENS WHEN CURSOR HOVERS ON/NEAR LOGO) */}
        {/* ============================================================ */}
        {isLogoExpanded && (
          <div
            onMouseEnter={handleLogoMouseEnter}
            onMouseLeave={handleLogoMouseLeave}
            style={{
              position: 'absolute',
              left: '8px',
              top: '8px',
              width: '292px',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #CBD5E1',
              boxShadow: '0 20px 45px -8px rgba(12, 15, 20, 0.22), 0 6px 16px rgba(12, 15, 20, 0.08)',
              padding: '16px',
              zIndex: 100,
              animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              transformOrigin: 'top left',
            }}
          >
            {/* Header / Brand details */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                paddingBottom: '14px',
                borderBottom: '1px solid #E2E8F0',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: '#1A5CFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 14px rgba(26, 92, 255, 0.4)',
                  flexShrink: 0,
                }}
              >
                <Cpu size={22} strokeWidth={2.4} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: '16px',
                      letterSpacing: '-0.025em',
                      color: '#0C0F14',
                    }}
                  >
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
                  Autonomous Modernization Agent
                </span>
              </div>
            </div>

            {/* Quick Navigation Items */}
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: '#94A3B8',
                  letterSpacing: '0.06em',
                  padding: '2px 8px 6px',
                  textTransform: 'uppercase',
                }}
              >
                WORKSPACE PAGES
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setIsLogoExpanded(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      backgroundColor: item.isActive ? '#EFF6FF' : 'transparent',
                      color: item.isActive ? '#1A5CFF' : '#334155',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!item.isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!item.isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: item.isActive ? '#DBEAFE' : '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.isActive ? '#1A5CFF' : '#64748B',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={17} strokeWidth={item.isActive ? 2.4 : 2} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: item.isActive ? 700 : 600,
                          color: item.isActive ? '#1A5CFF' : '#0C0F14',
                        }}
                      >
                        {item.name}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#64748B',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.subtext}
                      </span>
                    </div>

                    <ChevronRight size={14} color={item.isActive ? '#1A5CFF' : '#CBD5E1'} />
                  </NavLink>
                );
              })}

              <div style={{ height: '1px', backgroundColor: '#E2E8F0', margin: '4px 0' }} />

              {/* Settings Nav */}
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setIsLogoExpanded(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '9px 10px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      backgroundColor: item.isActive ? '#EFF6FF' : 'transparent',
                      color: item.isActive ? '#1A5CFF' : '#334155',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!item.isActive) e.currentTarget.style.backgroundColor = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      if (!item.isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: item.isActive ? '#DBEAFE' : '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.isActive ? '#1A5CFF' : '#64748B',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={17} strokeWidth={2} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: item.isActive ? '#1A5CFF' : '#0C0F14',
                        }}
                      >
                        {item.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {item.subtext}
                      </span>
                    </div>

                    <ChevronRight size={14} color="#CBD5E1" />
                  </NavLink>
                );
              })}
            </div>

            {/* Bottom Footer Info */}
            <div
              style={{
                marginTop: '12px',
                paddingTop: '10px',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#64748B',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                  }}
                />
                <span>Engine Active</span>
              </div>
              <span style={{ fontWeight: 600, color: '#1A5CFF' }}>v2.4.0-TCS</span>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MIDDLE: VERTICALLY CENTRALIZED DOCK ICONS (EXACT USER SCREENSHOT) */}
      {/* ============================================================ */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 0',
          width: '100%',
        }}
      >
        {/* Primary Nav Items */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          const isItemHovered = hoveredIcon === item.id;

          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <NavLink
                to={item.path}
                onMouseEnter={() => setHoveredIcon(item.id)}
                onMouseLeave={() => setHoveredIcon(null)}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive
                    ? '#EFF6FF'
                    : isItemHovered
                    ? '#F8FAFC'
                    : 'transparent',
                  color: isActive ? '#1A5CFF' : '#64748B',
                  textDecoration: 'none',
                  transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                }}
              >
                {/* Active Indicator Bar on Left Edge (Exact Match with Reference Image) */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '0px',
                      top: '8px',
                      bottom: '8px',
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
                    transition: 'transform 0.15s ease',
                    transform: isItemHovered && !isActive ? 'scale(1.12)' : 'scale(1)',
                  }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.4 : 1.9}
                    color={isActive ? '#1A5CFF' : '#64748B'}
                  />
                </div>
              </NavLink>

              {/* Tooltip on Hover */}
              {isItemHovered && (
                <div
                  className="sidebar-tooltip"
                  style={{
                    position: 'absolute',
                    left: '60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#0C0F14',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                    zIndex: 90,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    animation: 'scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <span>{item.name}</span>
                  {isActive && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        backgroundColor: '#1A5CFF',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Separator Line */}
        <div
          style={{
            width: '32px',
            height: '1px',
            backgroundColor: '#E2E8F0',
            margin: '6px 0',
          }}
        />

        {/* Secondary Nav Items: Settings */}
        {secondaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;
          const isItemHovered = hoveredIcon === item.id;

          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <NavLink
                to={item.path}
                onMouseEnter={() => setHoveredIcon(item.id)}
                onMouseLeave={() => setHoveredIcon(null)}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isActive
                    ? '#EFF6FF'
                    : isItemHovered
                    ? '#F8FAFC'
                    : 'transparent',
                  color: isActive ? '#1A5CFF' : '#64748B',
                  textDecoration: 'none',
                  transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '0px',
                      top: '8px',
                      bottom: '8px',
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
                    transition: 'transform 0.15s ease',
                    transform: isItemHovered && !isActive ? 'scale(1.12)' : 'scale(1)',
                  }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.4 : 1.9}
                    color={isActive ? '#1A5CFF' : '#64748B'}
                  />
                </div>
              </NavLink>

              {isItemHovered && (
                <div
                  className="sidebar-tooltip"
                  style={{
                    position: 'absolute',
                    left: '60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    backgroundColor: '#0C0F14',
                    color: '#FFFFFF',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                    zIndex: 90,
                    pointerEvents: 'none',
                    animation: 'scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
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
            onMouseEnter={() => setHoveredIcon('help')}
            onMouseLeave={() => setHoveredIcon(null)}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: hoveredIcon === 'help' ? '#F8FAFC' : 'transparent',
              color: '#64748B',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <HelpCircle
              size={22}
              strokeWidth={1.9}
              color={hoveredIcon === 'help' ? '#1A5CFF' : '#64748B'}
            />
          </button>

          {hoveredIcon === 'help' && (
            <div
              className="sidebar-tooltip"
              style={{
                position: 'absolute',
                left: '60px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: '#0C0F14',
                color: '#FFFFFF',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                zIndex: 90,
                pointerEvents: 'none',
                animation: 'scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              Help & Support Guide
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* BOTTOM: USER PROFILE AVATAR */}
      {/* ============================================================ */}
      <div
        style={{
          width: '72px',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid #E2E8F0',
          position: 'relative',
        }}
      >
        <div
          onClick={() => navigate('/settings')}
          onMouseEnter={() => setHoveredIcon('profile')}
          onMouseLeave={() => setHoveredIcon(null)}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#0C0F14',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            position: 'relative',
            boxShadow: '0 2px 6px rgba(12, 15, 20, 0.25)',
            transition: 'transform 0.15s ease',
            transform: hoveredIcon === 'profile' ? 'scale(1.08)' : 'scale(1)',
          }}
          title="Lead Architect – TCS Modernization"
        >
          AI
          <span
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '9px',
              height: '9px',
              backgroundColor: '#10B981',
              borderRadius: '50%',
              border: '2px solid #FFFFFF',
            }}
          />
        </div>

        {hoveredIcon === 'profile' && (
          <div
            className="sidebar-tooltip"
            style={{
              position: 'absolute',
              left: '60px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: '#0C0F14',
              color: '#FFFFFF',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
              zIndex: 90,
              pointerEvents: 'none',
              animation: 'scaleUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            Lead Architect (TCS AI)
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
