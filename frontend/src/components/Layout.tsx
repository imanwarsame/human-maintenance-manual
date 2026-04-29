import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/hydration', label: 'Hydration', icon: '💧' },
  { to: '/activity', label: 'Activity', icon: '🏃' },
  { to: '/nutrition', label: 'Nutrition', icon: '🥗' },
  { to: '/progress', label: 'Progress', icon: '📈' },
];

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen max-w-2xl mx-auto">
      {/* Desktop header */}
      <header className="hidden sm:flex items-center gap-6 px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <span className="font-semibold text-gray-900 mr-auto">Human Maintenance Manual</span>
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `text-sm font-medium pb-1 border-b-2 transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `text-lg pb-1 border-b-2 transition-colors ${
              isActive ? 'border-brand-600' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`
          }
          aria-label="Settings"
        >
          ⚙
        </NavLink>
      </header>

      {/* Page content */}
      <main className="flex-1 px-4 py-6 pb-24 sm:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl leading-none mb-1">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
