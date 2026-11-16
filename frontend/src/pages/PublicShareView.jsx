import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Download,
  FileCheck,
  Lock,
  AlertCircle,
  Eye,
  CheckCircle,
  Share2,
  HardDrive
} from 'lucide-react';
import api from '../services/api';

export default function PublicShareView() {
  const { token } = useParams();

  const [fileInfo, setFileInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchPublicInfo = async () => {
      try {
        const res = await api.get(`/share/public/${token}`);
        setFileInfo(res.data);
      } catch (err) {
        setErrorMsg(err.response?.data?.message || 'Invalid or revoked link.');
      } finally {
        setLoading(false);
      }
    };
    fetchPublicInfo();
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    setErrorMsg('');
    try {
      const response = await api.post(`/share/public/${token}/download`, 
        { password: password || null }, 
        { responseType: 'blob' }
      );

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileInfo?.fileName || 'downloaded_file');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Download failed. Incorrect password or link expired.');
    } finally {
      setDownloading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center text-slate-400 text-sm">
        Verifying public link...
      </div>
    );
  }

  if (errorMsg && !fileInfo) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
        <div className="bg-surface-100 p-8 rounded-3xl border border-slate-800 text-center max-w-md w-full space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Link Unavailable</h2>
          <p className="text-xs text-slate-400">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col justify-between p-4">
      <div className="p-4 flex items-center justify-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
          <Share2 className="w-4 h-4" />
        </div>
        <span className="font-extrabold text-white text-lg tracking-tight">DropLink</span>
      </div>

      <div className="max-w-md w-full mx-auto my-auto bg-surface-100 p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto shadow-inner">
          <FileCheck className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white break-words">{fileInfo?.fileName}</h2>
          <p className="text-xs text-slate-400">{formatBytes(fileInfo?.fileSize)} • Ready to download</p>
        </div>

        {fileInfo?.requiresPassword && (
          <div className="space-y-2 text-left">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Password Required</span>
            </label>
            <input
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-surface-200 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30 transition text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Downloading...' : 'Download File'}</span>
        </button>

        <p className="text-[11px] text-slate-500">
          Powered by DropLink • High performance file sharing
        </p>
      </div>

      <div className="text-center text-xs text-slate-600 pb-2">
        © 2026 DropLink. All rights reserved.
      </div>
    </div>
  );
}
