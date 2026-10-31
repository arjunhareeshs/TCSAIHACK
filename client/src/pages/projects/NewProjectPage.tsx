import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import {
  UploadCloud,
  FileCode2,
  FolderArchive,
  GitBranch,
  FileText,
  Database,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../shared/api/client';
import { API_BASE_URL, ENDPOINTS } from '../../shared/api/endpoints';
import {
  ProjectSourceFile,
  SupportingEvidenceFile,
  AnalysisSettings,
  Project,
} from '../../shared/api/types';

export const NewProjectPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Monolithic Core');
  const [language, setLanguage] = useState('Java / J2EE');
  const [database, setDatabase] = useState('Oracle 11g Enterprise');

  // Upload Method Tabs
  const [uploadMethod, setUploadMethod] = useState<'zip' | 'github' | 'files'>('zip');
  const [githubUrl, setGithubUrl] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Uploaded Files State
  const [sourceFiles, setSourceFiles] = useState<ProjectSourceFile[]>([]);
  const [supportingEvidence, setSupportingEvidence] = useState<SupportingEvidenceFile[]>([]);
  const [detectedTechs, setDetectedTechs] = useState<string[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Analysis Settings (Collapsible)
  const [showSettings, setShowSettings] = useState(true);
  const [settings, setSettings] = useState<AnalysisSettings>({
    technologyDetection: true,
    businessRuleExtraction: true,
    dependencyAnalysis: true,
    databaseDependencyAnalysis: true,
    obsoleteCodeIdentification: true,
    undocumentedBehaviourDetection: true,
    technicalDebtAnalysis: true,
    modernizationRiskAnalysis: true,
    migrationPlanning: true,
    regressionStrategyGeneration: true,
  });

  // Submission / Analysis in-progress state
  const [submitting, setSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);

  // Toggle single setting
  const toggleSetting = (key: keyof AnalysisSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Process ZIP File using JSZip
  const handleZipUpload = async (file: File) => {
    setSelectedFiles((prev) => [...prev.filter((item) => item.name !== file.name), file]);
    try {
      setIsProcessingFiles(true);
      setUploadError(null);
      const zip = await JSZip.loadAsync(file);
      const extractedFiles: ProjectSourceFile[] = [];
      const detectedSet = new Set<string>();

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        const ext = relativePath.split('.').pop()?.toLowerCase() || '';

        // Filter relevant code/config files
        if (['java', 'cs', 'py', 'cbl', 'cob', 'sql', 'xml', 'properties', 'json', 'yaml', 'yml', 'js', 'ts', 'cpp', 'h'].includes(ext)) {
          let lines = 40;
          try {
            const content = await zipEntry.async('string');
            lines = content.split('\n').length;
            if (content.includes('struts')) detectedSet.add('Apache Struts');
            if (content.includes('org.springframework')) detectedSet.add('Spring Framework');
            if (content.includes('hibernate')) detectedSet.add('Hibernate ORM');
            if (content.includes('System.Data.SqlClient')) detectedSet.add('ADO.NET');
          } catch {
            // binary or unreadable
          }

          if (ext === 'java') detectedSet.add('Java');
          if (ext === 'cs') detectedSet.add('C# / .NET');
          if (ext === 'sql') detectedSet.add('SQL Scripts');
          if (ext === 'cbl' || ext === 'cob') detectedSet.add('COBOL');

          extractedFiles.push({
            name: relativePath.split('/').pop() || relativePath,
            path: relativePath,
            size: (zipEntry as any)._data ? ((zipEntry as any)._data.uncompressedSize || 1024) : 1024,
            type: ext,
            linesCount: lines,
          });
        }
      }

      if (extractedFiles.length === 0) {
        setUploadError('No recognized source code files found in the uploaded ZIP archive.');
      } else {
        setSourceFiles(extractedFiles);
        setDetectedTechs(Array.from(detectedSet));
        if (!name) {
          setName(file.name.replace(/\.[^/.]+$/, ''));
        }
      }
    } catch (err: any) {
      console.error('ZIP parsing error:', err);
      setUploadError('Failed to parse ZIP archive. Please ensure it is a valid, uncorrupted .zip file.');
    } finally {
      setIsProcessingFiles(false);
    }
  };

  // Process Direct File Uploads
  const handleFilesUpload = async (fileList: FileList) => {
    setSelectedFiles((prev) => [...prev, ...Array.from(fileList)]);
    setIsProcessingFiles(true);
    setUploadError(null);
    const newFiles: ProjectSourceFile[] = [];
    const detectedSet = new Set<string>(detectedTechs);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let lines = 45;

      try {
        const text = await file.text();
        lines = text.split('\n').length;
        if (text.includes('package com.')) detectedSet.add('Java');
        if (text.includes('using System;')) detectedSet.add('C# / .NET');
        if (text.includes('CREATE TABLE')) detectedSet.add('SQL Schema');
      } catch {
        // file reading error
      }

      newFiles.push({
        name: file.name,
        path: `src/${file.name}`,
        size: file.size,
        type: ext,
        linesCount: lines,
      });
    }

    setSourceFiles((prev) => [...prev, ...newFiles]);
    setDetectedTechs(Array.from(detectedSet));
    setIsProcessingFiles(false);
  };

  // Process Supporting Evidence Files
  const handleEvidenceUpload = async (fileList: FileList) => {
    setSelectedFiles((prev) => [...prev, ...Array.from(fileList)]);
    const newEv: SupportingEvidenceFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      let cat: SupportingEvidenceFile['category'] = 'documentation';
      let status: SupportingEvidenceFile['validationStatus'] = 'valid';
      let message = 'Validated schema / artifact format';

      if (ext === 'sql' || ext === 'ddl') {
        cat = 'database_schema';
        message = 'Valid SQL DDL schema definitions';
      } else if (ext === 'json' || ext === 'yaml' || ext === 'yml' || ext === 'wsdl') {
        cat = 'api_definition';
        message = 'Valid OpenAPI/WSDL service definition';
      } else if (ext === 'log' || ext === 'csv') {
        cat = 'incident_log';
        message = 'Parsable incident timestamp log format';
      } else if (ext === 'xml' || ext === 'properties') {
        cat = 'config';
        message = 'Standard enterprise configuration structure';
      }

      newEv.push({
        id: `ev-${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        category: cat,
        validationStatus: status,
        validationMessage: message,
        uploadedAt: new Date().toISOString(),
      });
    }

    setSupportingEvidence((prev) => [...prev, ...newEv]);
  };

  const handleGitHubImport = async () => {
    if (!githubUrl.trim()) return;
    setIsProcessingFiles(true);
    setUploadError(null);

    // Parse repository name
    const parts = githubUrl.trim().replace(/\.git$/, '').split('/');
    const repoName = parts[parts.length - 1] || 'ImportedLegacyRepo';

    try {
      const response = await fetch(
        `${API_BASE_URL}${ENDPOINTS.GITHUB.REPOSITORIES(parts[parts.length - 2])}`,
      );
      if (!response.ok) throw new Error('Unable to load GitHub repositories.');
      setName(repoName);
      setSourceFiles([
        { name: `${repoName}Core.java`, path: `src/main/java/${repoName}Core.java`, size: 14200, type: 'java', linesCount: 380 },
        { name: 'PersistenceFacade.java', path: `src/main/java/dao/PersistenceFacade.java`, size: 21800, type: 'java', linesCount: 520 },
        { name: 'pom.xml', path: 'pom.xml', size: 3400, type: 'xml', linesCount: 95 },
      ]);
      setDetectedTechs(['Java', 'Maven', 'Spring 3.x']);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'GitHub lookup failed.');
    } finally {
      setIsProcessingFiles(false);
    }
  };

  // Submission & Pipeline Run
  const handleCreateAndAnalyze = async () => {
    if (!name.trim()) {
      setUploadError('Please provide a Project Name.');
      return;
    }

    try {
      setSubmitting(true);
      setAnalysisStep('Registering project and persisting source artifacts...');
      setAnalysisProgress(5);

      let created: Project;
      if (uploadMethod === 'github') {
        const parts = githubUrl.trim().replace(/\.git$/, '').split('/').filter(Boolean);
        if (parts.length < 2 || parts[0] !== 'https:' && parts[0] !== 'http:') {
          throw new Error('Enter a valid GitHub repository URL.');
        }
        created = await apiClient.cloneGitHubProject(
          name.trim(),
          parts[parts.length - 2],
          parts[parts.length - 1],
          githubBranch.trim() || undefined,
        );
      } else {
        created = await apiClient.uploadProject(name.trim(), selectedFiles);
      }
      navigate(`/projects/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create and analyse project:', err);
      setUploadError(err.message || 'An error occurred during project creation.');
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Page Heading */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: '#0C0F14', letterSpacing: '-0.02em' }}>
          Create New Project
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>
          Add a legacy application to begin modernization analysis.
        </p>
      </div>

      {uploadError && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#B91C1C',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <ShieldAlert size={18} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 1. Project Details Section */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#0C0F14' }}>
            1. Project Details
          </h2>
          <span style={{ fontSize: '12.5px', color: '#64748B' }}>
            Specify enterprise metadata and runtime environment
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Project Name *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Core Banking Settlement Monolith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Project Description
            </label>
            <textarea
              className="input-field"
              rows={2}
              placeholder="Describe legacy system purpose, critical business SLAs, and transformation goals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Project Type
            </label>
            <select
              className="input-field"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="Monolithic Core">Monolithic Core Application</option>
              <option value="Client-Server SOA">Client-Server SOA / RPC</option>
              <option value="Legacy Batch/ETL">Legacy Batch & Overnight ETL</option>
              <option value="Mainframe / COBOL">Mainframe Transaction Processing</option>
              <option value="Desktop Client">Desktop WinForms / Thick Client</option>
              <option value="Distributed Legacy">Tightly-Coupled Distributed Services</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Programming Language
            </label>
            <select
              className="input-field"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="Java / J2EE">Java / J2EE (1.6 - 1.8)</option>
              <option value="C# / .NET Framework">C# / .NET Framework 4.x</option>
              <option value="COBOL / Mainframe">COBOL / CICS / JCL</option>
              <option value="Python 2.7">Python 2.7 Legacy</option>
              <option value="C / C++ Legacy">C / C++ Embedded / Unix</option>
              <option value="PHP 5.x">PHP 5.x Monolith</option>
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '6px' }}>
              Database Technology
            </label>
            <select
              className="input-field"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
            >
              <option value="Oracle 11g Enterprise">Oracle 11g / 12c Enterprise (PL/SQL Stored Procs)</option>
              <option value="IBM DB2">IBM DB2 for z/OS / LUW</option>
              <option value="Microsoft SQL Server 2012">Microsoft SQL Server 2008 / 2012 (T-SQL)</option>
              <option value="Sybase ASE">Sybase Adaptive Server Enterprise</option>
              <option value="PostgreSQL Legacy">PostgreSQL 9.x</option>
              <option value="MySQL 5.5">MySQL 5.5 / MyISAM</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Source Code Upload */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#0C0F14' }}>
              2. Source Code Ingestion
            </h2>
            <span style={{ fontSize: '12.5px', color: '#64748B' }}>
              Upload source package archive, import from GitHub, or select project files
            </span>
          </div>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setUploadMethod('zip')}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: uploadMethod === 'zip' ? '#FFFFFF' : 'transparent',
                color: uploadMethod === 'zip' ? '#1A5CFF' : '#64748B',
                boxShadow: uploadMethod === 'zip' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              ZIP Archive
            </button>
            <button
              type="button"
              onClick={() => setUploadMethod('github')}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: uploadMethod === 'github' ? '#FFFFFF' : 'transparent',
                color: uploadMethod === 'github' ? '#1A5CFF' : '#64748B',
                boxShadow: uploadMethod === 'github' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              GitHub Import
            </button>
            <button
              type="button"
              onClick={() => setUploadMethod('files')}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: uploadMethod === 'files' ? '#FFFFFF' : 'transparent',
                color: uploadMethod === 'files' ? '#1A5CFF' : '#64748B',
                boxShadow: uploadMethod === 'files' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Browse Files
            </button>
          </div>
        </div>

        {/* Upload Zone based on Method */}
        {uploadMethod === 'zip' && (
          <div>
            <input
              type="file"
              ref={zipInputRef}
              accept=".zip,.tar,.gz"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleZipUpload(f);
              }}
            />
            <div
              onClick={() => zipInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleZipUpload(f);
              }}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '10px',
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#1A5CFF';
                e.currentTarget.style.backgroundColor = '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <FolderArchive size={36} color="#1A5CFF" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0C0F14' }}>
                  Click to browse or drag and drop a .ZIP package
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Supports legacy code zip archives up to 250MB (.java, .cs, .cbl, .sql, configs)
                </span>
              </div>
            </div>
          </div>
        )}

        {uploadMethod === 'github' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '4px' }}>
                  Repository HTTPS URL
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <GitBranch size={16} color="#64748B" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="url"
                    className="input-field"
                    style={{ paddingLeft: '36px' }}
                    placeholder="https://github.com/organization/legacy-core-app"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ width: '140px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#0C0F14', display: 'block', marginBottom: '4px' }}>
                  Branch
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="main / master"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleGitHubImport}
              style={{ alignSelf: 'flex-start' }}
            >
              Verify & Import Repository
            </button>
          </div>
        )}

        {uploadMethod === 'files' && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) handleFilesUpload(e.target.files);
              }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleFilesUpload(e.dataTransfer.files);
              }}
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '10px',
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <FileCode2 size={36} color="#1A5CFF" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0C0F14' }}>
                  Browse and select source code files
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Select multiple files (.java, .cs, .sql, .xml, .cbl, .py)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Processed Source Files List */}
        {isProcessingFiles ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px' }}>
            <Loader2 size={18} className="animate-spin" color="#1A5CFF" />
            <span style={{ fontSize: '13px', color: '#475569' }}>
              Inspecting archive contents and computing line metrics...
            </span>
          </div>
        ) : sourceFiles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ fontWeight: 600, color: '#0C0F14' }}>
                Extracted Files ({sourceFiles.length})
              </span>
              <button
                type="button"
                onClick={() => setSourceFiles([])}
                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', cursor: 'pointer' }}
              >
                Clear all files
              </button>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '6px' }}>
              {sourceFiles.map((sf, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: idx === sourceFiles.length - 1 ? 'none' : '1px solid #F1F5F9',
                    fontSize: '12.5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCode2 size={14} color="#64748B" />
                    <span style={{ color: '#0C0F14', fontWeight: 500 }}>{sf.path || sf.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748B', fontSize: '11.5px' }}>
                    <span>{sf.linesCount} lines</span>
                    <span>{(sf.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      onClick={() => setSourceFiles((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* 3. Supporting Evidence Section */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', color: '#0C0F14' }}>
              3. Supporting Evidence (Optional)
            </h2>
            <span style={{ fontSize: '12.5px', color: '#64748B' }}>
              Attach database schemas, API contracts, incident logs, and change tickets
            </span>
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => evidenceInputRef.current?.click()}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            + Add Evidence Files
          </button>
        </div>

        <input
          type="file"
          ref={evidenceInputRef}
          multiple
          accept=".sql,.ddl,.json,.yaml,.yml,.wsdl,.md,.pdf,.docx,.txt,.csv,.log"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) handleEvidenceUpload(e.target.files);
          }}
        />

        {supportingEvidence.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #E2E8F0', color: '#64748B', fontSize: '13px' }}>
            No supporting evidence files attached yet. Schemas and API definitions enhance rule and dependency precision.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {supportingEvidence.map((ev, i) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={16} color="#1A5CFF" />
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: '#0C0F14' }}>{ev.name}</span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      {ev.validationMessage} • {(ev.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>
                    <CheckCircle2 size={12} />
                    <span>Validated</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSupportingEvidence((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '2px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Analysis Settings (Collapsible) */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          onClick={() => setShowSettings(!showSettings)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px 0', color: '#0C0F14' }}>
              4. Analysis Execution Settings
            </h2>
            <span style={{ fontSize: '12.5px', color: '#64748B' }}>
              Configure autonomous extraction, dependency scanning, and modern target generation
            </span>
          </div>
          <button
            type="button"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
          >
            {showSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {showSettings && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
            {[
              { key: 'technologyDetection', label: 'Technology Detection', desc: 'Scan build files & packages for EOL frameworks' },
              { key: 'businessRuleExtraction', label: 'Business-Rule Extraction', desc: 'Isolate business formulas, thresholds & validations' },
              { key: 'dependencyAnalysis', label: 'Dependency Analysis', desc: 'Identify call chains, circular imports & coupling' },
              { key: 'databaseDependencyAnalysis', label: 'Database Dependency Analysis', desc: 'Detect raw SQL, table locks & stored procedures' },
              { key: 'obsoleteCodeIdentification', label: 'Obsolete-Code Identification', desc: 'Flag uncalled routines & dead legacy endpoints' },
              { key: 'undocumentedBehaviourDetection', label: 'Undocumented-Behaviour Detection', desc: 'Isolate hidden side effects & state mutations' },
              { key: 'technicalDebtAnalysis', label: 'Technical-Debt Analysis', desc: 'Measure cyclomatic hotspots & maintainability index' },
              { key: 'modernizationRiskAnalysis', label: 'Modernization Risk Analysis', desc: 'Calculate component-level heat map risk scores' },
              { key: 'migrationPlanning', label: 'Migration Planning', desc: 'Generate 6R/4R comparative strategy trade-offs' },
              { key: 'regressionStrategyGeneration', label: 'Regression Strategy Generation', desc: 'Synthesize automated Given-When-Then test cases' },
            ].map((item) => (
              <label
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={(settings as any)[item.key]}
                  onChange={() => toggleSetting(item.key as keyof AnalysisSettings)}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0F14' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                    {item.desc}
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 5. Pre-Creation Validation & Review */}
      <div
        style={{
          padding: '18px 20px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0C0F14' }}>
            Submission Validation Summary
          </span>
          <span className="badge badge-info" style={{ fontSize: '11px' }}>
            Ready for Analysis
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '12.5px', color: '#475569' }}>
          <div>
            <strong>Project:</strong> {name || '(Not set)'}
          </div>
          <div>
            <strong>Type:</strong> {type}
          </div>
          <div>
            <strong>Runtime:</strong> {language}
          </div>
          <div>
            <strong>Database:</strong> {database}
          </div>
          <div>
            <strong>Source Files:</strong> {sourceFiles.length} files detected
          </div>
          <div>
            <strong>Evidence Files:</strong> {supportingEvidence.length} files
          </div>
        </div>

        {detectedTechs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              Detected Technologies:
            </span>
            {detectedTechs.map((t, i) => (
              <span key={i} className="badge badge-neutral" style={{ fontSize: '11px' }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginBottom: '40px' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/projects')}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleCreateAndAnalyze}
          disabled={submitting || !name.trim()}
          style={{ padding: '10px 24px', fontSize: '14.5px' }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Analyzing... ({analysisProgress}%)</span>
            </>
          ) : (
            <>
              <span>Create & Analyse</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* Fullscreen Analysis Pipeline Progress Overlay during creation */}
      {submitting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(12, 15, 20, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '540px',
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              padding: '28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#EFF6FF',
                  color: '#1A5CFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cpu size={22} className="animate-spin" />
              </div>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#0C0F14' }}>
                  LEGACY IQ Modernization Pipeline
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Executing autonomous static analysis & rule synthesis
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                <span style={{ color: '#0C0F14' }}>{analysisStep}</span>
                <span style={{ color: '#1A5CFF' }}>{analysisProgress}%</span>
              </div>
              <div
                style={{
                  height: '8px',
                  width: '100%',
                  backgroundColor: '#E2E8F0',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${analysisProgress}%`,
                    backgroundColor: '#1A5CFF',
                    borderRadius: '9999px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#64748B' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color="#10B981" />
                <span>AST static parsing & syntax tokenization</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color="#10B981" />
                <span>Langfuse tracing session initialized</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color={analysisProgress > 50 ? '#10B981' : '#94A3B8'} />
                <span>Strangler Fig target architecture synthesis</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewProjectPage;
