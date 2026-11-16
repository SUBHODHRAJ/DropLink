import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderSync,
  FileText,
  FileCode,
  HardDrive,
  Smartphone,
  Share2,
  FileEdit,
  GraduationCap,
  Upload,
  Plus,
  ArrowUpRight,
  Wifi,
  QrCode,
  RefreshCw,
  ExternalLink,
  Download,
  Clock,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import { startSignalR } from '../services/signalr';

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalFiles: 0,
    totalBytes: 0,
    totalDocuments: 0,
    totalNotes: 0,
    totalPdfs: 0,
    totalSubjects: 0,
    connectedDevices: 0,
    sharedLinksCount: 0
  });

  const [lanStatus, setLanStatus] = useState(null);
  const [recentFiles, setRecentFiles] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [sharedLinks, setSharedLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [filesRes, notesRes, docsRes, studyRes, linksRes, lanRes, devicesRes] = await Promise.allSettled([
        api.get('/files?pageSize=6'),
        api.get('/edit/notes'),
        api.get('/edit/documents'),
        api.get('/study/dashboard'),
        api.get('/share/links'),
        api.get('/share/lan-status'),
        api.get('/share/devices')
      ]);

      const filesData = filesRes.status === 'fulfilled' ? filesRes.value.data : { totalCount: 0, totalBytes: 0, items: [] };
      const notesData = notesRes.status === 'fulfilled' ? notesRes.value.data : [];
      const docsData = docsRes.status === 'fulfilled' ? docsRes.value.data : [];
      const studyData = studyRes.status === 'fulfilled' ? studyRes.value.data : {};
      const linksData = linksRes.status === 'fulfilled' ? linksRes.value.data : [];
      const lanData = lanRes.status === 'fulfilled' ? lanRes.value.data : null;
      const devicesData = devicesRes.status === 'fulfilled' ? devicesRes.value.data : [];

      setStats({
        totalFiles: filesData.totalCount || 0,
        totalBytes: filesData.totalBytes || 0,
        totalDocuments: docsData.length || 0,
        totalNotes: notesData.length || 0,
        totalPdfs: studyData.totalPdfs || filesData.items?.filter(f => f.fileExtension === '.pdf').length || 0,
        totalSubjects: studyData.totalSubjects || 0,
        connectedDevices: devicesData.length || 0,
        sharedLinksCount: linksData.length || 0
      });

      setRecentFiles(filesData.items || []);
      setRecentNotes(notesData.slice(0, 4));
      setRecentDocs(docsData.slice(0, 4));
      setSharedLinks(linksData.slice(0, 4));
      setLanStatus(lanData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // SignalR real-time event listener
    let conn;
    startSignalR().then(c => {
      conn = c;
      conn.on('TransferCompleted', () => {
        fetchDashboardData();
      });
      conn.on('DevicePaired', () => {
        fetchDashboardData();
      });
    });

    return () => {
      if (conn) {
        conn.off('TransferCompleted');
        conn.off('DevicePaired');
      }
    };
  }, []);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner & Quick Action Launchpad */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-surface-100 via-surface-200 to-surface-100 p-6 sm:p-8 border border-slate-800/80 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-brand-500/10 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>All-In-One Unified Operating Suite</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome to <span className="bg-gradient-to-r from-brand-400 to-sky-300 bg-clip-text text-transparent">DropLink</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-xl">
              Seamlessly share multi-gigabyte files over local Wi-Fi, write documents & notes, export PDFs, and smartly organize academic study materials.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/share')}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-600/30 transition transform active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Upload / Share</span>
            </button>
            <button
              onClick={() => navigate('/edit')}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-300 hover:bg-surface-400 text-slate-100 text-sm font-semibold rounded-xl border border-slate-700 transition"
            >
              <FileEdit className="w-4 h-4 text-indigo-400" />
              <span>New Document</span>
            </button>
            <button
              onClick={() => navigate('/study')}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-300 hover:bg-surface-400 text-slate-100 text-sm font-semibold rounded-xl border border-slate-700 transition"
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>Study Library</span>
            </button>
          </div>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Files Card */}
        <div className="bg-surface-100/80 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Files</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FolderSync className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{stats.totalFiles}</span>
            <p className="text-xs text-slate-400 mt-1">{formatBytes(stats.totalBytes)} stored</p>
          </div>
        </div>

        {/* Documents Card */}
        <div className="bg-surface-100/80 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Docs & Notes</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">
              {stats.totalDocuments + stats.totalNotes}
            </span>
            <p className="text-xs text-slate-400 mt-1">{stats.totalDocuments} docs • {stats.totalNotes} notes</p>
          </div>
        </div>

        {/* Academic PDFs Card */}
        <div className="bg-surface-100/80 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Study PDFs</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{stats.totalPdfs}</span>
            <p className="text-xs text-slate-400 mt-1">{stats.totalSubjects} subjects organized</p>
          </div>
        </div>

        {/* LAN Devices & Links Card */}
        <div className="bg-surface-100/80 p-5 rounded-2xl border border-slate-800/80 hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Connected & Shared</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{stats.connectedDevices}</span>
            <p className="text-xs text-slate-400 mt-1">{stats.sharedLinksCount} public sharing links</p>
          </div>
        </div>
      </div>

      {/* WORKSPACE PREVIEWS & REAL-TIME LAN HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspace 1: Instant AirDrop / LAN Card */}
        <div className="lg:col-span-1 bg-surface-100 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  WORKSPACE 1
                </span>
                <h3 className="font-bold text-white text-base">Local AirDrop & LAN</h3>
              </div>
              <Wifi className="w-4 h-4 text-emerald-400" />
            </div>

            <p className="text-xs text-slate-400">
              Scan this QR code with your mobile camera to transfer files up to 100GB+ instantly without internet.
            </p>

            {lanStatus?.qrCodeBase64 ? (
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner">
                <img src={lanStatus.qrCodeBase64} alt="Pairing QR Code" className="w-44 h-44 object-contain" />
                <span className="mt-2 text-xs font-mono font-bold text-slate-900">
                  PIN: {lanStatus.pairingPin}
                </span>
              </div>
            ) : (
              <div className="w-full h-44 bg-surface-200 rounded-xl flex items-center justify-center text-slate-500 text-xs">
                Loading QR Code...
              </div>
            )}

            <div className="p-3 bg-surface-200/50 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>LAN Address:</span>
                <span className="font-mono text-emerald-400">{lanStatus?.localIp}:{lanStatus?.port}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Direct Mobile Link:</span>
                <span className="font-mono text-[11px] truncate max-w-[150px]">{lanStatus?.lanUrl}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/share')}
            className="mt-4 w-full py-2.5 bg-surface-200 hover:bg-surface-300 text-slate-200 hover:text-white text-xs font-medium rounded-xl border border-slate-700/60 flex items-center justify-center gap-2 transition"
          >
            <span>Open Share Workspace</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Files & Study Notes (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recently Uploaded Files */}
          <div className="bg-surface-100 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-brand-400" />
                <h3 className="font-bold text-white text-base">Recently Uploaded Files</h3>
              </div>
              <button
                onClick={() => navigate('/files')}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentFiles.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No files uploaded yet. Drag & drop files in the Share tab to begin!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 rounded-xl bg-surface-200/50 hover:bg-surface-200 border border-slate-800 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase">
                        {file.fileExtension ? file.fileExtension.replace('.', '') : 'FILE'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{file.originalFileName}</p>
                        <p className="text-[10px] text-slate-400">{formatBytes(file.fileSize)}</p>
                      </div>
                    </div>
                    <a
                      href={file.downloadUrl}
                      download
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-surface-300 flex-shrink-0"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Notes & Documents Workspace Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Notes Preview */}
            <div className="bg-surface-100 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Recent Notes</span>
                <button onClick={() => navigate('/edit')} className="text-xs text-slate-400 hover:text-white">
                  + New Note
                </button>
              </div>
              <div className="space-y-2">
                {recentNotes.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No notes created yet.</p>
                ) : (
                  recentNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => navigate('/edit')}
                      className="p-2.5 rounded-lg bg-surface-200/40 hover:bg-surface-200 cursor-pointer border border-slate-800/80 transition"
                    >
                      <p className="text-xs font-medium text-slate-200 truncate">{note.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{note.plainText || 'No content'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Documents Preview */}
            <div className="bg-surface-100 p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Word Documents</span>
                <button onClick={() => navigate('/edit')} className="text-xs text-slate-400 hover:text-white">
                  + New Doc
                </button>
              </div>
              <div className="space-y-2">
                {recentDocs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">No documents created yet.</p>
                ) : (
                  recentDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => navigate('/edit')}
                      className="p-2.5 rounded-lg bg-surface-200/40 hover:bg-surface-200 cursor-pointer border border-slate-800/80 transition"
                    >
                      <p className="text-xs font-medium text-slate-200 truncate">{doc.title}</p>
                      <p className="text-[10px] text-slate-500 truncate">{doc.plainText || 'No content'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
