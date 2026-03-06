import React from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { LogOut, Shield, Database } from 'lucide-react';

export default function Layout() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white"><Shield size={20} /></div>
            <span className="font-bold text-gray-900 text-lg">HANSARD INTEL</span>
          </Link>
          <nav className="flex gap-4">
            <Link to="/admin" className="text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1">
              <Database size={14} /> Admin
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.username}</span>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* THIS IS REQUIRED TO RENDER CHILD PAGES */}
        <Outlet />
      </main>
    </div>
  );
}
