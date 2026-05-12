// Authentication service — JWT stored in localStorage per spec.
import axios from 'axios'

const TOKEN_KEY = 'auth.token'
const USER_KEY = 'auth.user'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7226'

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const auth = {
  async login(email, password) {
    const response = await axios.post(`${baseURL}/api/auth/login`, { email, password })
    const { token, user } = response.data || {}
    if (!token) {
      throw new Error('Invalid login response: missing token')
    }
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user ?? null))
    return { token, user }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY)
  },

  getUser() {
    return readUser()
  },

  getRole() {
    return readUser()?.role ?? null
  },

  getOrgUnitId() {
    return readUser()?.orgUnitId ?? null
  },

  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY)
  },
}

export default auth
