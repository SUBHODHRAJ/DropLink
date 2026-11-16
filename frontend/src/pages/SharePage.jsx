import React, { useState, useEffect, useRef } from 'react';
import {
  Share2,
  Wifi,
  QrCode,
  Upload,
  FileCheck,
  HardDrive,
  Copy,
  ExternalLink,
  Shield,
  Clock,
  Download,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  XCircle,
  RefreshCw,
  Link as LinkIcon,
  Smartphone,
  Lock,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';
import { startSignalR } from '../services/signalr';

export default function SharePage() {
  const [activeTab, setActiveTab] = useState('local'); // 'local' or 'global'
  const [lanStatus, setLanStatus] = useState(null);
  const [devices, setDevices] = useState([]);

  // Upload Engine States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeUploads, setActiveUploads] = useState([]); // [{ id, name, size, progress, speed, eta, status, sessionId }]
  const [completedTransfers, setCompletedTransfers] = useState([]);

  // Global Link Creator Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkTargetFileId, setLinkTargetFileId] = useState(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkExpiryDays, setLinkExpiryDays] = useState(7);
  const [linkDownloadLimit, setLinkDownloadLimit] = useState('');
  const [generatedLink, setGeneratedLink] = useState(null);

  // Drag and Drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch LAN Status and Connected Devices
  const fetchLanInfo = async () => {
    try {
      const [lanRes, devRes] = await Promise.all([
        api.get('/share/lan-status'),
        api.get('/share/devices')
      ]);
      setLanStatus(lanRes.data);
      setDevices(devRes.data);
    } catch (err) {
      console.warn('Failed to load LAN info:', err);
    }
  };

  useEffect(() => {
    fetchLanInfo();

    let conn;
    startSignalR().then(c => {
      conn = c;
      conn.on('UploadProgress', (data) => {
        setActiveUploads(prev => prev.map(u => {
          if (u.sessionId === data.sessionId) {
            return {
              ...u,
              progress: data.percentage,
              uploadedBytes: data.uploadedBytes
            };
          }
          return u;
        }));
      });

      conn.on('TransferCompleted', (data) => {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.8 } });
        fetchLanInfo();
      });

      conn.on('DevicePaired', () => {
        fetchLanInfo();
      });
    });

    return () => {
      if (conn) {
        conn.off('UploadProgress');
        conn.off('TransferCompleted');
        conn.off('DevicePaired');
      }
    };
  }, []);

  // Format Bytes helper
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 100 GB+ Large File Chunked Upload Engine
  const startChunkedUpload = async (file) => {
    const CHUNK_SIZE = 16 * 1024 * 1024; // 16 MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = 'up_' + Math.random().toString(36).substring(2, 9);

    const newUpload = {
      id: uploadId,
      name: file.name,
      size: file.size,
      progress: 0,
      speed: 'Calculating...',
      eta: 'Estimating...',
      status: 'Uploading',
      sessionId: null,
      file: file
    };

    setActiveUploads(prev => [newUpload, ...prev]);

    try {
      // Step 1: Initialize session on backend
      const initRes = await api.post('/share/upload-session', {
        fileName: file.name,
        totalSize: file.size,
        totalChunks: totalChunks,
        chunkSize: CHUNK_SIZE,
        targetCategory: 'General'
      });

      const sessionId = initRes.data.sessionId;

      setActiveUploads(prev => prev.map(u => u.id === uploadId ? { ...u, sessionId } : u));

      // Step 2: Stream chunks
      const startTime = Date.now();
      let uploadedBytes = 0;

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        const chunkStartTime = Date.now();

        await api.post(`/share/upload-chunk/${sessionId}/${i}`, chunk, {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        });

        uploadedBytes += chunk.size;
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBytesPerSec = uploadedBytes / (elapsedSec || 1);
        const speedMBs = (speedBytesPerSec / (1024 * 1024)).toFixed(2) + ' MB/s';
        const remainingBytes = file.size - uploadedBytes;
        const etaSeconds = Math.round(remainingBytes / (speedBytesPerSec || 1));
        const etaFormatted = etaSeconds > 60 ? `${Math.ceil(etaSeconds / 60)} min` : `${etaSeconds} sec`;

        const percent = Math.round((uploadedBytes / file.size) * 100);

        setActiveUploads(prev => prev.map(u => {
          if (u.id === uploadId) {
            return {
              ...u,
              progress: percent,
              speed: speedMBs,
              eta: etaFormatted
            };
          }
          return u;
        }));
      }

      // Step 3: Trigger Assemble
      const assembleRes = await api.post(`/share/assemble/${sessionId}`);

      setActiveUploads(prev => prev.map(u => {
        if (u.id === uploadId) {
          return {
            ...u,
            progress: 100,
            status: 'Completed',
            fileId: assembleRes.data.fileId,
            downloadUrl: assembleRes.data.downloadUrl
          };
        }
        return u;
      }));

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      fetchLanInfo();
    } catch (err) {
      console.error('Upload failed:', err);
      setActiveUploads(prev => prev.map(u => {
        if (u.id === uploadId) {
          return { ...u, status: 'Failed', error: err.response?.data?.message || err.message };
        }
        return u;
      }));
    }
  };

  const handleFilesSelected = (files) => {
    Array.from(files).forEach(file => {
      startChunkedUpload(file);
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const createPublicLink = async (fileId) => {
    try {
      const res = await api.post('/share/links', {
        fileId: fileId,
        password: linkPassword || null,
        expiryDays: parseInt(linkExpiryDays) || null,
        downloadLimit: linkDownloadLimit ? parseInt(linkDownloadLimit) : null,
        allowPreview: true
      });
      setGeneratedLink(res.data);
    } catch (err) {
      alert('Failed to create link: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Share2 className="w-3.5 h-3.5" /> Workspace 1: Share
          </div>
          <h1 className="text-2xl font-extrabold text-white">AirDrop LAN & 100 GB+ File Engine</h1>
          <p className="text-xs text-slate-400">High-speed Wi-Fi transfers without internet, resumable 100GB+ streams, and global shareable URLs.</p>
        </div>

        <div className="flex bg-surface-200/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('local')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'local' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Local LAN AirDrop</span>
          </button>
          <button
            onClick={() => setActiveTab('global')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'global' ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Global Share Links</span>
          </button>
        </div>
      </div>

      {activeTab === 'local' ? (
        <div className="space-y-6">
          {/* LAN Connection & Pairing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* QR Code and Pairing PIN Card */}
            <div className="md:col-span-1 bg-surface-100 p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>Pair Mobile Phone</span>
              </div>
              <p className="text-xs text-slate-400">
                Open phone camera or browser and point to this QR code to connect directly.
              </p>

              {lanStatus?.qrCodeBase64 ? (
                <div className="p-3 bg-white rounded-2xl shadow-xl border border-slate-700">
                  <img src={lanStatus.qrCodeBase64} alt="QR Code" className="w-48 h-48 object-contain" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-surface-200 rounded-2xl flex items-center justify-center text-xs text-slate-500">
                  Detecting IP...
                </div>
              )}

              <div className="w-full bg-surface-200/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 uppercase font-semibold">One-Time Pairing PIN</span>
                <div className="text-2xl font-mono font-extrabold text-emerald-400 tracking-widest mt-0.5">
                  {lanStatus?.pairingPin || '------'}
                </div>
              </div>

              <div className="text-[11px] text-slate-400">
                LAN Host: <span className="font-mono text-slate-200">{lanStatus?.localIp}:{lanStatus?.port}</span>
              </div>
            </div>

            {/* Drag & Drop Upload Engine & Transfer Queue */}
            <div className="md:col-span-2 space-y-6">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 rounded-2xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition-all ${
                  isDragging
                    ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
                    : 'border-slate-700/80 hover:border-brand-500/60 bg-surface-100/60 hover:bg-surface-100'
                }`}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-white text-base">Drag & drop files here, or browse</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Powered by our 100 GB+ HTTP streaming engine with 16MB chunking, zero RAM buffering, and SHA-256 verification.
                </p>
                <span className="mt-3 px-3 py-1 rounded-full bg-surface-200 text-[11px] text-slate-300 font-medium">
                  Support files up to 150 GB
                </span>
              </div>

              {/* Active & Resumable Transfers List */}
              <div className="bg-surface-100 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">Active & Recent Transfers</h4>
                  <span className="text-xs text-slate-400">{activeUploads.length} transfers in session</span>
                </div>

                {activeUploads.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No active transfers. Drop files above or upload from your paired phone!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeUploads.map((up) => (
                      <div
                        key={up.id}
                        className="p-4 rounded-xl bg-surface-200/50 border border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck className="w-4 h-4 text-brand-400 flex-shrink-0" />
                            <span className="font-semibold text-slate-200 truncate">{up.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            up.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' :
                            up.status === 'Failed' ? 'bg-rose-500/20 text-rose-400' :
                            'bg-brand-500/20 text-brand-400 animate-pulse'
                          }`}>
                            {up.status}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-surface-300 h-2.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              up.status === 'Completed' ? 'bg-emerald-500' :
                              up.status === 'Failed' ? 'bg-rose-500' :
                              'bg-gradient-to-r from-brand-600 to-sky-400'
                            }`}
                            style={{ width: `${up.progress}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{formatBytes(up.size)} • {up.progress}%</span>
                          {up.status === 'Uploading' && (
                            <span className="font-mono text-brand-400">{up.speed} • ETA: {up.eta}</span>
                          )}
                          {up.status === 'Completed' && (
                            <div className="flex items-center gap-2">
                              <a
                                href={up.downloadUrl}
                                download
                                className="text-brand-400 hover:underline flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Download
                              </a>
                              <button
                                onClick={() => {
                                  setLinkTargetFileId(up.fileId);
                                  setShowLinkModal(true);
                                }}
                                className="text-emerald-400 hover:underline flex items-center gap-1"
                              >
                                <LinkIcon className="w-3 h-3" /> Share Link
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Global Internet Share Section */
        <div className="bg-surface-100 p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="max-w-xl space-y-2">
            <h3 className="text-lg font-bold text-white">Create Global Public Share Link</h3>
            <p className="text-xs text-slate-400">
              Generate secure public URLs with optional password protection, expiration timers, and download quotas. Anyone with the link can preview or download the file.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Optional Password</label>
              <input
                type="password"
                placeholder="Leave blank for open link"
                value={linkPassword}
                onChange={(e) => setLinkPassword(e.target.value)}
                className="w-full px-3 py-2 bg-surface-200 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Expires After (Days)</label>
              <input
                type="number"
                min="1"
                max="90"
                value={linkExpiryDays}
                onChange={(e) => setLinkExpiryDays(e.target.value)}
                className="w-full px-3 py-2 bg-surface-200 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Download Limit (Optional)</label>
              <input
                type="number"
                min="1"
                placeholder="Unlimited if empty"
                value={linkDownloadLimit}
                onChange={(e) => setLinkDownloadLimit(e.target.value)}
                className="w-full px-3 py-2 bg-surface-200 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          {generatedLink && (
            <div className="p-4 bg-surface-200/80 rounded-xl border border-brand-500/30 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <CheckCircle className="w-4 h-4" /> Link Active & Ready to Share
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink.publicUrl}
                  className="flex-1 px-3 py-2 bg-surface-300 border border-slate-700 rounded-lg text-xs font-mono text-slate-200"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink.publicUrl);
                    alert('Copied link to clipboard!');
                  }}
                  className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Link Creator Dialog Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Generate Public Share Link</h3>
            <p className="text-xs text-slate-400">Share this file with anyone over the internet.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300">Set Password (optional)</label>
                <input
                  type="password"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Optional access password"
                  className="mt-1 w-full px-3 py-2 bg-surface-200 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Expiration (Days)</label>
                <input
                  type="number"
                  value={linkExpiryDays}
                  onChange={(e) => setLinkExpiryDays(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-surface-200 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 bg-surface-200 hover:bg-surface-300 text-slate-300 text-xs font-medium rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  createPublicLink(linkTargetFileId);
                  setShowLinkModal(false);
                  setActiveTab('global');
                }}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium rounded-lg"
              >
                Create Public Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
