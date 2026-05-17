import { useParams, useNavigate } from 'react-router-dom';
import { useAnnouncement, toggleLike, useAnnouncementLike } from '../db/hooks';
import type { Attachment } from '../db/schema';

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const announcement = useAnnouncement(id!);
  const like = useAnnouncementLike(id!);
  const isLiked = !!like;

  if (!announcement) {
    return (
      <div className="page">
        <div className="empty-state">Announcement not found</div>
      </div>
    );
  }

  return (
    <div className="page">
      <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>

      <div className="detail-header">
        <div className="card-header">
          <span className="card-author">{announcement.authorName}</span>
          <span className="card-date">
            {new Date(announcement.createdAt).toLocaleDateString(undefined, {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          </span>
        </div>

        <div className="card-tags" style={{ marginTop: 8 }}>
          {announcement.targetLevel && <span className="tag">{announcement.targetLevel}</span>}
          {announcement.targetRole && <span className="tag">{announcement.targetRole}</span>}
        </div>
      </div>

      <h1 className="detail-title">{announcement.title}</h1>

      <p className="detail-body">{announcement.body}</p>

      {announcement.attachments?.length > 0 && (
        <div className="attachments">
          <h3 className="attachments-title">Attachments</h3>
          <div className="attachment-list">
            {announcement.attachments.map(a => (
              <AttachmentItem key={a.id} attachment={a} />
            ))}
          </div>
        </div>
      )}

      <div className="detail-footer">
        <button
          className={`btn-like btn-like--large ${isLiked ? 'btn-like--active' : ''}`}
          onClick={() => toggleLike(announcement.id)}
        >
          {isLiked ? '❤️ Liked' : '🤍 Like'}
          {announcement.likeCount > 0 && (
            <span className="like-count">{announcement.likeCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const sizeLabel = attachment.fileSize > 1024 * 1024
    ? `${(attachment.fileSize / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(attachment.fileSize / 1024)} KB`;

  return (
    <a
      href={attachment.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="attachment-item"
      onClick={e => e.stopPropagation()}
    >
      <span className="attachment-icon">{fileIcon(attachment.mimeType)}</span>
      <div className="attachment-info">
        <span className="attachment-name">{attachment.fileName}</span>
        <span className="attachment-size">{sizeLabel}</span>
      </div>
      <span className="attachment-download">↓</span>
    </a>
  );
}

function fileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('word')) return '📝';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  return '📎';
}
