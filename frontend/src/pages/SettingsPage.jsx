import React, { useState, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  Wifi,
  Moon,
  Sun,
  Shield,
  RefreshCw,
  QrCode,
  CheckCircle2,
  Server
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [lanStatus, setLanStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLanStatus = async () => {
    try {
      const res = await api.get('/share/lan-status');
      setLanStatus(res.data);
    } catch (err) {
      console.warn('Failed to fetch status:', err);
    }
  };

  useEffect(() => {
    fetchLanStatus();
  }, []);

  const refreshPin = async () => {
    setRefreshing(true);
    try {
      await api.post('/share/refresh-pin');
      await fetchLanStatus();
    } catch (err) {
      alert('Failed to refresh PIN');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-white">System Settings</h1>
        <p className="text-xs text-slate-400">Configure local network sharing, storage thresholds, and app appearance.</p>
      </div>

      <div className="space-y-6">
        {/* Appearance Card */}
        <div className="bg-surface-100 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            {isDark ? <Moon className="w-4 h-4 text-brand-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span>Interface Theme</span>
          </h3>
          <p className="text-xs text-slate-400">Switch between dark SaaS theme and high-contrast light mode.</p>
          <div className="flex gap-3">
            <button
              onClick={() => !isDark && toggleTheme()}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                isDark ? 'bg-brand-600 text-white border-brand-500 shadow' : 'bg-surface-200 text-slate-400 border-slate-700'
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark Theme (Default)
            </button>
            <button
              onClick={() => isDark && toggleTheme()}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                !isDark ? 'bg-brand-600 text-white border-brand-500 shadow' : 'bg-surface-200 text-slate-400 border-slate-700'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Light Theme
            </button>
          </div>
        </div>

        {/* Local Network Node Settings Card */}
        <div className="bg-surface-100 p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span>Local AirDrop LAN Server</span>
          </h3>
          <p className="text-xs text-slate-400">
            This laptop acts as the high-speed local storage host. Other devices on the Wi-Fi connect via this IP.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-surface-200/50 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Active LAN Address</span>
              <div className="font-mono text-emerald-400 font-bold text-sm">
                {lanStatus?.localIp}:{lanStatus?.port}
              </div>
            </div>

            <div className="p-4 bg-surface-200/50 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Pairing PIN</span>
                <div className="font-mono text-white font-extrabold text-lg tracking-wider">
                  {lanStatus?.pairingPin || '------'}
                </div>
              </div>
              <button
                onClick={refreshPin}
                disabled={refreshing}
                className="px-3 py-1.5 bg-surface-300 hover:bg-surface-400 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Rotate PIN</span>
              </button>
            </div>
          </div>
        </div>

        {/* Storage Architecture Info */}
        <div className="bg-surface-100 p-6 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>Large File Streaming Engine</span>
          </h3>
          <p className="text-xs text-slate-400">
            Storage Engine supports 100 GB+ files with 16MB streaming chunks directly to Windows filesystem with zero RAM overhead.
          </p>
          <div className="p-3 bg-surface-200/40 rounded-xl text-xs font-mono text-slate-300 space-y-1">
            <div>Storage Path: <span className="text-brand-400">storage/local/</span></div>
            <div>Temp Chunk Path: <span className="text-brand-400">storage/temporary/</span></div>
            <div>Database: <span className="text-emerald-400">MySQL 8 (droplink_db)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
