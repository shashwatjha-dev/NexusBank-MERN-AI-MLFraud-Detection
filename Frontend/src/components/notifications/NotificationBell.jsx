import { useEffect, useRef, useState, useCallback } from "react";
import NotificationList from "./NotificationList";
import { notificationsApi } from "../../services/notificationsApi";
import "./notifications.css";

/**
 * Bell icon + unread badge + dropdown panel.
 * Polls unread count every 30s. Refreshes list when the panel opens.
 * Drop this into your app header next to the profile menu.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const wrapperRef = useRef(null);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await notificationsApi.unreadCount();
      setUnread(data?.data?.unread ?? 0);
    } catch {
      /* silent */
    }
  }, []);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await notificationsApi.list({ limit: 15 });
      setItems(data?.data?.items || []);
      setUnread(data?.data?.unread ?? 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  useEffect(() => {
    function onDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleMarkRead = async (id) => {
    await notificationsApi.markRead(id);
    setItems((prev) =>
      prev.map((n) =>
        n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
      )
    );
    setUnread((u) => Math.max(0, u - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative" }} data-testid="notification-bell-wrapper">
      <button
        type="button"
        className="notif-bell"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        data-testid="notification-bell-button"
      >
        <svg className="notif-bell__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="notif-bell__badge" data-testid="notification-unread-badge">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications" data-testid="notification-panel">
          <div className="notif-panel__header">
            <span className="notif-panel__title">Notifications</span>
            <button
              type="button"
              className="notif-panel__mark"
              onClick={handleMarkAllRead}
              disabled={unread === 0}
              data-testid="notification-mark-all-read"
            >
              Mark all as read
            </button>
          </div>
          <NotificationList
            items={items}
            loading={loading}
            onMarkRead={handleMarkRead}
          />
        </div>
      )}
    </div>
  );
}