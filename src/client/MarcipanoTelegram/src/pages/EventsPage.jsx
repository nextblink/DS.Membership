import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema.js';
import { api } from '../framework/api.js';

export default function EventsPage() {
  const navigate = useNavigate();
  const [canManage, setCanManage] = useState(false);

  const events = useLiveQuery(() => db.events.toArray(), []);
  const myMemberships = useLiveQuery(() => db.eventMemberships.toArray(), []);
  const myEventIds = new Set((myMemberships ?? []).map(m => m.eventId));

  useEffect(() => {
    api.get('/api/announcements/can-send')
      .then(r => setCanManage(r.canSend))
      .catch(() => {});
  }, []);

  const cardStyle = {
    backgroundColor: 'var(--color-surface)',
    borderRadius: '0.75rem',
    padding: '0.875rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  return (
    <div className="px-4 pt-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-base font-bold" style={{ color: 'var(--color-text)' }}>Events</h1>
        {canManage && (
          <button onClick={() => navigate('/events/new')}
            className="text-xs px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
            + New
          </button>
        )}
      </div>

      {!events || events.length === 0 ? (
        <p className="text-sm text-center mt-8" style={{ color: 'var(--color-hint)' }}>
          No events yet.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map(evt => (
            <button key={evt.id} onClick={() => navigate(`/events/${evt.id}`)}
              className="w-full text-left" style={cardStyle}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{evt.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-hint)' }}>
                  {evt.memberCount} {evt.memberCount === 1 ? 'member' : 'members'}
                  {!evt.isActive && ' · Closed'}
                </p>
              </div>
              {myEventIds.has(evt.id) && (
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-text)' }}>
                  Joined
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
