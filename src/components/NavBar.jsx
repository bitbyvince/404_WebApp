import { useNavigate } from "react-router-dom";

const NavBar = ({ menuItems = [], activeMenu, setActiveMenu, subtitle = "Admin" }) => {
  const navigate = useNavigate();

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col fixed h-full z-10 shadow-lg">
      {/* Branding Section */}
      <div className="p-6 border-b border-blue-800">
        <h1 className="text-xl font-bold leading-tight">RespiraTrack</h1>
        <p className="text-[10px] text-blue-200 uppercase tracking-widest leading-tight mt-1">
          {subtitle || "Admin"}
        </p>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-4 space-y-2 px-3 flex-1 overflow-y-auto">
        {menuItems.map((item) => (
          <div
            key={typeof item === "string" ? item : item.name}
            onClick={() => {
              const menuName = typeof item === "string" ? item : item.name;
              setActiveMenu && setActiveMenu(menuName);
            }}
            className={`px-4 py-3 rounded-lg cursor-pointer transition-colors font-medium text-sm ${
              activeMenu === (typeof item === "string" ? item : item.name)
                ? "bg-blue-700 text-white"
                : "hover:bg-blue-800 text-blue-100"
            }`}
          >
            {typeof item === "string" ? item : item.name}
          </div>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-blue-800">
        <button
          onClick={() => navigate("/")}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Logout
        </button>
      </div>
    </aside>
  );
};

export default NavBar;
