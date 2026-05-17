import { useNavigate, useLocation } from 'react-router-dom';
import { useUnreadCount } from '../db/hooks';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export default function AppHeader({ title, subtitle, showBack }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const unread = useUnreadCount() ?? 0;

  const isDetail  = location.pathname.startsWith('/announcement/');
  const isCompose = location.pathname === '/compose';

  const displayTitle    = title    ?? (isDetail ? 'Announcement' : isCompose ? 'New announcement' : 'Marcipano Community');
  const displaySubtitle = subtitle ?? (isDetail ? '' : isCompose ? 'Marcipano Community' : 'National · Leader');
  const displayBack     = showBack ?? isDetail;

  return (
    <header className="app-header">
      <div className="app-header-left">
        {displayBack && (
          <button
            className="app-header-back"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            ←
          </button>
        )}
        <div className="app-logo" aria-hidden="true">M</div>
        <div className="app-header-title-block">
          <span className="app-header-title">{displayTitle}</span>
          {displaySubtitle && (
            <span className="app-header-sub">{displaySubtitle}</span>
          )}
        </div>
      </div>

      <div className="app-header-right">
        {!displayBack && (
          <button className="app-header-icon-btn" aria-label="Notifications">
            <span className="app-header-bell-icon">🔔</span>
            {unread > 0 && (
              <span className="app-header-notif-dot" aria-hidden="true" />
            )}
          </button>
        )}
        <div className="app-avatar" aria-label="Profile">
          {getInitials(sessionStorage.getItem('user_name') ?? 'U')}
        </div>
      </div>
    </header>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
