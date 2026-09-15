import { NavLink, Outlet, useLocation } from "react-router";

export function AppLayout() {
  const { pathname } = useLocation();
  const isOnboardingPath =
    pathname === "/" || pathname === "/create" || pathname === "/join" || pathname.startsWith("/room/");

  return (
    <div className={`app-shell${isOnboardingPath ? " player-journey" : ""}`}>
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
