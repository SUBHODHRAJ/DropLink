import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Share2,
  FileEdit,
  GraduationCap,
  FolderSync,
  Link2,
  Clock,
  Star,
  Trash2,
  Settings,
  Sun,
  Moon,
  Upload,
  Plus,
  Wifi,
  QrCode,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

export default function MainLayout() {
  const { user, logout, isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [lanStatus, setLanStatus] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickUploadOpen, setQuickUploadOpen] = useState(false);

  useEffect(() => {
    // Fetch LAN info for header status badge
    const fetchLan = async () => {
      try {
        const res = await api.get('/share/lan-status');
        setLanStatus(res.data);
      } catch (e) {
        console.warn('LAN fetch failed:', e);
      }
    };
    fetchLan();
    const interval = setInterval(fetchLan, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Share', path: '/share', icon: Share2, badge: 'W1', badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
    { name: 'Edit', path: '/edit', icon: FileEdit, badge: 'W2', badgeColor: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' },
    { name: 'Study Library', path: '/study', icon: GraduationCap, badge: 'W3', badgeColor: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
    { name: 'My Files', path: '/files', icon: FolderSync },
    { name: 'Shared Links', path: '/shared-links', icon: Link2 },
    { name: 'Recent', path: '/recent', icon: Clock },
    { name: 'Favorites', path: '/favorites', icon: Star },
    { name: 'Trash', path: '/trash', icon: Trash2 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* LEFT SIDEBAR */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-72 bg-surface-100 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-sky-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-300 bg-clip-text text-transparent">
                DropLink
              </span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-brand-400">
                Unified Ecosystem
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button */}
        <div className="p-4">
          <button
            onClick={() => navigate('/share')}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-medium rounded-xl shadow-lg shadow-brand-600/25 transition-all duration-200 active:scale-[0.98]"
          >
            <Upload className="w-4 h-4" />
            <span>Send & Receive Files</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600/15 text-brand-400 border border-brand-500/25 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-200/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom User & System Info */}
        <div className="p-4 border-t border-slate-800/60 bg-surface-50/50">
          {lanStatus && (
            <div className="mb-3 p-2.5 rounded-lg bg-surface-200/50 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-300 truncate">
                <Wifi className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="truncate">{lanStatus.localIp}:{lanStatus.port}</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono font-medium">
                PIN: {lanStatus.pairingPin}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-surface-300 flex items-center justify-center text-slate-300 font-semibold text-xs border border-slate-700">
                {user ? user.username.substring(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="truncate">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {user ? user.fullName || user.username : 'Local Host'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user ? user.email : 'Standalone LAN'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                title="Toggle Theme"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-200"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              {isAuthenticated ? (
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => navigate('/auth')}
                  title="Sign In"
                  className="text-xs text-brand-400 hover:text-brand-300 font-medium px-2 py-1 rounded hover:bg-brand-500/10"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-6 bg-surface-100/60 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-surface-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-medium text-slate-300">LAN Host Active</span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/edit')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-surface-200/80 hover:bg-surface-300 px-3 py-1.5 rounded-lg border border-slate-700/60 transition"
            >
              <FileEdit className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">New Note / Doc</span>
            </button>
            <button
              onClick={() => navigate('/study')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-surface-200/80 hover:bg-surface-300 px-3 py-1.5 rounded-lg border border-slate-700/60 transition"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Study Library</span>
            </button>
            <button
              onClick={() => navigate('/share')}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-500 px-3.5 py-1.5 rounded-lg shadow-sm transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-surface-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
