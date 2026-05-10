import { NavLink, Outlet } from "react-router-dom";

const PATHS = {
  home: "M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  droplet:
    "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z",
  bolt: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  leaf: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.501 5.501 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  chart:
    "M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z",
  cog: "M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

type IconName = keyof typeof PATHS;

function Icon({ name, active }: { name: IconName; active: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-[22px] h-[22px] transition-colors duration-200 ${active ? "text-brand-500" : "text-ink-tertiary"}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: "/", label: "Home", icon: "home" },
  { to: "/hydration", label: "Water", icon: "droplet" },
  { to: "/activity", label: "Activity", icon: "bolt" },
  { to: "/nutrition", label: "Nutrition", icon: "leaf" },
  { to: "/progress", label: "Progress", icon: "chart" },
  { to: "/settings", label: "Settings", icon: "cog" },
];

export default function Layout() {
  return (
    <div className="flex flex-col sm:flex-row min-h-screen max-w-2xl mx-auto sm:max-w-none sm:mx-0">
      {/* Desktop left sidebar */}
      <aside className="hidden sm:flex sm:flex-col sm:w-52 sm:shrink-0 sm:sticky sm:top-0 sm:h-screen border-r border-white/[.07] bg-surface-1">
        <div className="px-5 py-4 border-b border-white/[.07]">
          <span className="text-xs font-medium text-ink-tertiary tracking-wider uppercase">
            Human Maintenance Manual
          </span>
        </div>
        <nav className="flex flex-col p-3 gap-0.5 flex-1">
          {tabs.slice(0, 5).map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-brand-500/10 text-brand-500"
                    : "text-ink-tertiary hover:text-ink-secondary hover:bg-white/[.04]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={tab.icon} active={isActive} />
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/[.07]">
          <NavLink
            to="/settings"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? "bg-brand-500/10 text-brand-500"
                  : "text-ink-tertiary hover:text-ink-secondary hover:bg-white/[.04]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name="cog" active={isActive} />
                Settings
              </>
            )}
          </NavLink>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 px-4 py-6 pb-28 sm:pb-8 sm:max-w-2xl">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-surface-1 border-t border-white/[.07] z-10">
        <div className="flex max-w-2xl mx-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-3 transition-colors duration-150"
            >
              {({ isActive }) => (
                <>
                  <Icon name={tab.icon} active={isActive} />
                  <span
                    className={`text-[9px] font-medium tracking-widest uppercase transition-colors duration-150 ${
                      isActive ? "text-brand-500" : "text-ink-muted"
                    }`}
                  >
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
