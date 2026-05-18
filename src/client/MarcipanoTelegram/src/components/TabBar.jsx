import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', label: 'Feed' },
  { path: '/events', label: 'Events' },
];

export default function TabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'rgba(255,255,255,0.1)' }}>
      {tabs.map(tab => {
        const active = tab.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(tab.path);
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className="flex-1 py-3 text-sm font-medium transition-colors"
            style={{ color: active ? 'var(--color-accent)' : 'var(--color-hint)' }}>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
