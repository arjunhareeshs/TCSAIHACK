export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export const ENDPOINTS = {
  PROJECTS: {
    LIST: '/api/v1/projects',
    CREATE: '/api/v1/projects',
    GET: (id: string) => `/api/v1/projects/${id}`,
    UPDATE: (id: string) => `/api/v1/projects/${id}`,
    DELETE: (id: string) => `/api/v1/projects/${id}`,
    ANALYZE: (id: string) => `/api/v1/projects/${id}/analyze`,
    MODULES: (id: string) => `/api/v1/projects/${id}/modules`,
    CHAT: (id: string) => `/api/v1/projects/${id}/chat`,
    REPORT: (id: string) => `/api/v1/projects/${id}/report`,
  },
  UPLOAD: {
    VALIDATE_SOURCE: '/api/v1/upload/validate',
    VALIDATE_EVIDENCE: '/api/v1/upload/evidence',
  },
  OBSERVABILITY: {
    FEEDBACK: '/api/feedback',
    METRICS: '/api/v1/metrics',
  },
};
