import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';

import {
  FileEdit,
  FileText,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Table as TableIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Save,
  Download,
  Share2,
  Plus,
  Trash2,
  Search,
  FolderPlus,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';

export default function EditPage() {
  const [workspaceMode, setWorkspaceMode] = useState('documents'); // 'documents' or 'notes'
  const [items, setItems] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  const [title, setTitle] = useState('Untitled Document');
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);

  const fileInputRef = useRef(null);

  // Initialize TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '<p>Start typing your document or notes here...</p>',
    onUpdate: () => {
      setSaveStatus('Unsaved changes...');
      triggerAutosave();
    },
  });

  // Debounced Autosave ref
  const autosaveTimer = useRef(null);
  const triggerAutosave = () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      saveCurrentItem();
    }, 1500);
  };

  // Fetch Items
  const fetchItems = async () => {
    try {
      const endpoint = workspaceMode === 'documents' ? '/edit/documents' : '/edit/notes';
      const res = await api.get(endpoint);
      setItems(res.data);
      if (res.data.length > 0 && !activeItemId) {
        selectItem(res.data[0]);
      }
    } catch (err) {
      console.warn('Failed to load items:', err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [workspaceMode]);

  const selectItem = (item) => {
    setActiveItemId(item.id);
    setTitle(item.title);
    if (editor && item.content) {
      editor.commands.setContent(item.content);
    }
    setSaveStatus('Saved');
    setGeneratedPdf(null);
  };

  const createNewItem = async () => {
    try {
      const endpoint = workspaceMode === 'documents' ? '/edit/documents' : '/edit/notes';
      const defaultTitle = workspaceMode === 'documents' ? 'Untitled Document' : 'New Note';
      const res = await api.post(endpoint, {
        title: defaultTitle,
        content: '<p></p>',
        plainText: '',
      });

      setItems([res.data, ...items]);
      selectItem(res.data);
    } catch (err) {
      console.error('Failed to create item:', err);
    }
  };

  const saveCurrentItem = async () => {
    if (!activeItemId || !editor) return;

    setSaveStatus('Saving...');
    try {
      const endpoint = workspaceMode === 'documents' 
        ? `/edit/documents/${activeItemId}` 
        : `/edit/notes/${activeItemId}`;

      const htmlContent = editor.getHTML();
      const textContent = editor.getText();

      await api.put(endpoint, {
        title: title || 'Untitled',
        content: htmlContent,
        plainText: textContent,
      });

      setSaveStatus('Saved');
      setItems(prev => prev.map(i => i.id === activeItemId ? { ...i, title: title, plainText: textContent } : i));
    } catch (err) {
      setSaveStatus('Error saving');
    }
  };

  const deleteCurrentItem = async () => {
    if (!activeItemId) return;
    if (!confirm('Are you sure you want to move this to trash?')) return;

    try {
      const endpoint = workspaceMode === 'documents' 
        ? `/edit/documents/${activeItemId}` 
        : `/edit/notes/${activeItemId}`;

      await api.delete(endpoint);
      const remaining = items.filter(i => i.id !== activeItemId);
      setItems(remaining);
      if (remaining.length > 0) {
        selectItem(remaining[0]);
      } else {
        setActiveItemId(null);
        setTitle('');
        editor?.commands.setContent('');
      }
    } catch (err) {
      alert('Delete failed');
    }
  };

  // Convert / Export to PDF via Server Engine
  const exportToPdf = async () => {
    if (!editor) return;
    setPdfGenerating(true);

    try {
      const res = await api.post('/edit/export-pdf', {
        title: title || 'DropLink Document',
        contentHtml: editor.getHTML(),
        contentJson: editor.getText(),
        saveToFiles: true
      });

      setGeneratedPdf(res.data);
      confetti({ particleCount: 70, spread: 60 });
    } catch (err) {
      alert('PDF generation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setPdfGenerating(false);
    }
  };

  // Upload and Insert Image
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post('/edit/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      editor.chain().focus().setImage({ src: res.data.url }).run();
    } catch (err) {
      alert('Image upload failed.');
    }
  };

  const filteredItems = items.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-100 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <FileEdit className="w-3.5 h-3.5" /> Workspace 2: Edit
          </div>
          <div className="flex bg-surface-200/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setWorkspaceMode('documents')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                workspaceMode === 'documents' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Word Documents
            </button>
            <button
              onClick={() => setWorkspaceMode('notes')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                workspaceMode === 'notes' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quick Notes
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {saveStatus}
          </span>
          <button
            onClick={saveCurrentItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-200 hover:bg-surface-300 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
          >
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          <button
            onClick={exportToPdf}
            disabled={pdfGenerating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{pdfGenerating ? 'Generating PDF...' : 'Export to PDF'}</span>
          </button>
          <button
            onClick={deleteCurrentItem}
            title="Delete Document"
            className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor & Sidebar Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Document List Panel */}
        <div className="w-64 bg-surface-100 rounded-2xl border border-slate-800 flex flex-col p-3 hidden md:flex">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {workspaceMode === 'documents' ? 'Documents' : 'Notes'}
            </span>
            <button
              onClick={createNewItem}
              className="p-1 text-brand-400 hover:text-brand-300 rounded hover:bg-brand-500/10"
              title="Create New"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-surface-200 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => selectItem(item)}
                className={`p-2.5 rounded-xl cursor-pointer text-xs transition ${
                  activeItemId === item.id
                    ? 'bg-brand-600/15 text-brand-300 border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-200/50'
                }`}
              >
                <div className="font-semibold truncate">{item.title || 'Untitled'}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {item.plainText || 'Empty content'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Canvas: Word Document Editor */}
        <div className="flex-1 bg-surface-100 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
          {/* Document Title Input */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaveStatus('Unsaved changes...');
                triggerAutosave();
              }}
              placeholder="Document Title..."
              className="text-lg font-bold text-white bg-transparent focus:outline-none w-full"
            />
          </div>

          {/* Formatting Toolbar */}
          {editor && (
            <div className="px-4 py-2 bg-surface-200/50 border-b border-slate-800 flex flex-wrap items-center gap-1 text-slate-300 text-xs">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive('bold') ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive('italic') ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive('underline') ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Underline"
              >
                <UnderlineIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive('strike') ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-slate-700 mx-1" />

              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive('heading', { level: 1 }) ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Heading 1"
              >
                <Heading1 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive('heading', { level: 2 }) ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-slate-700 mx-1" />

              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive('bulletList') ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive('orderedList') ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-slate-700 mx-1" />

              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive({ textAlign: 'left' }) ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive({ textAlign: 'center' }) ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`p-1.5 rounded hover:bg-surface-300 ${editor.isActive({ textAlign: 'right' }) ? 'bg-surface-300 text-brand-400' : ''}`}
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-slate-700 mx-1" />

              {/* Table Button */}
              <button
                onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                className="p-1.5 rounded hover:bg-surface-300"
                title="Insert Table (3x3)"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>

              {/* Image Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded hover:bg-surface-300"
                title="Insert Image"
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="w-[1px] h-4 bg-slate-700 mx-1" />

              <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="p-1.5 rounded hover:bg-surface-300 disabled:opacity-40"
                title="Undo"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="p-1.5 rounded hover:bg-surface-300 disabled:opacity-40"
                title="Redo"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Generated PDF Banner if ready */}
          {generatedPdf && (
            <div className="p-3 bg-brand-500/10 border-b border-brand-500/20 px-6 flex items-center justify-between text-xs text-brand-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>PDF generated and saved to My Files!</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={generatedPdf.downloadUrl}
                  download
                  className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded text-xs font-semibold"
                >
                  Download PDF
                </a>
              </div>
            </div>
          )}

          {/* Main Editing Canvas */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-surface-900/40">
            <div className="max-w-3xl mx-auto bg-surface-100 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-800 min-h-full">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
