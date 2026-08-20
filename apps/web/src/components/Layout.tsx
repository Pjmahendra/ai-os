import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.js";
import { NotificationBell } from "./NotificationBell.js";

const NAV_ITEMS = [
  { to: "/", label: "Chat", end: true },
  { to: "/automations", label: "Automations" },
  { to: "/memory", label: "Memory" },
  { to: "/settings", label: "Settings" }
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">AI-OS</div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="user-menu">
          <NotificationBell />
          <span className="user-email">{user?.email}</span>
          <button className="btn btn-ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
