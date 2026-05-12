/**
 * Stable selectors used across the e2e suite. Prefer role/label/testId.
 * Centralized here so per-feature specs share one source of truth.
 */
export const selectors = {
  login: {
    form: '[data-testid="login-form"]',
    email: 'input#email',
    password: 'input#password',
    submit: '[data-testid="login-submit"]',
    error: '[data-testid="login-error"]',
  },
  header: {
    userMenuToggle: '[data-testid="user-menu-toggle"]',
    logout: '[data-testid="logout-button"]',
  },
} as const;
