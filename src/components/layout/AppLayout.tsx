import { NavLink, Outlet } from "react-router";

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="brand">
          NO FOLD
        </NavLink>
        <nav className="app-nav" aria-label="Primary">
          <NavLink to="/create">Create</NavLink>
          <NavLink to="/join">Join</NavLink>
          <NavLink to="/demo">Demo</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
