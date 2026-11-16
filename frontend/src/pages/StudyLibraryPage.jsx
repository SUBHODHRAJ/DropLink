import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  FolderPlus,
  BookOpen,
  FileText,
  Search,
  Upload,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Bookmark,
  Highlighter,
  ChevronRight,
  ExternalLink,
  Download,
  Trash2,
  Folder,
  Layers,
  X,
  Check,
  Brain,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../services/api';

export default function StudyLibraryPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [activeSubject, setActiveSubject] = useState(null);
  const [studyNotes, setStudyNotes] = useState([]);

  // Smart Auto-Organization States
  const [suggestions, setSuggestions] = useState([]);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [orgLoading, setOrgLoading] = useState(false);

  // New Subject Modal
  const [showNewSubjectModal, setShowNewSubjectModal] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newSubjectSemester, setNewSubjectSemester] = useState('Semester 1');
  const [newSubjectColor, setNewSubjectColor] = useState('#38a9f6');

  // Academic Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Integrated PDF Reader Modal
  const [readerNote, setReaderNote] = useState(null);
  const [newBookmarkPage, setNewBookmarkPage] = useState(1);
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');

  // AI Study Assistant Panel
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiQueryType, setAiQueryType] = useState('summary');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchStudyData = async () => {
    try {
      const [dashRes, subRes] = await Promise.all([
        api.get('/study/dashboard'),
        api.get('/study/subjects')
      ]);
      setDashboardData(dashRes.data);
      setSubjects(subRes.data);
    } catch (err) {
      console.warn('Failed to load study data:', err);
    }
  };

  const fetchNotesForSubject = async (subjectId) => {
    try {
      const res = await api.get(`/study/notes?subjectId=${subjectId}`);
      setStudyNotes(res.data);
    } catch (err) {
      console.warn('Failed to load notes for subject:', err);
    }
  };

  useEffect(() => {
    fetchStudyData();
  }, []);

  const handleSelectSubject = (subject) => {
    setActiveSubject(subject);
    fetchNotesForSubject(subject.id);
  };

  // Create New Subject
  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const res = await api.post('/study/subjects', {
        subjectName: newSubjectName,
        subjectCode: newSubjectCode,
        semester: newSubjectSemester,
        color: newSubjectColor
      });
      setSubjects([...subjects, res.data]);
      setShowNewSubjectModal(false);
      setNewSubjectName('');
      setNewSubjectCode('');
      confetti({ particleCount: 50, spread: 50 });
    } catch (err) {
      alert('Failed to create subject.');
    }
  };

  // Smart Organization: Check & Analyze Pending Notes
  const checkSmartSuggestions = async () => {
    setOrgLoading(true);
    try {
      const res = await api.get('/study/smart-suggestions');
      setSuggestions(res.data);
      setShowOrgModal(true);
    } catch (err) {
      alert('Smart analysis error.');
    } finally {
      setOrgLoading(false);
    }
  };

  // Approve Smart Organization
  const approveOrganization = async () => {
    try {
      const items = suggestions.map(s => ({
        studyNoteId: s.studyNoteId,
        subjectName: s.suggestedSubject,
        semester: s.suggestedSemester,
        unitNumber: s.suggestedUnit,
        newDisplayName: s.suggestedTitle
      }));

      await api.post('/study/approve-organization', { items });
      setShowOrgModal(false);
      setSuggestions([]);
      fetchStudyData();
      if (activeSubject) fetchNotesForSubject(activeSubject.id);
      confetti({ particleCount: 90, spread: 70 });
    } catch (err) {
      alert('Approval failed.');
    }
  };

  // Academic Search Execution
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.get(`/study/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Open PDF Reader
  const openPdfReader = async (noteId) => {
    try {
      const res = await api.get(`/study/notes/${noteId}`);
      setReaderNote(res.data);
    } catch (err) {
      alert('Failed to load PDF reader data.');
    }
  };

  // Add Bookmark
  const addBookmark = async () => {
    if (!readerNote) return;
    try {
      const res = await api.post('/study/bookmarks', {
        studyNoteId: readerNote.id,
        pageNumber: parseInt(newBookmarkPage) || 1,
        title: newBookmarkTitle || `Page ${newBookmarkPage}`
      });
      setReaderNote(prev => ({
        ...prev,
        bookmarks: [...(prev.bookmarks || []), res.data]
      }));
      setNewBookmarkTitle('');
    } catch (err) {
      alert('Failed to add bookmark.');
    }
  };

  // Run AI Study Query
  const runAiQuery = async (type) => {
    setAiLoading(true);
    setAiQueryType(type);
    try {
      const res = await api.post('/study/ai-query', {
        studyNoteId: readerNote?.id || null,
        subjectId: activeSubject?.id || null,
        queryType: type
      });
      setAiResponse(res.data);
      setShowAiModal(true);
    } catch (err) {
      alert('AI Query failed.');
    } finally {
      setAiLoading(false);
    }
  };

  // Filter subjects by semester
  const semestersList = ['All', 'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
  const filteredSubjects = selectedSemester === 'All'
    ? subjects
    : subjects.filter(s => s.semester === selectedSemester);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <GraduationCap className="w-3.5 h-3.5" /> Workspace 3: Study Library
          </div>
          <h1 className="text-2xl font-extrabold text-white">Academic Notes & PDF Library</h1>
          <p className="text-xs text-slate-400">
            Intelligently organize lecture notes by semester, unit, and subject with OCR extraction, full-text search, and AI assistant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={checkSmartSuggestions}
            disabled={orgLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{orgLoading ? 'Analyzing...' : 'Smart Auto-Organize'}</span>
          </button>
          <button
            onClick={() => setShowNewSubjectModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-surface-200 hover:bg-surface-300 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <FolderPlus className="w-4 h-4 text-brand-400" />
            <span>New Subject</span>
          </button>
        </div>
      </div>

      {/* Smart Academic Full-Text Search Bar */}
      <form onSubmit={handleSearch} className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search inside PDF text, lecture slides, unit notes (e.g. 'Normalization', 'Deadlock', 'Binary Search')..."
          className="w-full pl-12 pr-28 py-3 bg-surface-100 border border-slate-800 rounded-2xl text-sm text-white focus:outline-none focus:border-amber-500 shadow-md transition"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="absolute right-2 top-2 px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl transition"
        >
          {isSearching ? 'Searching...' : 'Search Text'}
        </button>
      </form>

      {/* Academic Search Results Section if Active */}
      {searchResults.length > 0 && (
        <div className="bg-surface-100 p-6 rounded-2xl border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" /> Found {searchResults.length} Academic Matches
            </h3>
            <button onClick={() => setSearchResults([])} className="text-xs text-slate-400 hover:text-white">
              Clear Results
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {searchResults.map((res, idx) => (
              <div
                key={idx}
                onClick={() => openPdfReader(res.studyNoteId)}
                className="p-3.5 rounded-xl bg-surface-200/60 hover:bg-surface-200 border border-slate-800 cursor-pointer space-y-1 transition"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-200 truncate">{res.title}</span>
                  <span className="text-[10px] text-amber-400 font-mono font-semibold">
                    {res.pageNumber ? `Page ${res.pageNumber}` : 'Full Document'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">{res.subject} • {res.folderPath}</div>
                <p className="text-xs text-slate-300 italic bg-surface-300/40 p-2 rounded-lg border border-slate-800">
                  {res.snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Semester Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {semestersList.map((sem) => (
          <button
            key={sem}
            onClick={() => setSelectedSemester(sem)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedSemester === sem
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-surface-100 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {sem}
          </button>
        ))}
      </div>

      {/* Main Study Grid: Subjects on Left, Notes on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subjects Column */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Subjects ({filteredSubjects.length})
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredSubjects.length === 0 ? (
              <div className="p-6 bg-surface-100 rounded-2xl border border-slate-800 text-center text-xs text-slate-500 space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
                <p>No subjects found for this semester.</p>
                <button
                  onClick={() => setShowNewSubjectModal(true)}
                  className="text-xs text-brand-400 hover:underline"
                >
                  Create one now
                </button>
              </div>
            ) : (
              filteredSubjects.map((subject) => {
                const isSelected = activeSubject?.id === subject.id;
                return (
                  <div
                    key={subject.id}
                    onClick={() => handleSelectSubject(subject)}
                    className={`p-4 rounded-2xl cursor-pointer border transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-surface-200 border-amber-500/40 shadow-lg'
                        : 'bg-surface-100 hover:bg-surface-200/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md"
                        style={{ backgroundColor: subject.color || '#38a9f6' }}
                      >
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-100 truncate">{subject.subjectName}</div>
                        <div className="text-[11px] text-slate-400">
                          {subject.subjectCode || 'General'} • {subject.semester}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-surface-300 text-slate-300">
                      {subject.notesCount}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notes in Selected Subject Column */}
        <div className="lg:col-span-2 bg-surface-100 p-6 rounded-2xl border border-slate-800 min-h-[400px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-white text-base">
                  {activeSubject ? activeSubject.subjectName : 'Select a Subject'}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeSubject ? `${activeSubject.semester} • Unit lecture notes, PDFs & slides` : 'Click a subject on the left to view organized materials.'}
                </p>
              </div>

              {activeSubject && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runAiQuery('summary')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/20 border border-brand-500/30 text-brand-300 hover:bg-brand-600/30 text-xs font-semibold rounded-lg transition"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>AI Subject Summary</span>
                  </button>
                </div>
              )}
            </div>

            {/* Notes List */}
            {!activeSubject ? (
              <div className="text-center py-16 text-slate-500 text-xs space-y-2">
                <Folder className="w-12 h-12 mx-auto text-slate-700" />
                <p>Choose an academic subject to explore notes and documents.</p>
              </div>
            ) : studyNotes.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-700" />
                <p>No notes organized under this subject yet.</p>
                <p className="text-slate-400">Upload PDFs in the Share tab or run Smart Auto-Organize!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {studyNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 rounded-xl bg-surface-200/50 hover:bg-surface-200 border border-slate-800 flex flex-col justify-between space-y-3 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          {note.folderName || 'General Unit'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(note.fileSize / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-200 text-sm truncate" title={note.displayName}>
                        {note.displayName}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <button
                        onClick={() => openPdfReader(note.id)}
                        className="text-brand-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Open Reader
                      </button>
                      <button
                        onClick={() => {
                          openPdfReader(note.id);
                          runAiQuery('flashcards');
                        }}
                        className="text-amber-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Flashcards
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SMART AUTO-ORGANIZATION REVIEW MODAL */}
      {showOrgModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-white text-lg">Smart Notes Organization Preview</h3>
              </div>
              <button onClick={() => setShowOrgModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              DropLink analyzed the contents, topics, and unit markers of your uploaded notes. Review the proposed subject folders below before approving.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {suggestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No unorganized files found. All notes are currently categorized!
                </div>
              ) : (
                suggestions.map((s, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-surface-200/80 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400 truncate max-w-[200px]">{s.originalFileName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        Match Confidence: {Math.round(s.confidenceScore * 100)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Suggested Subject</span>
                        <div className="font-bold text-amber-400 mt-0.5">{s.suggestedSubject}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Target Unit / Module</span>
                        <div className="font-bold text-slate-200 mt-0.5">{s.suggestedUnit}</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-surface-300/40 p-2 rounded-lg">
                      {s.reason}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowOrgModal(false)}
                className="px-4 py-2 bg-surface-200 hover:bg-surface-300 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              {suggestions.length > 0 && (
                <button
                  onClick={approveOrganization}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Move Files</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INTEGRATED PDF READER MODAL */}
      {readerNote && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-2 sm:p-6">
          <div className="bg-surface-100 border border-slate-800 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-2xl">
            {/* Reader Header */}
            <div className="p-4 bg-surface-200/70 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">{readerNote.displayName}</h3>
                  <p className="text-[10px] text-slate-400">{readerNote.fileName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => runAiQuery('summary')}
                  className="px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI Summary
                </button>
                <a
                  href={readerNote.downloadUrl}
                  download
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-surface-300"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setReaderNote(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-surface-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Reader Body: Iframe Stream + Bookmarks Sidebar */}
            <div className="flex-1 flex overflow-hidden">
              {/* PDF Preview Frame */}
              <div className="flex-1 bg-surface-900 flex items-center justify-center p-2">
                <iframe
                  src={readerNote.streamUrl}
                  title={readerNote.displayName}
                  className="w-full h-full rounded-xl border border-slate-800"
                />
              </div>

              {/* Bookmarks & Extracted Notes Sidebar */}
              <div className="w-72 bg-surface-100 border-l border-slate-800 p-4 flex flex-col justify-between hidden md:flex">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    <span>Bookmarks & Highlights</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Page"
                        value={newBookmarkPage}
                        onChange={(e) => setNewBookmarkPage(e.target.value)}
                        className="w-16 px-2 py-1.5 bg-surface-200 border border-slate-700 rounded text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Bookmark title"
                        value={newBookmarkTitle}
                        onChange={(e) => setNewBookmarkTitle(e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-surface-200 border border-slate-700 rounded text-xs text-white"
                      />
                    </div>
                    <button
                      onClick={addBookmark}
                      className="w-full py-1.5 bg-surface-200 hover:bg-surface-300 text-slate-200 text-xs font-medium rounded border border-slate-700"
                    >
                      + Save Bookmark
                    </button>
                  </div>

                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {readerNote.bookmarks?.map((b) => (
                      <div key={b.id} className="p-2 rounded bg-surface-200/50 text-xs flex justify-between">
                        <span className="text-slate-200 truncate">{b.title}</span>
                        <span className="text-amber-400 font-mono text-[10px]">p.{b.pageNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-surface-200/40 rounded-xl text-[11px] text-slate-400">
                  Tip: Full text from this document is indexed in our Academic Search engine.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI STUDY ASSISTANT MODAL */}
      {showAiModal && aiResponse && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-slate-700 rounded-3xl max-w-xl w-full p-6 space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-white text-base">AI Academic Study Assistant</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs text-slate-300">
              <p className="whitespace-pre-line leading-relaxed">{aiResponse.resultText}</p>

              {aiResponse.flashcards?.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-amber-400 text-sm">Practice Revision Flashcards</h4>
                  {aiResponse.flashcards.map((f, i) => (
                    <div key={i} className="p-3 bg-surface-200 rounded-xl border border-slate-800 space-y-1">
                      <div className="font-bold text-white">Q: {f.question}</div>
                      <div className="text-slate-400 text-[11px]">A: {f.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW SUBJECT MODAL */}
      {showNewSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-100 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-white text-base">Add New Subject</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Operating Systems"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-surface-200 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300">Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CS401"
                    value={newSubjectCode}
                    onChange={(e) => setNewSubjectCode(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-surface-200 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Semester</label>
                  <select
                    value={newSubjectSemester}
                    onChange={(e) => setNewSubjectSemester(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-surface-200 border border-slate-700 rounded-lg text-xs text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={`Semester ${n}`}>Semester {n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewSubjectModal(false)}
                className="px-4 py-2 bg-surface-200 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubject}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg"
              >
                Save Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
