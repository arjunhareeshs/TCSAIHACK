import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronRight,
  CheckCircle2,
  FileCode2,
  Cpu,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import { Project, ActivityEvent } from '../../shared/api/types';

interface TopbarProps {
  sidebarCollapsed?: boolean;
  projects: Project[];
}

export const Topbar: React.FC<TopbarProps> = ({
  projects,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.getActivities().then(setActivities);
  }, [location.pathname]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute breadcrumbs
  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; to: string }[] = [];

  if (pathParts.length === 0 || pathParts[0] === 'dashboard') {
    breadcrumbs.push({ label: 'Workspace', to: '/' });
    breadcrumbs.push({ label: 'Dashboard', to: '/' });
  } else if (pathParts[0] === 'projects') {
    breadcrumbs.push({ label: 'Workspace', to: '/' });
    breadcrumbs.push({ label: 'Projects', to: '/projects' });
    if (pathParts[1] === 'new') {
      breadcrumbs.push({ label: 'New Project', to: '/projects/new' });
    } else if (pathParts[1]) {
      const activeProj = projects.find((p) => p.id === pathParts[1]);
      breadcrumbs.push({
        label: activeProj ? activeProj.name : 'Project Overview',
        to: `/projects/${pathParts[1]}`,
      });
    }
  } else if (pathParts[0] === 'reports') {
    breadcrumbs.push({ label: 'Workspace', to: '/' });
    breadcrumbs.push({ label: 'Reports & Analysis', to: '/reports' });
  } else if (pathParts[0] === 'settings') {
    breadcrumbs.push({ label: 'Preferences', to: '/settings' });
    breadcrumbs.push({ label: 'Settings', to: '/settings' });
  } else {
    breadcrumbs.push({ label: 'App', to: '/' });
    breadcrumbs.push({ label: pathParts[0], to: location.pathname });
  }

  // Filtered projects for global search
  const filteredProjects = searchQuery.trim()
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const unreadCount = activities.filter(
    (a) => a.type === 'analysis_completed' || a.type === 'analysis_failed'
  ).length;

  return (
    <header
      style={{
        height: '68px',
        position: 'fixed',
        top: 0,
        right: 0,
        left: '72px',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 40,
      }}
    >
      {/* ============================================================ */}
      {/* LEFT: FIXED HIGH-CONTRAST PROJECT TITLE & BREADCRUMBS        */}
      {/* ============================================================ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
        {/* Brand & High-Contrast Project Title */}
        <div
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '8px',
            transition: 'background-color 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          title="LEGACY IQ Home"
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#1A5CFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(26, 92, 255, 0.35)',
              flexShrink: 0,
            }}
          >
            <Cpu size={18} strokeWidth={2.4} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'Plus Jakarta Sans',
                fontWeight: 800,
                fontSize: '17px',
                letterSpacing: '-0.025em',
                color: '#0C0F14',
                whiteSpace: 'nowrap',
              }}
            >
              LEGACY IQ
            </span>

            {/* High Contrast Black Badge */}
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                backgroundColor: '#0C0F14',
                color: '#FFFFFF',
                padding: '3px 8px',
                borderRadius: '5px',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                boxShadow: '0 1px 3px rgba(12,15,20,0.18)',
              }}
            >
              Autonomous Legacy Modernization Agent
            </span>

            {/* TCS Hackathon Pill */}
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                backgroundColor: '#EFF6FF',
                color: '#1A5CFF',
                border: '1px solid #BFDBFE',
                padding: '2px 7px',
                borderRadius: '5px',
                whiteSpace: 'nowrap',
              }}
            >
              TCS 2026
            </span>
          </div>
        </div>

        {/* Subtle Vertical Divider */}
        <div
          style={{
            width: '1px',
            height: '22px',
            backgroundColor: '#CBD5E1',
            margin: '0 4px',
            flexShrink: 0,
          }}
        />

        {/* Breadcrumb Trail */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={bc.to + idx}>
              {idx > 0 && <ChevronRight size={13} color="#94A3B8" style={{ flexShrink: 0 }} />}
              {idx === breadcrumbs.length - 1 ? (
                <span
                  style={{
                    fontWeight: 600,
                    color: '#0C0F14',
                    backgroundColor: '#F1F5F9',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {bc.label}
                </span>
              ) : (
                <Link
                  to={bc.to}
                  style={{
                    color: '#64748B',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'color 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#1A5CFF')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                >
                  {bc.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT: SEARCH, AGENT STATUS, NOTIFICATIONS, PROFILE          */}
      {/* ============================================================ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        {/* Project Search Box */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '6px 12px',
              width: '240px',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            <Search size={15} color="#64748B" />
            <input
              type="text"
              placeholder="Search legacy projects..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '13px',
                width: '100%',
                color: '#0C0F14',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} color="#94A3B8" />
              </button>
            )}
          </div>

          {/* Quick Search Dropdown */}
          {showSearchResults && searchQuery.trim() && (
            <div
              className="animate-scale-up"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '320px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 12px 28px rgba(0,0,0,0.12)',
                padding: '8px 0',
                zIndex: 50,
              }}
            >
              <div
                style={{
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                }}
              >
                Matching Projects ({filteredProjects.length})
              </div>
              {filteredProjects.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: '13px', color: '#64748B' }}>
                  No projects matching "{searchQuery}"
                </div>
              ) : (
                filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      navigate(`/projects/${p.id}`);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    style={{
                      padding: '8px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0C0F14' }}>
                        {p.name}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '10.5px' }}>
                        {p.language}
                      </span>
                    </div>
                    <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                      Status: {p.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* AI Agent Engine Status Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: '9999px',
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#065F46',
            boxShadow: '0 1px 3px rgba(16, 185, 129, 0.1)',
          }}
        >
          <span className="status-dot-pulse" />
          <span>Agent Online</span>
        </div>

        {/* Notifications Icon & Popover */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            title="Analysis Notifications"
            style={{
              position: 'relative',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#1A5CFF',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #FFFFFF',
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className="animate-scale-up"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                zIndex: 60,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="#1A5CFF" />
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#0C0F14' }}>
                    Modernization Activity Alerts
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  {activities.length} recent events
                </span>
              </div>

              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {activities.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No recent activity notifications
                  </div>
                ) : (
                  activities.slice(0, 5).map((act) => (
                    <div
                      key={act.id}
                      onClick={() => {
                        navigate(`/projects/${act.projectId}`);
                        setShowNotifications(false);
                      }}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F1F5F9',
                        display: 'flex',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <div style={{ marginTop: '2px' }}>
                        {act.type === 'analysis_completed' ? (
                          <CheckCircle2 size={16} color="#10B981" />
                        ) : act.type === 'analysis_started' ? (
                          <Cpu size={16} color="#1A5CFF" />
                        ) : (
                          <FileCode2 size={16} color="#F59E0B" />
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0C0F14' }}>
                            {act.projectName}
                          </span>
                        </div>
                        <p style={{ fontSize: '11.5px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                          {act.details}
                        </p>
                        <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#0C0F14',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
              }}
            >
              LA
            </div>
          </button>

          {showUserMenu && (
            <div
              className="animate-scale-up"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '240px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                zIndex: 60,
                padding: '6px 0',
              }}
            >
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0C0F14' }}>
                  Enterprise Lead Architect
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  architect@tcs.modernize.ai
                </div>
              </div>

              <div style={{ padding: '4px 0' }}>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowUserMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    color: '#0C0F14',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Settings size={15} color="#64748B" />
                  <span>Account Settings</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/login');
                    setShowUserMenu(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '100%',
                    padding: '8px 16px',
                    background: 'none',
                    border: 'none',
                    fontSize: '13px',
                    color: '#EF4444',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF2F2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut size={15} color="#EF4444" />
                  <span>Sign In / Switch Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
