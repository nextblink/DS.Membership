import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../framework/api.js';
import { sync } from '../sync/syncEngine.js';

export default function EventNewPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/events', {
        name: name.trim(),
        description: description.trim() || null,
        isActive,
        startDate: startDate || null,
      });
      await sync();
      navigate('/events');
    } catch {
      setError('Failed to create event.');
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
          <label style={labelStyle}>Name *</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Event name" />
        </div>
        <div>
          <label style={labelStyle}>Description (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this event about?" />
        </div>
        <div>
          <label style={labelStyle}>Start Date (optional)</label>
          <input style={inputStyle} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
          <label htmlFor="isActive" className="text-sm" style={{ color: 'var(--color-text)' }}>Open for sign-ups</label>
        </div>
        {error && <p className="text-xs" style={{ color: '#ef5350' }}>{error}</p>}
        <button type="submit" disabled={submitting}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
          {submitting ? 'Creating…' : 'Create Event'}
        </button>
      </form>
    </div>
  );
}
