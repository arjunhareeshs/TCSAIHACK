export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

export const ENDPOINTS = {
  PROJECTS: {
    LIST: '/api/v1/projects',
    CREATE: '/api/v1/projects',
    GET: (id: string) => `/api/v1/projects/${id}`,
    SOURCE: (id: string) => `/api/v1/projects/${id}/source`,
    INVENTORY: (id: string) => `/api/v1/projects/${id}/inventory`,
    UPDATE: (id: string) => `/api/v1/projects/${id}`,
    DELETE: (id: string) => `/api/v1/projects/${id}`,
    ANALYZE: (id: string) => `/api/v1/projects/${id}/analyze`,
    MODULES: (id: string) => `/api/v1/projects/${id}/modules`,
    CHAT: (id: string) => `/api/v1/projects/${id}/chat`,
    REPORT: (id: string) => `/api/v1/projects/${id}/report`,
  },
  GITHUB: {
    REPOSITORIES: (username: string) => `/api/v1/github/${encodeURIComponent(username)}/repositories`,
    CLONE: '/api/v1/github/clone',
  },
  UPLOAD: {
    PROJECT: '/api/v1/projects/upload',
  },
  OBSERVABILITY: {
    FEEDBACK: '/api/feedback',
    METRICS: '/api/v1/metrics',
  },
};
