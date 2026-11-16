import React, { useState, useEffect } from 'react';
import {
  Link2,
  Copy,
  ExternalLink,
  Trash2,
  Lock,
  Unlock,
  Clock,
  Download,
  AlertCircle,
  CheckCircle,
  Share2
} from 'lucide-react';
import api from '../services/api';

export default function SharedLinksPage() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = async () => {
    try {
      const res = await api.get('/share/links');
      setLinks(res.data);
    } catch (err) {
      console.warn('Failed to load shared links:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const revokeLink = async (id) => {
    if (!confirm('Are you sure you want to revoke this public link? Recipients will lose access immediately.')) return;
    try {
      await api.delete(`/share/links/${id}`);
      setLinks(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      alert('Revoke failed');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-white">Shared Links Manager</h1>
        <p className="text-xs text-slate-400">
          Monitor and manage your active public internet download links, access limits, and passwords.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading links...</div>
      ) : links.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-surface-100 rounded-2xl border border-slate-800 space-y-2">
          <Link2 className="w-10 h-10 mx-auto text-slate-600" />
          <p>No public shared links generated yet.</p>
          <p className="text-slate-400">Go to Workspace 1 (Share) or My Files to create a public link.</p>
        </div>
      ) : (
        <div className="bg-surface-100 rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-200/50 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-4">File Name</th>
                <th className="p-4">Protection</th>
                <th className="p-4">Downloads</th>
                <th className="p-4">Expires</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {links.map((link) => {
                const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
                return (
                  <tr key={link.id} className="hover:bg-surface-200/40">
                    <td className="p-4">
                      <div className="font-semibold text-slate-200 truncate max-w-xs">{link.fileName}</div>
                      <div className="text-[10px] text-slate-400">{formatBytes(link.fileSize)}</div>
                    </td>
                    <td className="p-4">
                      {link.hasPassword ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          <Lock className="w-3 h-3" /> Password
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Unlock className="w-3 h-3" /> Public
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      {link.downloadCount} {link.downloadLimit ? `/ ${link.downloadLimit}` : ''}
                    </td>
                    <td className="p-4 text-slate-400">
                      {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isExpired ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {isExpired ? 'Expired' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => copyToClipboard(link.publicUrl)}
                        className="p-1.5 bg-surface-200 hover:bg-surface-300 text-slate-300 rounded-lg inline-flex items-center gap-1"
                        title="Copy Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={link.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-surface-200 hover:bg-surface-300 text-slate-300 rounded-lg inline-flex items-center gap-1"
                        title="Open Link"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => revokeLink(link.id)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        title="Revoke / Delete Link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
