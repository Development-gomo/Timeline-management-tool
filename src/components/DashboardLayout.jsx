import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import logo from "../../images/Primary-logo.webp";

const PAGE_META = {
  "/projects": {
    title: "Project Dashboard",
    subtitle: "Review active, completed, and upcoming projects across the portfolio.",
  },
  "/projects/new": {
    title: "Add New Project",
    subtitle: "Create a project, define its status, and attach team members in one flow.",
  },
  "/projects/edit": {
    title: "Edit Project",
    subtitle: "Update the basic project details without changing the project structure.",
  },
  "/projects/timeline": {
    title: "Project Timeline",
    subtitle: "Plan task ownership, dates, dependencies, and delivery status for a project.",
  },
  "/team-members": {
    title: "Team Members",
    subtitle: "Manage the shared team directory, including current and former members.",
  },
  "/user-management": {
    title: "User Management",
    subtitle: "Manage approved tool access, roles, and account status.",
  },
  "/my-profile": {
    title: "My Profile",
    subtitle: "Update your account password.",
  },
  "/logs": {
    title: "Activity Logs",
    subtitle: "Review changes made across projects, timelines, template data, and team records.",
  },
  "/timeline-template": {
    title: "Base Timeline Template",
    subtitle: "Manage the reusable base workflow that every new project inherits.",
  },
};

function SidebarIcon({ type }) {
  if (type === "projects") {
    return (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5 shrink-0 fill-current"
      >
        <rect x="3" y="4" width="8" height="7" rx="2" />
        <rect x="13" y="4" width="8" height="7" rx="2" />
        <rect x="3" y="13" width="8" height="7" rx="2" />
        <rect x="13" y="13" width="8" height="7" rx="2" />
      </svg>
    );
  }

  if (type === "team-members") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
        <path
          d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16.5 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19a4.5 4.5 0 0 1 9 0M13 19a3.5 3.5 0 0 1 7 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "logs") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
        <path
          d="M7 5.5h10M7 12h10M7 18.5h10M4 5.5h.01M4 12h.01M4 18.5h.01"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "user-management") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
        <path
          d="M12 3.8 5.5 6.4v5.4c0 4 2.7 7.7 6.5 8.8 3.8-1.1 6.5-4.8 6.5-8.8V6.4L12 3.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 11.8 11.1 13.4 14.8 9.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "profile") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path d="M7 4h10l3 3v13H7z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M17 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M10 12h7M10 16h7M10 8h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GomoLogo() {
  return (
    <div
      className="flex h-[69px] items-center border-b border-[#d7dfeb] px-6"
      aria-label="Gomo Group"
    >
      <img className="w-full max-w-[155px]" src={logo} alt="Gomo Group" />
    </div>
  );
}

function DashboardLayout({ loadError, projects = [], currentUserRole = "user", onLogout }) {
  const location = useLocation();
  const timelineMatch = location.pathname.match(/^\/projects\/([^/]+)\/timeline$/);
  const matchedProject = timelineMatch
    ? projects.find((project) => project.id === timelineMatch[1]) ?? null
    : null;
  const pageMeta = matchedProject
    ? {
        title: `${matchedProject.name || "Project"} | Project timeline`,
        subtitle: `${matchedProject.teamMembers?.length || 0} team members assigned to this project`,
      }
    : location.pathname.startsWith("/projects/") &&
        location.pathname.endsWith("/edit")
      ? PAGE_META["/projects/edit"]
      : location.pathname.startsWith("/projects/") &&
          location.pathname.endsWith("/timeline")
        ? PAGE_META["/projects/timeline"]
        : PAGE_META[location.pathname] ?? PAGE_META["/projects"];

  return (
    <main className="grid h-screen overflow-hidden md:grid-cols-[255px_minmax(0,1fr)]">
      <aside className="flex h-screen flex-col justify-between overflow-hidden border-r border-[#d7dfeb] bg-white">
        <div className="flex min-h-0 flex-col">
          <GomoLogo />

          <nav
            className="grid content-start gap-2 px-3 py-4"
            aria-label="Primary navigation"
          >
            {[
              { to: "/projects", label: "Projects", icon: "projects" },
              { to: "/team-members", label: "Team Members", icon: "team-members" },
              {
                to: "/timeline-template",
                label: "Timeline Template",
                icon: "template",
              },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "flex w-full items-center gap-3 rounded-[8px] px-4 py-3 text-left text-sm font-semibold no-underline transition duration-200",
                    isActive
                      ? "bg-[#e8f8ef] text-[#17b26a]"
                      : "text-[#475467] hover:-translate-y-px",
                  ].join(" ")
                }
              >
                <SidebarIcon type={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex-none">
          <div className="px-3 pb-3">
            <NavLink
              to="/user-management"
              className={({ isActive }) =>
                [
                  "mb-2 flex w-full items-center gap-3 rounded-[8px] px-4 py-3 text-left text-sm font-semibold no-underline transition duration-200",
                  isActive
                    ? "bg-[#e8f8ef] text-[#17b26a]"
                    : "text-[#475467] hover:-translate-y-px",
                ].join(" ")
              }
            >
              <SidebarIcon type="user-management" />
              <span>User Management</span>
            </NavLink>
            <NavLink
              to="/my-profile"
              className={({ isActive }) =>
                [
                  "mb-2 flex w-full items-center gap-3 rounded-[8px] px-4 py-3 text-left text-sm font-semibold no-underline transition duration-200",
                  isActive
                    ? "bg-[#e8f8ef] text-[#17b26a]"
                    : "text-[#475467] hover:-translate-y-px",
                ].join(" ")
              }
            >
              <SidebarIcon type="profile" />
              <span>My Profile</span>
            </NavLink>
            <NavLink
              to="/logs"
              className={({ isActive }) =>
                [
                  "flex w-full items-center gap-3 rounded-[8px] px-4 py-3 text-left text-sm font-semibold no-underline transition duration-200",
                  isActive
                    ? "bg-[#e8f8ef] text-[#17b26a]"
                    : "text-[#475467] hover:-translate-y-px",
                ].join(" ")
              }
            >
              <SidebarIcon type="logs" />
              <span>Logs</span>
            </NavLink>
          </div>

        <div className="border-t border-[#d7dfeb] px-6 py-3.5">
          <div className="flex items-start gap-3 text-[#475467]">
            <span className="mt-[7px] h-2.5 w-2.5 rounded-full bg-[#17b26a] shadow-[0_0_0_6px_rgba(23,178,106,0.12)]" />
            <div>
              <strong className="mb-1 block text-sm font-semibold text-[#070c11]">
                {loadError ? "Sync Issue" : "System Healthy"}
              </strong>
              {loadError ? (
                <p className="mt-2 text-sm text-[#f04438]">{loadError}</p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="mt-5 inline-flex w-full items-center gap-3 rounded-[8px] border border-[#fecaca] bg-white px-5 py-4 text-left text-[15px] font-semibold text-[#ef4444] transition duration-200 hover:-translate-y-px hover:shadow-[0_8px_18px_rgba(239,68,68,0.08)]"
            onClick={onLogout}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0">
              <path
                d="M15 7V5.8A1.8 1.8 0 0 0 13.2 4H6.8A1.8 1.8 0 0 0 5 5.8v12.4A1.8 1.8 0 0 0 6.8 20h6.4A1.8 1.8 0 0 0 15 18.2V17"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 12h9M16 8l4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
        </div>
      </aside>

      <section className="grid h-screen min-w-0 grid-rows-[69px_minmax(0,1fr)] overflow-hidden bg-[#f5f7fb]">
        <header className="sticky top-0 z-20 flex h-[69px] items-center justify-between gap-4 border-b border-[#d7dfeb] bg-white px-6">
          <div>
            <h1 className="m-0 text-[20px] leading-[1.25] font-semibold text-[#070c11]">
              {pageMeta.title}
            </h1>
            <p className="mt-1 text-sm text-[#667085]">{pageMeta.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {matchedProject ? (
              <Link
                to={`/projects/${matchedProject.id}/edit`}
                className="rounded-[8px] border border-[#c5d0de] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] no-underline transition duration-200 hover:-translate-y-px"
              >
                Edit Project
              </Link>
            ) : null}
            {location.pathname === "/user-management" ? (
              <button
                type="button"
                className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
                onClick={() => window.dispatchEvent(new Event("open-add-user-modal"))}
              >
                Add new user
              </button>
            ) : null}
            {location.pathname === "/team-members" ? (
              <button
                type="button"
                className="rounded-[8px] bg-[#17b26a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(23,178,106,0.16)] transition duration-200 hover:-translate-y-px"
                onClick={() => window.dispatchEvent(new Event("open-add-team-member-modal"))}
              >
                Add team member
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-[8px] border border-[#c5d0de] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] transition duration-200 hover:-translate-y-px"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </header>

        <div className="min-h-0 overflow-x-hidden overflow-y-auto px-6 py-5">
          <Outlet />
        </div>
      </section>
    </main>
  );
}

export default DashboardLayout;
