import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../framework/auth.js';
import { getTelegramWebApp } from '../framework/telegram.js';
import { useUnreadCount } from '../db/hooks.js';

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useUnreadCount() ?? 0;
  const isDetail = location.pathname.startsWith('/announcement/');
  const isCompose = location.pathname === '/compose';
  const tg = getTelegramWebApp();

  useEffect(() => {
    if (!tg) return;
    if (isDetail || isCompose) {
      tg.BackButton.show();
      tg.BackButton.onClick(() => navigate('/'));
    } else {
      tg.BackButton.hide();
    }
    return () => tg.BackButton.offClick(() => navigate('/'));
  }, [location.pathname, tg, navigate]);

  const initials = auth.getDisplayName().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
      style={{ backgroundColor: 'var(--color-surface)' }}>
      {isDetail || isCompose ? (
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {isCompose ? 'New Announcement' : 'Announcement'}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Marcipano</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        {!isDetail && !isCompose && (
          <button onClick={() => navigate('/compose')} className="text-xs px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
            + New
          </button>
        )}
        <div className="relative">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
            {initials || '?'}
          </div>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs"
              style={{ backgroundColor: '#e53935', color: '#fff' }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
