import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnnouncements } from '../db/hooks.js';

export default function FeedPage() {
  const navigate = useNavigate();
  const announcements = useAnnouncements() ?? [];

  return (
    <div className="px-4 pt-3 space-y-3">
      {announcements.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--color-hint)' }}>
          No announcements yet.
        </p>
      )}
      {announcements.map((ann) => (
        <button
          key={ann.id}
          onClick={() => navigate(`/announcement/${ann.id}`)}
          className="w-full text-left rounded-xl p-4 transition-opacity active:opacity-70"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--color-text)' }}>
            {ann.title}
          </p>
          <p className="text-xs line-clamp-2" style={{ color: 'var(--color-hint)' }}>
            {ann.body}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs" style={{ color: 'var(--color-hint)' }}>
              {new Date(ann.createdDate).toLocaleDateString()}
            </span>
            <span className="text-xs" style={{ color: ann.likedByMe ? 'var(--color-accent)' : 'var(--color-hint)' }}>
              ♥ {ann.likeCount}
            </span>
            {ann.attachments?.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--color-hint)' }}>
                📎 {ann.attachments.length}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
