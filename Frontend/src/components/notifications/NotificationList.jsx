/**
 * Presentational component: renders the list rows for NotificationBell.
 * Kept separate so a future Batch (e.g. a full /notifications page) can
 * reuse the same rows without duplicating markup.
 */
function formatRelative(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN");
}

export default function NotificationList({ items, loading, onMarkRead }) {
  if (loading) {
    return <div className="notif-empty" data-testid="notification-loading">Loading…</div>;
  }
  if (!items || items.length === 0) {
    return (
      <div className="notif-empty" data-testid="notification-empty">
        You’re all caught up 🎉
      </div>
    );
  }
  return (
    <div className="notif-list" data-testid="notification-list">
      {items.map((n) => (
        <button
          key={n._id}
          type="button"
          className={`notif-item ${n.read ? "" : "unread"}`}
          onClick={() => !n.read && onMarkRead(n._id)}
          data-testid={`notification-item-${n._id}`}
        >
          <span className={`notif-item__dot ${n.priority || "INFO"}`} />
          <span className="notif-item__body">
            <p className="notif-item__title">{n.title}</p>
            <p className="notif-item__text">{n.body}</p>
            <span className="notif-item__time">{formatRelative(n.createdAt)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}