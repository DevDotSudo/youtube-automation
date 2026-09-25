import React from 'react';

export const TitleBar: React.FC = () => {
  const handleMinimize = () => window.docuforge?.window?.minimize();
  const handleMaximize = () => window.docuforge?.window?.maximize();
  const handleClose = () => window.docuforge?.window?.close();

  return (
    <div className="fixed top-0 left-0 w-full h-9 z-50 bg-[#0F1115]/95 backdrop-blur-md flex items-center justify-between px-3 border-b border-white/[0.06] electron-drag select-none">
      {/* Brand & Mode Identifier */}
      <div className="flex items-center gap-2.5 electron-no-drag">
        <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-[#8781FF] to-[#C4C0FF] flex items-center justify-center text-[#0C0E11] shadow-sm shadow-[#8781FF]/30">
          <span className="material-symbols-outlined text-[13px] font-bold">terminal</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tracking-tight text-[#F0F0F3] font-bold font-display">Sudo Automation</span>
          <span className="text-[10px] font-mono tracking-wider font-semibold text-[#8781FF] bg-[#8781FF]/10 px-1.5 py-0.5 rounded border border-[#8781FF]/25 uppercase">
            Storyteller Studio
          </span>
          <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-white/[0.08] text-[11px] font-mono text-[#918FA1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4EDEA3] animate-pulse"></span>
            <span>Dual-Engine Active</span>
          </div>
        </div>
      </div>

      {/* Center project moniker if present */}
      <div className="hidden lg:flex items-center text-[11px] font-mono text-[#7D7A8B] tracking-wide">
        <span>Sudo Automation · Autonomous Video Production Engine</span>
      </div>

      {/* Window Controls */}
      <div className="flex items-center electron-no-drag -mr-1">
        <button
          onClick={handleMinimize}
          className="w-8 h-7 flex items-center justify-center text-[#918FA1] hover:bg-white/[0.06] hover:text-[#F0F0F3] rounded transition-colors"
          title="Minimize"
        >
          <span className="material-symbols-outlined text-[15px]">minimize</span>
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-7 flex items-center justify-center text-[#918FA1] hover:bg-white/[0.06] hover:text-[#F0F0F3] rounded transition-colors"
          title="Maximize"
        >
          <span className="material-symbols-outlined text-[13px]">crop_square</span>
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-7 flex items-center justify-center text-[#918FA1] hover:bg-[#FF453A] hover:text-white rounded transition-colors"
          title="Close"
        >
          <span className="material-symbols-outlined text-[15px]">close</span>
        </button>
      </div>
    </div>
  );
};
