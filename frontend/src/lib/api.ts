// API base URL configuration
// Use /api prefix to go through nginx proxy to backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Auth token helpers
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function setAuthToken(token: string) {
  localStorage.setItem('auth_token', token)
}

export function clearAuthToken() {
  localStorage.removeItem('auth_token')
}

// API fetch wrapper with auth
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
  
  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    clearAuthToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || `HTTP ${response.status}`)
  }

  return response
}

// Typed API methods
export const api = {
  get: async <T = any>(path: string): Promise<T> => {
    const res = await apiFetch(path, { method: 'GET' })
    return res.json()
  },

  post: async <T = any>(path: string, data?: any): Promise<T> => {
    const res = await apiFetch(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
    return res.json()
  },

  put: async <T = any>(path: string, data?: any): Promise<T> => {
    const res = await apiFetch(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
    return res.json()
  },

  delete: async <T = any>(path: string): Promise<T> => {
    const res = await apiFetch(path, { method: 'DELETE' })
    return res.json()
  },
}
