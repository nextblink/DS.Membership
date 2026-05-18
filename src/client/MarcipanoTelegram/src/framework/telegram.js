import { api } from './api.js';
import { auth } from './auth.js';

export function getTelegramWebApp() {
  return window.Telegram?.WebApp ?? null;
}

function requestContact(tg) {
  return new Promise((resolve) => {
    tg.requestContact((ok, data) => {
      console.log('[TG] requestContact raw:', ok, JSON.stringify(data));
      if (!ok) { resolve(null); return; }
      resolve(data ?? tg.initDataUnsafe?.contact ?? true);
    });
  });
}

function extractPhone(contact, tg) {
  // Telegram SDK returns: { contact: { phone_number, ... }, authDate, hash }
  if (typeof contact === 'object' && contact !== null) {
    return contact.contact?.phone_number
      ?? contact.phone_number
      ?? null;
  }
  return tg.initDataUnsafe?.contact?.phone_number ?? null;
}

function buildInitDataWithContact(initData, phone) {
  if (!phone) return initData;
  const contactJson = JSON.stringify({ phone_number: phone });
  return `${initData}&contact=${encodeURIComponent(contactJson)}`;
}

export function getInitData() {
  return getTelegramWebApp()?.initData ?? null;
}

export async function initTelegramAuth(phone = null) {
  const tg = getTelegramWebApp();

  if (!tg || !tg.initData) {
    console.warn('No Telegram WebApp initData — running in dev mode without auth.');
    return false;
  }

  tg.ready();
  tg.expand();

  try {
    const result = await api.post('/api/telegram/auth', { initData: tg.initData, phone });
    auth.store({ token: result.token, memberId: result.memberId, displayName: result.displayName, committeeId: result.committeeId, functionIds: result.functionIds });
    return true;
  } catch (e) {
    let reason = 'need_phone';
    if (e?.response?.body?.reason) reason = e.response.body.reason;
    else if (e?.message) reason = e.message;
    return reason;
  }
}
