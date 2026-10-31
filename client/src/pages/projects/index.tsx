import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Trash2,
  Layers,
  FileCode2,
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import { Project, AnalysisStatus } from '../../shared/api/types';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [langFilter, setLangFilter] = useState('All');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleReanalyze = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setAnalyzingId(id);
      await apiClient.runAnalysis(id);
      await loadProjects();
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this project?')) {
      await apiClient.deleteProject(id);
      loadProjects();
    }
  };

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesLang = langFilter === 'All' || p.language.includes(langFilter);
    return matchesSearch && matchesStatus && matchesLang;
  });

  const getStatusBadge = (status: AnalysisStatus) => {
    switch (status) {
      case 'Completed':
        return <span className="badge badge-success"><CheckCircle2 size={11} /> Completed</span>;
      case 'In Progress':
        return <span className="badge badge-warning"><RefreshCw size={11} className="animate-spin" /> In Progress</span>;
      case 'Failed':
        return <span className="badge badge-danger">Failed</span>;
      default:
        return <span className="badge badge-neutral">Not Analysed</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: '0 0 6px 0', color: '#0C0F14', letterSpacing: '-0.02em' }}>
            Projects
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
            Enterprise legacy software portfolios undergoing modernization evaluation.
          </p>
        </div>
        <Link to="/projects/new" className="btn-primary" style={{ padding: '10px 20px' }}>
          <Plus size={18} />
          <span>New Project</span>
        </Link>
      </div>

      {/* Search and Filters Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#FFFFFF',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Search projects by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '13.5px',
              width: '100%',
              color: '#0C0F14',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              style={{ padding: '5px 8px', fontSize: '12.5px', width: 'auto' }}
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Not Analysed">Not Analysed</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 500 }}>Language:</span>
            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="input-field"
              style={{ padding: '5px 8px', fontSize: '12.5px', width: 'auto' }}
            >
              <option value="All">All Languages</option>
              <option value="Java">Java</option>
              <option value=".NET">.NET / C#</option>
              <option value="COBOL">COBOL</option>
              <option value="Python">Python</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid / Cards */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
          Loading enterprise projects...
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <FolderGit2 size={48} color="#94A3B8" />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
            No projects found
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '440px', margin: 0 }}>
            {search
              ? 'No projects match your search criteria. Try adjusting your query or filters.'
              : 'Add your first legacy software repository to begin generating autonomous modernization insights.'}
          </p>
          <Link to="/projects/new" className="btn-primary" style={{ marginTop: '8px' }}>
            <Plus size={16} />
            <span>Create New Project</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filtered.map((proj) => (
            <div
              key={proj.id}
              className="card"
              onClick={() => navigate(`/projects/${proj.id}`)}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '22px',
                position: 'relative',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <h3
                    style={{
                      fontSize: '16.5px',
                      fontWeight: 700,
                      color: '#0C0F14',
                      margin: '0 0 6px 0',
                      lineHeight: 1.3,
                    }}
                  >
                    {proj.name}
                  </h3>
                  {getStatusBadge(proj.status)}
                </div>

                <p
                  style={{
                    fontSize: '13px',
                    color: '#64748B',
                    lineHeight: 1.5,
                    margin: '0 0 14px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {proj.description}
                </p>

                {/* Tech Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                    {proj.language}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                    {proj.database}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                    {proj.type}
                  </span>
                </div>

                {/* Quick stats grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    padding: '10px 12px',
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>Files</span>
                    <strong style={{ color: '#0C0F14', fontSize: '13px' }}>{proj.filesCount}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>Rules</span>
                    <strong style={{ color: '#1A5CFF', fontSize: '13px' }}>{proj.businessRulesCount}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px' }}>Risks</span>
                    <strong style={{ color: proj.criticalRisksCount > 0 ? '#EF4444' : '#10B981', fontSize: '13px' }}>
                      {proj.criticalRisksCount}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Bottom Footer */}
              <div
                style={{
                  borderTop: '1px solid #F1F5F9',
                  paddingTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11.5px',
                  color: '#64748B',
                }}
              >
                <span>Updated {new Date(proj.lastUpdated).toLocaleDateString()}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    title="Re-analyse project"
                    disabled={analyzingId === proj.id}
                    onClick={(e) => handleReanalyze(proj.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#065F46',
                      padding: '4px',
                    }}
                  >
                    <RefreshCw size={14} className={analyzingId === proj.id ? 'animate-spin' : ''} />
                  </button>
                  <button
                    title="Delete project"
                    onClick={(e) => handleDelete(proj.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#EF4444',
                      padding: '4px',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1A5CFF', fontWeight: 600 }}>
                    Overview <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;

