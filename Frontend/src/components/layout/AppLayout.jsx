import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";
import { Topbar } from "./Topbar.jsx";
import { MobileNav } from "./MobileNav.jsx";
import "./AppLayout.css";

export function AppLayout({ scope = "customer" }) {
  return (
    <div className="applayout" data-scope={scope}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <Sidebar scope={scope} />

      <div className="applayout__main">
        <Topbar scope={scope} />

        <main id="main" className="applayout__content">
          <div className="applayout__inner">
            <Outlet />
          </div>
        </main>

        <MobileNav scope={scope} />
      </div>
    </div>
  );
}