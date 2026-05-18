import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initTelegramAuth, getInitData, getTelegramWebApp } from './framework/telegram.js';
import { auth } from './framework/auth.js';
import { startSyncLoop } from './sync/syncEngine.js';
import AppHeader from './components/AppHeader.jsx';
import SyncStatusBar from './components/SyncStatusBar.jsx';
import TabBar from './components/TabBar.jsx';
import FeedPage from './pages/FeedPage.jsx';
import AnnouncementDetailPage from './pages/AnnouncementDetailPage.jsx';
import ComposePage from './pages/ComposePage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import EventNewPage from './pages/EventNewPage.jsx';

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(auth.isAuthenticated());
  const [authError, setAuthError] = useState(null);
  const [phoneSubmitting, setPhoneSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!authed) {
      initTelegramAuth().then((result) => {
        if (result === true || auth.isAuthenticated()) {
          setAuthed(true);
        } else {
          setAuthError(result);
        }
        setReady(true);
      });
    } else {
      setReady(true);
    }
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    const id = startSyncLoop(30_000);
    return () => clearInterval(id);
  }, [authed]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <span style={{ color: 'var(--color-hint)' }}>Loading…</span>
      </div>
    );
  }

  if (!authed) {
    const isDev = import.meta.env.DEV;
    const inTelegram = !!getTelegramWebApp();
    const hasInitData = !!getInitData();

    const devAuth = () => {
      sessionStorage.setItem('access_token', 'dev')
      sessionStorage.setItem('user_id', '1')
      sessionStorage.setItem('user_name', 'Dev User')
      sessionStorage.setItem('committee_id', '1')
      sessionStorage.setItem('function_ids', '[]')
      setAuthed(true)
      setReady(true)
    }

    const sharePhone = async () => {
      const tg = getTelegramWebApp();
      setPhoneSubmitting(true);
      setPhoneError('');
      tg.requestContact(async (ok, data) => {
        console.log('[requestContact]', ok, JSON.stringify(data));
        if (!ok) {
          setPhoneError('Phone sharing cancelled.');
          setPhoneSubmitting(false);
          return;
        }
        const phone =
          data?.responseUnsafe?.contact?.phone_number  // Telegram SDK ≥ 6.9
          ?? data?.contact?.phone_number
          ?? tg.initDataUnsafe?.contact?.phone_number
          ?? null;
        if (!phone) {
          setPhoneError('Could not read phone number from Telegram.');
          setPhoneSubmitting(false);
          return;
        }
        const result = await initTelegramAuth(phone);
        if (result === true) {
          setAuthed(true);
        } else {
          setPhoneError(result === 'member_not_found'
            ? 'Phone not found in membership records.'
            : `Auth error: ${result}`);
        }
        setPhoneSubmitting(false);
      });
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-6" style={{ backgroundColor: 'var(--color-bg)' }}>
        {inTelegram && hasInitData ? (
          <>
            <p className="text-sm text-center" style={{ color: 'var(--color-text)' }}>
              Share your phone number to link your membership account.
            </p>
            {phoneError && <p className="text-xs text-center" style={{ color: '#ef5350' }}>{phoneError}</p>}
            <button onClick={sharePhone} disabled={phoneSubmitting}
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)', borderRadius: '0.5rem', padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 600, opacity: phoneSubmitting ? 0.6 : 1 }}>
              {phoneSubmitting ? 'Checking…' : 'Share Phone Number'}
            </button>
          </>
        ) : inTelegram ? (
          <span style={{ color: 'var(--color-hint)' }}>Bot not configured — open via the bot menu button.</span>
        ) : (
          <span style={{ color: 'var(--color-hint)' }}>Please open this app inside Telegram.</span>
        )}
        {isDev && !inTelegram && (
          <button onClick={devAuth}
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)', borderRadius: '0.5rem', padding: '0.5rem 1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
            Auth (dev)
          </button>
        )}
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppHeader />
      <SyncStatusBar />
      <main className="page-content pb-14">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/announcement/:id" element={<AnnouncementDetailPage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/new" element={<EventNewPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </BrowserRouter>
  );
}
