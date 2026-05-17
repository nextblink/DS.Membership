import { api } from './api.js';
import { auth } from './auth.js';

export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null;
}

export async function initTelegramAuth() {
  const tg = getTelegramWebApp();

  if (!tg || !tg.initData) {
    console.warn('No Telegram WebApp initData — running in dev mode without auth.');
    return false;
  }

  tg.ready();
  tg.expand();

  try {
    const result = await api.post('/api/telegram/auth', { initData: tg.initData });
    auth.store({
      token: result.token,
      memberId: result.memberId,
      displayName: result.displayName,
      committeeId: result.committeeId,
      functionIds: result.functionIds,
    });
    return true;
  } catch {
    return false;
  }
}
