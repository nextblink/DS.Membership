import api from '../framework/api'

const callCenterApi = {
  // Campaigns
  listCampaigns: (page = 1, pageSize = 20) =>
    api.get('/api/campaigns', { params: { page, pageSize } }).then(r => r.data),
  getCampaign: (id) => api.get(`/api/campaigns/${id}`).then(r => r.data),
  createCampaign: (body) => api.post('/api/campaigns', body).then(r => r.data),
  updateCampaign: (id, body) => api.put(`/api/campaigns/${id}`, body),
  deleteCampaign: (id) => api.delete(`/api/campaigns/${id}`),

  // Contacts
  listContacts: (params) => api.get('/api/call-contacts', { params }).then(r => r.data),
  // Returns a Blob (CSV of every row matching `params`, not just the current page).
  exportContacts: (params) => api.get('/api/call-contacts/export', { params, responseType: 'blob' }).then(r => r.data),
  myPools: () => api.get('/api/call-contacts/my-pools').then(r => r.data),
  getContact: (id) => api.get(`/api/call-contacts/${id}`).then(r => r.data),
  getNext: () => api.get('/api/call-contacts/next').then(r => r.status === 204 ? null : r.data),
  claim: (id) => api.post(`/api/call-contacts/${id}/claim`).then(r => r.data),
  saveOutcome: (id, body) => api.post(`/api/call-contacts/${id}/outcome`, body),
  releaseClaim: (id) => api.post(`/api/call-contacts/${id}/release`),
  matchSuggestions: (id) => api.get(`/api/call-contacts/${id}/match-suggestions`).then(r => r.data),
  linkMember: (id, memberId) => api.post(`/api/call-contacts/${id}/link/${memberId}`),
  unlinkMember: (id) => api.delete(`/api/call-contacts/${id}/link`),
  enrollmentPrefill: (id) => api.get(`/api/call-contacts/${id}/enrollment-prefill`).then(r => r.data),
  setConverted: (id, memberId) => api.post(`/api/call-contacts/${id}/converted/${memberId}`),
  importContacts: (campaignId, file) => {
    const form = new FormData()
    form.append('campaignId', campaignId)
    form.append('file', file)
    return api.post('/api/call-contacts/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  // Pools
  listPools: (campaignId) => api.get('/api/call-pools', { params: { campaignId } }).then(r => r.data),
  getPool: (id) => api.get(`/api/call-pools/${id}`).then(r => r.data),
  createPool: (body) => api.post('/api/call-pools', body).then(r => r.data),
  updatePool: (id, body) => api.put(`/api/call-pools/${id}`, body),
  deletePool: (id) => api.delete(`/api/call-pools/${id}`),
  refreshPool: (id) => api.post(`/api/call-pools/${id}/refresh`).then(r => r.data),
  bulkCreatePoolsByMunicipality: (campaignId) =>
    api.post('/api/call-pools/bulk-by-municipality', null, { params: { campaignId } }).then(r => r.data),
  previewPoolContactCount: (campaignId, municipalityIds, filterOutcome) => {
    // Built manually with URLSearchParams instead of axios's `params` object: axios serializes
    // array values as `municipalityIds[]=1&municipalityIds[]=2` by default, but ASP.NET Core's
    // [FromQuery] List<int> model binder only recognizes repeated bare keys
    // (`municipalityIds=1&municipalityIds=2`) — the bracketed form silently binds to an empty
    // list, which is why this looked "stuck" at the unfiltered count no matter what was selected.
    const params = new URLSearchParams()
    params.set('campaignId', campaignId)
    ;(municipalityIds ?? []).forEach((id) => params.append('municipalityIds', id))
    if (filterOutcome !== undefined && filterOutcome !== null) params.set('filterOutcome', filterOutcome)
    return api.get(`/api/call-pools/preview-count?${params.toString()}`).then(r => r.data)
  },
  setOperators: (id, userIds) => api.post(`/api/call-pools/${id}/operators`, { userIds }),
  removeOperator: (id, userId) => api.delete(`/api/call-pools/${id}/operators/${userId}`),

  // Reports
  getReport: (params) => api.get('/api/call-center/reports', { params }).then(r => r.data),
  // Returns a Blob — the CSV is built server-side so it carries every suggestion, not just
  // the capped list the page renders.
  exportReport: (params) => api.get('/api/call-center/reports/export', { params, responseType: 'blob' }).then(r => r.data),

  // Municipalities (for filter dropdowns)
  listMunicipalities: () => api.get('/api/municipalities').then(r => r.data),
}

export default callCenterApi
