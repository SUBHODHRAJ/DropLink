import React, { useState, useEffect } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  FolderSync,
  FileText
} from 'lucide-react';
import api from '../services/api';

export default function TrashPage() {
  const [deletedFiles, setDeletedFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    try {
      const res = await api.get('/files?isDeleted=true');
      setDeletedFiles(res.data.items);
    } catch (err) {
      console.warn('Failed to load trash:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const restoreFile = async (id) => {
    try {
      await api.post(`/files/${id}/restore`);
      setDeletedFiles(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert('Restore failed');
    }
  };

  const permanentlyDelete = async (id) => {
    if (!confirm('This action cannot be undone. Permanently delete file from disk?')) return;
    try {
      await api.delete(`/files/${id}?permanent=true`);
      setDeletedFiles(prev => prev.filter(f => f.id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Trash</h1>
          <p className="text-xs text-slate-400">Items here can be restored or permanently removed from your storage.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading trash...</div>
      ) : deletedFiles.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-surface-100 rounded-2xl border border-slate-800 space-y-2">
          <Trash2 className="w-10 h-10 mx-auto text-slate-600" />
          <p>Trash is empty.</p>
        </div>
      ) : (
        <div className="bg-surface-100 rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-200/50 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Size</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {deletedFiles.map((file) => (
                <tr key={file.id} className="hover:bg-surface-200/40">
                  <td className="p-4 font-medium text-slate-200 truncate max-w-xs">{file.originalFileName}</td>
                  <td className="p-4 text-slate-400 font-mono">{(file.fileSize / (1024 * 1024)).toFixed(2)} MB</td>
                  <td className="p-4 text-slate-400">{file.fileCategory}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => restoreFile(file.id)}
                      className="px-3 py-1 bg-surface-200 hover:bg-surface-300 text-slate-200 rounded text-xs inline-flex items-center gap-1 font-medium"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-400" /> Restore
                    </button>
                    <button
                      onClick={() => permanentlyDelete(file.id)}
                      className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded text-xs inline-flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3 h-3" /> Delete Permanently
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
