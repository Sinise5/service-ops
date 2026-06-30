import { apiFetch } from '../lib/api'

// API base — apiFetch already prepends /api via API_BASE_URL
const BASE = ''

async function request(path: string, options: RequestInit = {}, sshPassword?: string) {
  const headers = { ...options.headers } as Record<string, string>
  if (sshPassword) headers['X-SSH-Password'] = sshPassword
  const res = await apiFetch(`${BASE}${path}`, { ...options, headers })
  return res.json()
}

/** Login-password guarded operations (delete host) */
async function requestWithLogin(path: string, loginPassword: string, options: RequestInit = {}) {
  const headers = { ...options.headers } as Record<string, string>
  headers['X-Password'] = loginPassword
  const res = await apiFetch(`${BASE}${path}`, { ...options, headers })
  return res.json()
}

// Docker API wrapper
export const dockerApi = {
  // Hosts
  listHosts: () => request("/docker/hosts"),
  createHost: (data: any) => request("/docker/hosts", { method: "POST", body: JSON.stringify(data) }),
  getHost: (id: string) => request(`/docker/hosts/${id}`),
  updateHost: (id: string, data: any) => request(`/docker/hosts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteHost: (id: string, loginPassword?: string) =>
    loginPassword
      ? requestWithLogin(`/docker/hosts/${id}`, loginPassword, { method: "DELETE" })
      : request(`/docker/hosts/${id}`, { method: "DELETE" }),
  testHost: (id: string) => request(`/docker/hosts/${id}/test`, { method: "POST" }),

  // Containers
  listContainers: (hostId: string, all = true) => request(`/docker/hosts/${hostId}/containers?all=${all}`),
  inspectContainer: (hostId: string, containerId: string) => request(`/docker/hosts/${hostId}/containers/${containerId}/inspect`),
  containerStats: (hostId: string, containerId: string) => request(`/docker/hosts/${hostId}/containers/${containerId}/stats`),
  containerLogs: (hostId: string, containerId: string, tail = 100) => request(`/docker/hosts/${hostId}/containers/${containerId}/logs?tail=${tail}`),
  containerAction: (hostId: string, containerId: string, action: string) =>
    request(`/docker/hosts/${hostId}/containers/${containerId}/${action}`, { method: "POST" }),
  removeContainer: (hostId: string, containerId: string, sshPassword?: string) =>
    request(`/docker/hosts/${hostId}/containers/${containerId}`, { method: "DELETE" }, sshPassword),
  execContainer: (hostId: string, containerId: string, command: string) =>
    request(`/docker/hosts/${hostId}/containers/exec`, {
      method: "POST",
      body: JSON.stringify({ container_id: containerId, command }),
    }),
  scaleReplica: (hostId: string, containerId: string, replicas: number, composePath?: string) =>
    request(`/docker/hosts/${hostId}/containers/${containerId}/replica`, {
      method: "POST",
      body: JSON.stringify({ replicas, compose_path: composePath }),
    }),
  cloneContainer: (hostId: string, containerId: string, name: string) =>
    request(`/docker/hosts/${hostId}/containers/${containerId}/clone`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deployContainer: (hostId: string, data: any) =>
    request(`/docker/hosts/${hostId}/deploy`, { method: "POST", body: JSON.stringify(data) }),

  // Images
  listImages: (hostId: string) => request(`/docker/hosts/${hostId}/images`),
  pullImage: (hostId: string, image: string) =>
    request(`/docker/hosts/${hostId}/images/pull`, { method: "POST", body: JSON.stringify({ image }) }),
  removeImage: (hostId: string, imageId: string, force = false, sshPassword?: string) =>
    request(`/docker/hosts/${hostId}/images/${imageId}?force=${force}`, { method: "DELETE" }, sshPassword),
  bulkRemoveImages: (hostId: string, imageIds: string[], sshPassword?: string) =>
    request(`/docker/hosts/${hostId}/images/bulk-delete`, { method: "POST", body: JSON.stringify({ image_ids: imageIds }) }, sshPassword),

  // Volumes
  listVolumes: (hostId: string) => request(`/docker/hosts/${hostId}/volumes`),
  removeVolume: (hostId: string, name: string) =>
    request(`/docker/hosts/${hostId}/volumes/${encodeURIComponent(name)}`, { method: "DELETE" }),

  // Compose
  listCompose: (hostId: string) => request(`/docker/hosts/${hostId}/compose/projects`),
  addCompose: (hostId: string, data: any) =>
    request(`/docker/hosts/${hostId}/compose/projects`, { method: "POST", body: JSON.stringify(data) }),
  composeUp: (hostId: string, projectId: string) =>
    request(`/docker/hosts/${hostId}/compose/${projectId}/up`, { method: "POST" }),
  composeDown: (hostId: string, projectId: string, sshPassword?: string) =>
    request(`/docker/hosts/${hostId}/compose/${projectId}/down`, { method: "POST" }, sshPassword),
  composeRestart: (hostId: string, projectId: string) =>
    request(`/docker/hosts/${hostId}/compose/${projectId}/restart`, { method: "POST" }),
  composeScale: (hostId: string, projectId: string, service: string, replicas: number) =>
    request(`/docker/hosts/${hostId}/compose/${projectId}/scale`, {
      method: "POST",
      body: JSON.stringify({ service, replicas }),
    }),
  composeConfig: (hostId: string, projectId: string) =>
    request(`/docker/hosts/${hostId}/compose/${projectId}/config`),
  composeReadFile: (hostId: string, projectId: string) =>
    request(`/docker/hosts/${hostId}/compose/${projectId}/file`),
  composeWriteFile: (hostId: string, projectId: string, content: string) =>
    request(`/docker/hosts/${hostId}/compose/${projectId}/file`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    }),

  // Templates
  listTemplates: () => request("/docker/templates"),
  createTemplate: (data: any) => request("/docker/templates", { method: "POST", body: JSON.stringify(data) }),
  deleteTemplate: (id: string) => request(`/docker/templates/${id}`, { method: "DELETE" }),

  // System / Bulk
  systemPrune: (hostId: string, target = "all", sshPassword?: string) =>
    request(`/docker/hosts/${hostId}/prune?target=${target}`, { method: "POST" }, sshPassword),
  bulkContainerAction: (hostId: string, containerIds: string[], action: string, sshPassword?: string) =>
    request(`/docker/hosts/${hostId}/containers/bulk`, {
      method: "POST", body: JSON.stringify({ container_ids: containerIds, action }),
    }, sshPassword),

  // Saved logs
  getSavedLogs: (hostId: string, containerId: string, limit = 100) =>
    request(`/docker/hosts/${hostId}/containers/${containerId}/logs/saved?limit=${limit}`),
  saveLogs: (data: any) => request("/docker/logs/save", { method: "POST", body: JSON.stringify(data) }),
}
