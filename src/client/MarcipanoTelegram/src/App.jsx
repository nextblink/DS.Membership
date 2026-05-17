import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { initTelegramAuth } from './framework/telegram.js';
import { auth } from './framework/auth.js';
import { startSyncLoop } from './sync/syncEngine.js';
import AppHeader from './components/AppHeader.jsx';
import SyncStatusBar from './components/SyncStatusBar.jsx';
import FeedPage from './pages/FeedPage.jsx';
import AnnouncementDetailPage from './pages/AnnouncementDetailPage.jsx';
import ComposePage from './pages/ComposePage.jsx';

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(auth.isAuthenticated());

  useEffect(() => {
    if (!authed) {
      initTelegramAuth().then((ok) => {
        setAuthed(ok || auth.isAuthenticated());
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
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        <span style={{ color: 'var(--color-hint)' }}>Unable to authenticate. Please open this app inside Telegram.</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppHeader />
      <SyncStatusBar />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<FeedPage />} />
          <Route path="/announcement/:id" element={<AnnouncementDetailPage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
