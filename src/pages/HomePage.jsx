import Button from '../components/Button';

// SVG Icons
const BuildingIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" className="text-blue-500">
    <path d="M8 2h16v28H8V2zm2 4h3v3h-3V6zm5 0h3v3h-3V6zm5 0h3v3h-3V6zm-10 5h3v3h-3v-3zm5 0h3v3h-3v-3zm5 0h3v3h-3v-3zm-10 5h3v3h-3v-3zm5 0h3v3h-3v-3zm5 0h3v3h-3v-3z"/>
  </svg>
);

const PeopleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor" className="text-green-600">
    <circle cx="10" cy="8" r="4"/><path d="M6 14h8v2H6z"/><circle cx="22" cy="10" r="4"/><path d="M18 16h8v2h-8z"/><path d="M4 24h24v4H4z"/>
  </svg>
);

const HomePage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-blue-50 px-4">

      {/* TITLE */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-900">
          RespiraTrack
        </h1>

        <p className="mt-4 text-sm text-zinc-600">
          TB-DOTS Treatment Compliance & Medicine Inventory System
        </p>

        <p className="text-xs text-zinc-500">
          DOH National TB Control Program • WHO TB Guidelines
        </p>
      </div>

      {/* CARDS */}
      <div className="mt-12 grid gap-8 md:grid-cols-2">

        {/* SUPER ADMIN */}
        <div className="w-[320px] rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm transition hover:shadow-md">
          
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <BuildingIcon />
          </div>

          <h2 className="text-lg font-semibold text-zinc-800">
            Super Admin
          </h2>

          <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
            Municipal level access • View all barangays • Stock allocation
          </p>

          <Button to="/admin" className="mt-6">
            Enter
          </Button>
        </div>

        {/* BARANGAY ADMIN */}
        <div className="w-[320px] rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm transition hover:shadow-md">
          
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <PeopleIcon />
          </div>

          <h2 className="text-lg font-semibold text-zinc-800">
            Barangay Admin
          </h2>

          <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
            Barangay level access • Manage patients • Send SMS
          </p>

          <Button to="/barangay" className="mt-6">
            Enter
          </Button>
        </div>

      </div>
    </div>
  );
};

export default HomePage;