import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { api } from '../framework/api.js';
import { db } from '../db/schema.js';
import { sync } from '../sync/syncEngine.js';

export default function ComposePage() {
  const navigate = useNavigate();
  const [canSend, setCanSend] = useState(null); // null = loading
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('committee'); // 'committee' | 'event'
  const [targetFunctionId, setTargetFunctionId] = useState('');
  const [targetEventId, setTargetEventId] = useState('');
  const [attachmentIds, setAttachmentIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const events = useLiveQuery(() => db.events.where('isActive').equals(1).toArray(), []);

  useEffect(() => {
    api.get('/api/announcements/can-send')
      .then(r => setCanSend(r.canSend))
      .catch(() => setCanSend(false));
  }, []);

  // Redirect non-senders away
  useEffect(() => {
    if (canSend === false) navigate('/');
  }, [canSend, navigate]);

  if (canSend === null) return null; // loading

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const result = await api.upload('/api/attachments/upload', file);
      setAttachmentIds(prev => [...prev, result.id]);
    } catch {
      setError('Failed to upload file.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) { setError('Title and body are required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await db.outbox.add({
        action: 'CREATE_ANNOUNCEMENT',
        payload: {
          title: title.trim(),
          body: body.trim(),
          targetFunctionId: targetType === 'committee' && targetFunctionId ? parseInt(targetFunctionId, 10) : null,
          targetEventId: targetType === 'event' && targetEventId ? parseInt(targetEventId, 10) : null,
          attachmentIds,
        },
        status: 'pending',
        createdAt: Date.now(),
      });
      await sync();
      navigate('/');
    } catch {
      setError('Failed to submit announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem',
    padding: '0.6rem 0.75rem', width: '100%', fontSize: '0.875rem',
  };
  const labelStyle = { fontSize: '0.75rem', color: 'var(--color-hint)', marginBottom: '0.25rem', display: 'block' };

  return (
    <div className="px-4 pt-4 pb-8 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label style={labelStyle}>Title *</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
        </div>

        <div>
          <label style={labelStyle}>Body *</label>
          <textarea style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
            value={body} onChange={e => setBody(e.target.value)} placeholder="Write your announcement…" />
        </div>

        <div>
          <label style={labelStyle}>Target</label>
          <select style={inputStyle} value={targetType} onChange={e => setTargetType(e.target.value)}>
            <option value="committee">My Committee</option>
            <option value="event">Event</option>
          </select>
        </div>

        {targetType === 'committee' && (
          <div>
            <label style={labelStyle}>Filter by Function (optional)</label>
            <input style={inputStyle} type="number" value={targetFunctionId}
              onChange={e => setTargetFunctionId(e.target.value)}
              placeholder="Leave blank for all members" />
          </div>
        )}

        {targetType === 'event' && (
          <div>
            <label style={labelStyle}>Event *</label>
            <select style={inputStyle} value={targetEventId} onChange={e => setTargetEventId(e.target.value)}>
              <option value="">Select an event…</option>
              {(events ?? []).map(evt => (
                <option key={evt.id} value={evt.id}>{evt.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={labelStyle}>Attachment (optional)</label>
          <input type="file" onChange={handleFileChange} disabled={uploading}
            style={{ ...inputStyle, cursor: 'pointer' }} />
          {attachmentIds.length > 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>
              {attachmentIds.length} file{attachmentIds.length !== 1 ? 's' : ''} attached
            </p>
          )}
        </div>

        {error && <p className="text-xs" style={{ color: '#ef5350' }}>{error}</p>}

        <button type="submit" disabled={submitting || uploading}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
          {submitting ? 'Sending…' : 'Publish Announcement'}
        </button>
      </form>
    </div>
  );
}
