import React, { useState, useEffect } from 'react';
import {
  FolderSync,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Trash2,
  Star,
  ExternalLink,
  Edit2,
  FileText,
  FileCode,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Grid,
  List,
  Check,
  X
} from 'lucide-react';
import api from '../services/api';

export default function MyFilesPage() {
  const [files, setFiles] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [loading, setLoading] = useState(true);

  // Rename modal
  const [renameFile, setRenameFile] = useState(null);
  const [newFileName, setNewFileName] = useState('');

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const catParam = activeCategory !== 'All' ? `&category=${activeCategory}` : '';
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const sortParam = sortBy ? `&sortBy=${sortBy}` : '';
      const res = await api.get(`/files?page=1&pageSize=100${catParam}${searchParam}${sortParam}`);

      setFiles(res.data.items);
      setTotalCount(res.data.totalCount);
      setTotalBytes(res.data.totalBytes);
    } catch (err) {
      console.warn('Failed to load files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [activeCategory, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFiles();
  };

  const toggleFavorite = async (fileId) => {
    try {
      await api.patch(`/files/${fileId}/favorite`);
      setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isFavorite: !f.isFavorite } : f));
    } catch (err) {
      alert('Failed to toggle favorite');
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('Move file to trash?')) return;
    try {
      await api.delete(`/files/${fileId}`);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const submitRename = async () => {
    if (!renameFile || !newFileName.trim()) return;
    try {
      await api.patch(`/files/${renameFile.id}/rename`, { newFileName });
      setFiles(prev => prev.map(f => f.id === renameFile.id ? { ...f, originalFileName: newFileName } : f));
      setRenameFile(null);
    } catch (err) {
      alert('Rename failed');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const categories = ['All', 'PDF', 'Document', 'Image', 'Video', 'Audio', 'Archive', 'Study', 'General'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Unified My Files</h1>
          <p className="text-xs text-slate-400">
            {totalCount} items • {formatBytes(totalBytes)} used across all workspaces
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-surface-200/80 p-1 rounded-xl border border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-semibold ${viewMode === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-semibold ${viewMode === 'table' ? 'bg-brand-600 text-white' : 'text-slate-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-brand-600 text-white shadow'
                  : 'bg-surface-100 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface-100 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </form>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-surface-100 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="size_desc">Largest</option>
            <option value="size_asc">Smallest</option>
            <option value="name_asc">A - Z</option>
          </select>
        </div>
      </div>

      {/* Files Content View */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading files...</div>
      ) : files.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-surface-100 rounded-2xl border border-slate-800 space-y-2">
          <FolderSync className="w-10 h-10 mx-auto text-slate-600" />
          <p>No files found in this category.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-surface-100 p-4 rounded-2xl border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-3 transition group"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold text-xs uppercase">
                  {file.fileExtension ? file.fileExtension.replace('.', '') : 'FILE'}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleFavorite(file.id)}
                    className={`p-1 rounded ${file.isFavorite ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={() => {
                      setRenameFile(file);
                      setNewFileName(file.originalFileName);
                    }}
                    className="p-1 text-slate-500 hover:text-slate-300"
                    title="Rename"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    title="Move to Trash"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-xs text-slate-200 truncate" title={file.originalFileName}>
                  {file.originalFileName}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {formatBytes(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString()}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <a
                  href={file.streamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" /> Preview
                </a>
                <a
                  href={file.downloadUrl}
                  download
                  className="text-slate-300 hover:text-white flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-100 rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-200/50 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px]">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Size</th>
                <th className="p-4">Uploaded</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-surface-200/40">
                  <td className="p-4 flex items-center gap-2 truncate max-w-xs font-medium text-slate-200">
                    <button onClick={() => toggleFavorite(file.id)}>
                      <Star className={`w-3.5 h-3.5 ${file.isFavorite ? 'text-amber-400 fill-current' : 'text-slate-600'}`} />
                    </button>
                    <span className="truncate">{file.originalFileName}</span>
                  </td>
                  <td className="p-4 text-slate-400">{file.fileCategory}</td>
                  <td className="p-4 text-slate-400 font-mono">{formatBytes(file.fileSize)}</td>
                  <td className="p-4 text-slate-400">{new Date(file.uploadedAt).toLocaleDateString()}</td>
                  <td className="p-4 text-right space-x-2">
                    <a href={file.streamUrl} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">
                      Preview
                    </a>
                    <a href={file.downloadUrl} download className="text-slate-300 hover:text-white">
                      Download
                    </a>
                    <button onClick={() => deleteFile(file.id)} className="text-rose-400 hover:underline">
                      Trash
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rename Dialog Modal */}
      {renameFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-slate-700 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Rename File</h3>
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="w-full px-3 py-2 bg-surface-200 border border-slate-700 rounded-xl text-xs text-white"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRenameFile(null)}
                className="px-3 py-1.5 bg-surface-200 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitRename}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
