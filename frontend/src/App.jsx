import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import SharePage from './pages/SharePage';
import EditPage from './pages/EditPage';
import StudyLibraryPage from './pages/StudyLibraryPage';
import MyFilesPage from './pages/MyFilesPage';
import SharedLinksPage from './pages/SharedLinksPage';
import TrashPage from './pages/TrashPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import MobileSharePortal from './pages/MobileSharePortal';
import PublicShareView from './pages/PublicShareView';

export default function App() {
  return (
    <Routes>
      {/* Standalone Views (No Sidebar) */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/mobile-share" element={<MobileSharePortal />} />
      <Route path="/share/:token" element={<PublicShareView />} />

      {/* Main Workspace Layout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/edit" element={<EditPage />} />
        <Route path="/study" element={<StudyLibraryPage />} />
        <Route path="/files" element={<MyFilesPage />} />
        <Route path="/shared-links" element={<SharedLinksPage />} />
        <Route path="/recent" element={<MyFilesPage />} />
        <Route path="/favorites" element={<MyFilesPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
