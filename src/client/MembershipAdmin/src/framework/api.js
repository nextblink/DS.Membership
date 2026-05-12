// HTTP client stub — to be implemented in a later issue.
import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
})

export default api
