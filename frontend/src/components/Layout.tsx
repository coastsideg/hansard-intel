import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { LogOut, Shield } from 'lucide-react';

export default function Layout() {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Shield className="text-white" size={20} />
          </div>
          <span className="font-bold text-gray-900 tracking-tight">HANSARD INTEL</span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500 font-medium">{user?.username}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
