import React from 'react';
import { useParams } from 'react-router-dom';
import { useAnnouncement, toggleLike } from '../db/hooks.js';

export default function AnnouncementDetailPage() {
  const { id } = useParams();
  const ann = useAnnouncement(parseInt(id, 10));

  if (!ann) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span style={{ color: 'var(--color-hint)' }}>Loading…</span>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto">
      <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text)' }}>
        {ann.title}
      </h1>
      <p className="text-xs mb-4" style={{ color: 'var(--color-hint)' }}>
        {ann.authorName} · {new Date(ann.createdDate).toLocaleDateString()}
      </p>
      <p className="text-sm leading-relaxed mb-6 whitespace-pre-wrap" style={{ color: 'var(--color-text)' }}>
        {ann.body}
      </p>

      {ann.attachments?.length > 0 && (
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-hint)' }}>
            Attachments
          </p>
          {ann.attachments.map((att) => (
            <a
              key={att.id}
              href={att.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg p-3 text-sm"
              style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              <span>📎</span>
              <span className="truncate">{att.fileName}</span>
              <span className="ml-auto text-xs" style={{ color: 'var(--color-hint)' }}>
                {(att.fileSize / 1024).toFixed(0)} KB
              </span>
            </a>
          ))}
        </div>
      )}

      <button
        onClick={() => toggleLike(ann)}
        className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-opacity active:opacity-70"
        style={{
          backgroundColor: ann.likedByMe ? 'var(--color-accent)' : 'var(--color-surface)',
          color: ann.likedByMe ? 'var(--color-accent-text)' : 'var(--color-text)',
        }}
      >
        ♥ {ann.likeCount} {ann.likedByMe ? 'Liked' : 'Like'}
      </button>
    </div>
  );
}
