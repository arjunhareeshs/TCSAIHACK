import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FolderGit2,
  CheckCircle2,
  ShieldAlert,
  FileCode,
  Plus,
  Search,
  ArrowUpDown,
  MoreVertical,
  Play,
  Trash2,
  Edit2,
  ExternalLink,
  Clock,
  Activity,
  Layers,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import { Project, ActivityEvent, AnalysisStatus } from '../../shared/api/types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'name' | 'lastUpdated' | 'status'>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Rename Modal state
  const [renameProject, setRenameProject] = useState<Project | null>(null);
  const [newName, setNewName] = useState('');
  // Delete confirm state
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  // Re-analysing project id
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projs, acts] = await Promise.all([
        apiClient.getProjects(),
        apiClient.getActivities(),
      ]);
      setProjects(projs);
      setActivities(acts);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute dynamic metrics from actual project data
  const totalProjects = projects.length;
  const analysedProjects = projects.filter((p) => p.status === 'Completed').length;
  const inProgressProjects = projects.filter((p) => p.status === 'In Progress').length;
  const notAnalysedProjects = projects.filter((p) => p.status === 'Not Analysed').length;
  const failedProjects = projects.filter((p) => p.status === 'Failed').length;

  const totalBusinessRules = projects.reduce((acc, p) => acc + (p.businessRulesCount || 0), 0);
  const totalCriticalRisks = projects.reduce((acc, p) => acc + (p.criticalRisksCount || 0), 0);

  // Filter & Sort Projects
  const filteredProjects = projects
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.database.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else {
        comparison = new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleSort = (field: 'name' | 'lastUpdated' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSaveRename = async () => {
    if (!renameProject || !newName.trim()) return;
    await apiClient.updateProject(renameProject.id, { name: newName.trim() });
    setRenameProject(null);
    setNewName('');
    loadData();
  };

  const handleDelete = async (id: string) => {
    await apiClient.deleteProject(id);
    setDeleteProjectId(null);
    loadData();
  };

  const handleReanalyze = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setAnalyzingId(id);
      await apiClient.runAnalysis(id);
      await loadData();
    } finally {
      setAnalyzingId(null);
    }
  };

  const getStatusBadgeClass = (status: AnalysisStatus) => {
    switch (status) {
      case 'Completed':
        return 'badge-success';
      case 'In Progress':
        return 'badge-warning';
      case 'Failed':
        return 'badge-danger';
      case 'Not Analysed':
      default:
        return 'badge-neutral';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', color: '#0C0F14', letterSpacing: '-0.02em' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Manage legacy application analysis and modernization projects.
          </p>
        </div>
        <Link to="/projects/new" className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>
          <Plus size={18} />
          <span>New Project</span>
        </Link>
      </div>

      {/* 4 Overview Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Card 1: Total Projects */}
        <div className="card-interactive" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1A5CFF',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(26, 92, 255, 0.15)',
            }}
          >
            <FolderGit2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Projects
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0C0F14', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {loading ? '-' : totalProjects}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              Active enterprise repositories
            </div>
          </div>
        </div>

        {/* Card 2: Analysed Projects */}
        <div className="card-interactive" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10B981',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Analysed Projects
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0C0F14', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {loading ? '-' : analysedProjects}
            </div>
            <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '2px', fontWeight: 500 }}>
              Full 9-module assessment completed
            </div>
          </div>
        </div>

        {/* Card 3: Business Rules */}
        <div className="card-interactive" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: '#EEF2FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6366F1',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.15)',
            }}
          >
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Business Rules
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#1A5CFF', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {loading ? '-' : totalBusinessRules}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              Extracted logic with code citations
            </div>
          </div>
        </div>

        {/* Card 4: Critical Risks */}
        <div className="card-interactive" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: '#FEF2F2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)',
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Critical Risks
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#EF4444', marginTop: '2px', letterSpacing: '-0.02em' }}>
              {loading ? '-' : totalCriticalRisks}
            </div>
            <div style={{ fontSize: '11.5px', color: '#EF4444', marginTop: '2px', fontWeight: 600 }}>
              P1 modernization bottlenecks
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Projects Table & Status Distribution + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)', gap: '24px' }}>
        {/* Left Column: Recent Projects Table */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                Recent Projects
              </h2>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Inspect, analyse and manage legacy source bases
              </span>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  width: '180px',
                }}
              >
                <Search size={14} color="#64748B" />
                <input
                  type="text"
                  placeholder="Filter projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '12px',
                    width: '100%',
                  }}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '5px 8px',
                  fontSize: '12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  outline: 'none',
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Not Analysed">Not Analysed</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Project Name</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th>Technology</th>
                  <th onClick={() => handleSort('lastUpdated')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Last Updated</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Analysis Status</span>
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#64748B' }}>
                      {loading ? 'Loading projects...' : 'No projects found matching the criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate(`/projects/${p.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: '#0C0F14' }}>
                            {p.name}
                          </span>
                          <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                            {p.type} • {p.filesCount} files
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                            {p.language}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                            {p.database}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '12.5px', color: '#64748B' }}>
                        {new Date(p.lastUpdated).toLocaleDateString()} {new Date(p.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(p.status)}`}>
                          {p.status === 'In Progress' && (
                            <RefreshCw size={11} className="animate-spin" />
                          )}
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            title="Open Project Overview"
                            onClick={() => navigate(`/projects/${p.id}`)}
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#1A5CFF',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <ExternalLink size={13} />
                          </button>
                          <button
                            title="Re-analyse Project"
                            disabled={analyzingId === p.id}
                            onClick={(e) => handleReanalyze(p.id, e)}
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#065F46',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <RefreshCw size={13} className={analyzingId === p.id ? 'animate-spin' : ''} />
                          </button>
                          <button
                            title="Rename"
                            onClick={() => {
                              setRenameProject(p);
                              setNewName(p.name);
                            }}
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#64748B',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            title="Delete"
                            onClick={() => setDeleteProjectId(p.id)}
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              color: '#EF4444',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Status Distribution & Real Activity History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Status Distribution Card */}
          <div className="card">
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px 0', color: '#0C0F14' }}>
              Project Analysis Status
            </h2>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Real-time portfolio progress distribution
            </span>

            {/* Custom Clean SVG Donut Chart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px' }}>
              <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  {/* Background Circle */}
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F1F5F9" strokeWidth="4.5" />
                  {/* Completed segment */}
                  {totalProjects > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="4.5"
                      strokeDasharray={`${(analysedProjects / totalProjects) * 88} 88`}
                      strokeDashoffset="0"
                    />
                  )}
                  {/* In Progress segment */}
                  {totalProjects > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="4.5"
                      strokeDasharray={`${(inProgressProjects / totalProjects) * 88} 88`}
                      strokeDashoffset={`-${(analysedProjects / totalProjects) * 88}`}
                    />
                  )}
                  {/* Not Analysed segment */}
                  {totalProjects > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="4.5"
                      strokeDasharray={`${(notAnalysedProjects / totalProjects) * 88} 88`}
                      strokeDashoffset={`-${((analysedProjects + inProgressProjects) / totalProjects) * 88}`}
                    />
                  )}
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#0C0F14' }}>
                    {totalProjects}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                    Projects
                  </span>
                </div>
              </div>

              {/* Status Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                    <span style={{ color: '#475569' }}>Completed</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0C0F14' }}>{analysedProjects}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                    <span style={{ color: '#475569' }}>In Progress</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0C0F14' }}>{inProgressProjects}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                    <span style={{ color: '#475569' }}>Not Analysed</span>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0C0F14' }}>{notAnalysedProjects}</span>
                </div>
                {failedProjects > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                      <span style={{ color: '#475569' }}>Failed</span>
                    </div>
                    <span style={{ fontWeight: 700, color: '#EF4444' }}>{failedProjects}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analysis Activity Feed */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} color="#1A5CFF" />
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                  Analysis Activity
                </h2>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>Live events</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '360px', overflowY: 'auto' }}>
              {activities.length === 0 ? (
                <div style={{ fontSize: '12.5px', color: '#64748B', textAlign: 'center', padding: '16px' }}>
                  No logged activity yet.
                </div>
              ) : (
                activities.slice(0, 6).map((act) => (
                  <div key={act.id} style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ marginTop: '3px' }}>
                      {act.type === 'analysis_completed' ? (
                        <CheckCircle2 size={15} color="#10B981" />
                      ) : act.type === 'analysis_started' ? (
                        <RefreshCw size={15} color="#1A5CFF" />
                      ) : act.type === 'report_generated' ? (
                        <FileCode size={15} color="#6366F1" />
                      ) : (
                        <FolderGit2 size={15} color="#F59E0B" />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0C0F14' }}>
                        {act.projectName}
                      </span>
                      <p style={{ fontSize: '11.5px', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                        {act.details}
                      </p>
                      <span style={{ fontSize: '10.5px', color: '#94A3B8' }}>
                        {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      {renameProject && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setRenameProject(null)}
        >
          <div
            className="card"
            style={{ width: '420px', maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0' }}>
              Rename Project
            </h3>
            <input
              type="text"
              className="input-field"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new project name"
              autoFocus
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setRenameProject(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveRename}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteProjectId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setDeleteProjectId(null)}
        >
          <div
            className="card"
            style={{ width: '420px', maxWidth: '90vw' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#EF4444', marginBottom: '8px' }}>
              <AlertTriangle size={20} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                Delete Project
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
              Are you sure you want to delete this project? All associated analysis results, business-rule catalogues, and dependency records will be permanently removed.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setDeleteProjectId(null)}>
                Cancel
              </button>
              <button
                className="btn-outline-danger"
                onClick={() => handleDelete(deleteProjectId)}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
