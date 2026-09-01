import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Layout = ({ children, menuItems = [], activeMenu, setActiveMenu, title, subtitle }) => {
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-gray-100 w-full">
      <aside className="w-64 bg-blue-900 text-white flex flex-col fixed inset-y-0 left-0 z-50 shadow-lg">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-xl font-bold leading-tight">RespiraTrack</h1>
          <p className="text-[10px] text-blue-200 uppercase tracking-widest leading-tight mt-1">
            {subtitle || "Admin"}
          </p>
        </div>

        <nav className="mt-4 space-y-2 px-3 flex-1 overflow-y-auto">
          {menuItems && menuItems.length > 0 && menuItems.map((item) => {
            const menuName = typeof item === "string" ? item : item.name;
            const badgeCount = typeof item === "object" ? item.badge : undefined;
            return (
              <div
                key={menuName}
                onClick={() => setActiveMenu && setActiveMenu(menuName)}
                className={`px-3 py-2 rounded-lg cursor-pointer transition-colors font-medium text-sm flex items-center justify-between ${
                  activeMenu === menuName
                    ? "bg-blue-700 text-white"
                    : "hover:bg-blue-800 text-blue-100"
                }`}
              >
                <span>{menuName}</span>
                {badgeCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[1.25rem] text-center">
                    {badgeCount}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 overflow-y-auto w-full">
        <div className="p-8">
          {children}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 text-center">
            <div className="text-4xl mb-4">👋</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Logging out?</h2>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to log out of RespiraTrack?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;