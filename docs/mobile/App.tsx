import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { registerOnlineSync } from './sync/syncEngine';
import { registerPushNotifications, setupPushListeners } from './notifications/pushService';
import AppHeader from './components/AppHeader';
import SyncStatusBar from './components/SyncStatusBar';
import BottomNav from './components/BottomNav';
import FeedPage from './pages/FeedPage';
import AnnouncementDetailPage from './pages/AnnouncementDetailPage';
import ComposePage from './pages/ComposePage';
import './index.css';

function PushNavigationHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: Event) => {
      const route = (e as CustomEvent<{ route: string }>).detail.route;
      if (route) navigate(route);
    };
    window.addEventListener('push-navigate', handler);
    return () => window.removeEventListener('push-navigate', handler);
  }, [navigate]);
  return null;
}

export default function App() {
  useEffect(() => {
    registerOnlineSync();
    registerPushNotifications();
    const cleanup = setupPushListeners();
    return cleanup;
  }, []);

  return (
    <BrowserRouter>
      <PushNavigationHandler />
      <div className="app-shell">
        <AppHeader />
        <SyncStatusBar />

        <main className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/announcement/:id" element={<AnnouncementDetailPage />} />
            <Route path="/compose" element={<ComposePage />} />
          </Routes>
        </main>

        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
