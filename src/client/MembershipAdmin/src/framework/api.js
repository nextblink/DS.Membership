// Axios HTTP client with JWT bearer interceptor + 401 handler.
import axios from 'axios'
import auth from './auth'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7226'

export const api = axios.create({
  baseURL,
})

api.interceptors.request.use((config) => {
  const token = auth.getToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      auth.logout()
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api
