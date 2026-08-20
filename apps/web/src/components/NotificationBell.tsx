import { useEffect, useRef, useState } from "react";
import { notifications } from "../api/endpoints.js";
import type { Notification } from "../api/types.js";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function refreshUnreadCount() {
    try {
      const { count } = await notifications.unreadCount();
      setUnreadCount(count);
    } catch {
      // Non-fatal — the badge just stays stale until the next poll.
    }
  }

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function togglePanel() {
    const next = !open;
    setOpen(next);

    if (next) {
      setLoading(true);
      try {
        const { notifications: list } = await notifications.list();
        setItems(list);
      } catch {
        // Non-fatal — panel just shows nothing.
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleMarkRead(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, readAt: new Date().toISOString() }
          : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notifications.markRead(id);
    } catch {
      // Best-effort — a failed mark-read just gets retried on next open.
    }
  }

  async function handleMarkAllRead() {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        readAt: item.readAt ?? new Date().toISOString()
      }))
    );
    setUnreadCount(0);

    try {
      await notifications.markAllRead();
    } catch {
      // Best-effort.
    }
  }

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        className="btn btn-ghost notification-bell-trigger"
        onClick={togglePanel}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <span>Notifications</span>
            <button
              className="btn btn-ghost"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
          </div>

          {loading ? (
            <p className="muted notification-panel-empty">Loading…</p>
          ) : items.length === 0 ? (
            <p className="muted notification-panel-empty">
              No notifications yet.
            </p>
          ) : (
            <div className="notification-list">
              {items.map((item) => (
                <button
                  key={item.id}
                  className={
                    item.readAt
                      ? "notification-item"
                      : "notification-item unread"
                  }
                  onClick={() =>
                    !item.readAt && handleMarkRead(item.id)
                  }
                >
                  <div className="notification-item-title">
                    {item.title}
                  </div>
                  {item.body && (
                    <div className="notification-item-body">
                      {item.body}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
