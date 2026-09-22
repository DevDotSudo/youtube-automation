import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';

export const AppShell: React.FC = () => {
  const location = useLocation();
  const isEditorPage = location.pathname.includes('/render');

  return (
    <div className="w-screen h-screen bg-[#0A0C0F] text-[#E2E2E6] flex flex-col overflow-hidden selection:bg-[#8781FF]/30 selection:text-white">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden mt-9">
        {!isEditorPage && <Sidebar />}
        <main
          className={`flex-1 overflow-hidden bg-[#0A0C0F] ${
            isEditorPage ? 'm-0' : 'ml-60 overflow-y-auto'
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
