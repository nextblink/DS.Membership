import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema.js';
import { api } from '../framework/api.js';
import { sync } from '../sync/syncEngine.js';

export default function EventDetailPage() {
  const { id } = useParams();
  const eventId = parseInt(id, 10);

  const event = useLiveQuery(() => db.events.get(eventId), [eventId]);
  const membership = useLiveQuery(() => db.eventMemberships.get(eventId), [eventId]);
  const isMember = !!membership;

  const [canManage, setCanManage] = useState(false);
  const [members, setMembers] = useState([]);
  const [addInput, setAddInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/announcements/can-send')
      .then(r => setCanManage(r.canSend))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!canManage) return;
    api.get(`/api/events/${eventId}`)
      .then(r => setMembers(r.members ?? []))
      .catch(() => {});
  }, [eventId, canManage]);

  const toggleMembership = async () => {
    setLoading(true);
    setError('');
    try {
      if (isMember) {
        await api.delete(`/api/events/${eventId}/join`);
      } else {
        await api.post(`/api/events/${eventId}/join`);
      }
      await sync();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    const memberId = parseInt(addInput.trim(), 10);
    if (isNaN(memberId)) { setError('Enter a valid member ID.'); return; }
    setError('');
    try {
      await api.post(`/api/events/${eventId}/members`, { memberId });
      const updated = await api.get(`/api/events/${eventId}`);
      setMembers(updated.members ?? []);
      setAddInput('');
    } catch (e) {
      setError(e.message);
    }
  };

  const removeMember = async (memberId) => {
    try {
      await api.delete(`/api/events/${eventId}/members/${memberId}`);
      setMembers(prev => prev.filter(m => m.memberId !== memberId));
    } catch (e) {
      setError(e.message);
    }
  };

  if (!event) return (
    <div className="flex items-center justify-center min-h-screen" style={{ color: 'var(--color-hint)' }}>
      Loading…
    </div>
  );

  const inputStyle = {
    backgroundColor: 'var(--color-surface)', color: 'var(--color-text)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem', fontSize: '0.875rem', flex: 1,
  };

  return (
    <div className="px-4 pt-4 pb-24 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>{event.name}</h1>
        {event.description && (
          <p className="text-sm mt-1" style={{ color: 'var(--color-hint)' }}>{event.description}</p>
        )}
        {event.startDate && (
          <p className="text-xs mt-1" style={{ color: 'var(--color-hint)' }}>
            {new Date(event.startDate).toLocaleDateString()}
          </p>
        )}
        <p className="text-xs mt-1" style={{ color: 'var(--color-hint)' }}>
          {event.memberCount} {event.memberCount === 1 ? 'member' : 'members'}
          {!event.isActive && ' · Closed'}
        </p>
      </div>

      {event.isActive && (
        <button onClick={toggleMembership} disabled={loading}
          className="w-full py-2.5 rounded-xl text-sm font-semibold"
          style={{
            backgroundColor: isMember ? 'var(--color-surface)' : 'var(--color-accent)',
            color: isMember ? 'var(--color-text)' : 'var(--color-accent-text)',
            border: isMember ? '1px solid rgba(255,255,255,0.15)' : 'none',
            opacity: loading ? 0.6 : 1,
          }}>
          {loading ? '…' : isMember ? 'Leave' : 'Join'}
        </button>
      )}

      {error && <p className="text-xs" style={{ color: '#ef5350' }}>{error}</p>}

      {canManage && (
        <div className="pt-2 space-y-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--color-hint)' }}>MEMBERS</p>
          {members.map(m => (
            <div key={m.memberId} className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text)' }}>{m.displayName}</p>
                <p className="text-xs" style={{ color: 'var(--color-hint)' }}>
                  {m.selfSignup ? 'Self-signed up' : 'Added by organizer'}
                </p>
              </div>
              <button onClick={() => removeMember(m.memberId)}
                className="text-xs px-2 py-1 rounded"
                style={{ color: '#ef5350' }}>
                Remove
              </button>
            </div>
          ))}
          <form onSubmit={addMember} className="flex gap-2 pt-1">
            <input style={inputStyle} value={addInput} onChange={e => setAddInput(e.target.value)}
              placeholder="Member ID" type="number" />
            <button type="submit"
              className="text-xs px-3 py-1 rounded-lg font-medium"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
              Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
