import { NavLink } from 'react-router-dom';
import { useUnreadCount } from '../db/hooks';

export default function BottomNav() {
  const unread = useUnreadCount() ?? 0;

  return (
    <nav className="bottom-nav">
      <NavLink to="/feed" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
        <span className="nav-icon">📢</span>
        <span className="nav-label">Feed</span>
        {unread > 0 && <span className="nav-badge">{unread}</span>}
      </NavLink>

      <NavLink to="/compose" className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
        <span className="nav-icon">✏️</span>
        <span className="nav-label">Compose</span>
      </NavLink>
    </nav>
  );
}
