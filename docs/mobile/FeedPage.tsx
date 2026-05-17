import { useNavigate } from 'react-router-dom';
import { useAnnouncements, markAnnouncementRead, toggleLike, useAnnouncementLike } from '../db/hooks';
import type { Announcement } from '../db/schema';

const USER_ID = sessionStorage.getItem('user_id') ?? '';

export default function FeedPage() {
  const announcements = useAnnouncements();
  const navigate = useNavigate();

  const handleOpen = (a: Announcement) => {
    markAnnouncementRead(a.id);
    navigate(`/announcement/${a.id}`);
  };

  return (
    <div className="page">
      <h1 className="page-title">Announcements</h1>

      {announcements?.length === 0 && (
        <div className="empty-state">No announcements yet</div>
      )}

      <div className="feed-list">
        {announcements?.map(a => (
          <AnnouncementCard key={a.id} item={a} onOpen={() => handleOpen(a)} />
        ))}
      </div>
    </div>
  );
}

function AnnouncementCard({ item, onOpen }: { item: Announcement; onOpen: () => void }) {
  const like = useAnnouncementLike(item.id);
  const isLiked = !!like;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't open detail
    toggleLike(item.id);
  };

  return (
    <article
      className={`card ${item.isRead ? 'card--read' : 'card--unread'}`}
      onClick={onOpen}
    >
      <div className="card-header">
        <span className="card-author">{item.authorName}</span>
        <span className="card-date">{formatDate(item.createdAt)}</span>
      </div>

      <h2 className="card-title">{item.title}</h2>
      <p className="card-body">{item.body}</p>

      <div className="card-footer">
        <div className="card-tags">
          {item.targetLevel && <span className="tag">{item.targetLevel}</span>}
          {item.targetRole && <span className="tag">{item.targetRole}</span>}
          {item.attachments?.length > 0 && (
            <span className="tag tag--attachment">
              📎 {item.attachments.length} file{item.attachments.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <button
          className={`btn-like ${isLiked ? 'btn-like--active' : ''}`}
          onClick={handleLike}
          aria-label={isLiked ? 'Unlike' : 'Like'}
        >
          {isLiked ? '❤️' : '🤍'} {item.likeCount > 0 ? item.likeCount : ''}
        </button>
      </div>
    </article>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
