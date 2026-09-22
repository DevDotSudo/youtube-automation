import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProjectsPage } from './pages/ProjectsPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { ReviewPage } from './pages/ReviewPage';
import { GenerationPage } from './pages/GenerationPage';
import { RenderPage } from './pages/RenderPage';
import { CompletedPage } from './pages/CompletedPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { SettingsPage } from './pages/SettingsPage';
import { PixazoTesterPage } from './pages/PixazoTesterPage';

export const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/new" replace />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/new" element={<NewProjectPage />} />
          <Route path="/project/:id/review" element={<ReviewPage />} />
          <Route path="/project/:id/generation" element={<GenerationPage />} />
          <Route path="/project/:id/render" element={<RenderPage />} />
          <Route path="/project/:id/completed" element={<CompletedPage />} />
          <Route path="/system" element={<SystemStatusPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/playground" element={<PixazoTesterPage />} />
          <Route path="*" element={<Navigate to="/projects" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
