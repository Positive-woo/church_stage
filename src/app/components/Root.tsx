import { Outlet, Link, useLocation } from "react-router";
import { Home, Package, Box, Map } from "lucide-react";
import { AppProvider } from "../context/AppContext";

export default function Root() {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "홈", shortLabel: "홈" },
    { path: "/inventory", icon: Package, label: "물품 목록", shortLabel: "물품" },
    { path: "/boxes", icon: Box, label: "박스 관리", shortLabel: "박스" },
    { path: "/stage-map", icon: Map, label: "무대 맵", shortLabel: "맵" },
  ];

  return (
    <AppProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="font-bold text-xl text-gray-900">수련회 관리</h1>
          </div>
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Outlet />
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <ul className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path} className="flex-1">
                  <Link
                    to={item.path}
                    className={`flex flex-col items-center justify-center h-16 gap-1 ${
                      isActive ? "text-blue-600" : "text-gray-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs">{item.shortLabel}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </AppProvider>
  );
}
