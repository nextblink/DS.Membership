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
  setOperators: (id, userIds) => api.post(`/api/call-pools/${id}/operators`, { userIds }),
  removeOperator: (id, userId) => api.delete(`/api/call-pools/${id}/operators/${userId}`),

  // Reports
  getReport: (params) => api.get('/api/call-center/reports', { params }).then(r => r.data),
}

export default callCenterApi
