import React, { useState } from 'react';
import { CaptionPresetName, CaptionStyleConfig } from '../../../../shared/types';
import { CAPTION_PRESETS, AVAILABLE_FONTS, DEFAULT_HIGHLIGHT_WORDS } from '../../../../shared/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: CaptionStyleConfig;
  onApply: (style: CaptionStyleConfig) => void;
}

export const CaptionStyleModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentStyle,
  onApply
}) => {
  const [style, setStyle] = useState<CaptionStyleConfig>({ ...currentStyle });
  const [newKeyword, setNewKeyword] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (presetName: CaptionPresetName) => {
    const preset = CAPTION_PRESETS[presetName];
    if (preset) {
      setStyle({ ...preset });
    }
  };

  const handleAddKeyword = () => {
    const clean = newKeyword.trim().toLowerCase();
    if (clean && !style.highlightWords.includes(clean)) {
      setStyle((prev) => ({
        ...prev,
        highlightWords: [...prev.highlightWords, clean],
        preset: 'CUSTOM'
      }));
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (wordToRemove: string) => {
    setStyle((prev) => ({
      ...prev,
      highlightWords: prev.highlightWords.filter((w) => w !== wordToRemove),
      preset: 'CUSTOM'
    }));
  };

  const handleResetKeywords = () => {
    setStyle((prev) => ({
      ...prev,
      highlightWords: [...DEFAULT_HIGHLIGHT_WORDS],
      preset: 'CUSTOM'
    }));
  };

  const sampleSentence = "When your attention disappears, they suddenly feel the difference.";
  const sampleWords = sampleSentence.split(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1A1C1F] border border-[#464555]/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <header className="h-14 px-6 border-b border-[#464555]/30 flex items-center justify-between bg-[#141414] shrink-0">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#8781FF] text-[22px]">palette</span>
            <div>
              <h2 className="text-sm font-semibold text-[#E2E2E6]">Caption Style Studio</h2>
              <p className="text-[11px] font-mono text-[#918FA1]">Select a viral preset or customize typography, colors, and animations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#918FA1] hover:text-[#E2E2E6] hover:bg-[#282A2D] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* Preset Cards Grid */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-[#C4C0FF] uppercase tracking-wider font-mono">
              1. Choose a Preset Style
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Ghibli Storybook */}
              <button
                type="button"
                onClick={() => handleSelectPreset('GHIBLI_STORYBOOK')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'GHIBLI_STORYBOOK'
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B] shadow-md ring-1 ring-[#F59E0B]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#F59E0B] text-[18px]">auto_stories</span>
                  {style.preset === 'GHIBLI_STORYBOOK' && (
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">Ghibli Storybook</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">Warm serif (Merriweather), golden amber highlights</span>
              </button>

              {/* Cinematic Letterbox */}
              <button
                type="button"
                onClick={() => handleSelectPreset('CINEMATIC_LETTERBOX')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'CINEMATIC_LETTERBOX'
                    ? 'bg-[#FFD700]/15 border-[#FFD700] shadow-md ring-1 ring-[#FFD700]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#FFD700] text-[18px]">movie_filter</span>
                  {style.preset === 'CINEMATIC_LETTERBOX' && (
                    <span className="w-2 h-2 rounded-full bg-[#FFD700]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">Cinematic Letterbox</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">Cinzel serif, majestic gold with deep contrast</span>
              </button>

              {/* Minimalist Luxury */}
              <button
                type="button"
                onClick={() => handleSelectPreset('MINIMALIST_LUXURY')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'MINIMALIST_LUXURY'
                    ? 'bg-[#00F5D4]/15 border-[#00F5D4] shadow-md ring-1 ring-[#00F5D4]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#00F5D4] text-[18px]">diamond</span>
                  {style.preset === 'MINIMALIST_LUXURY' && (
                    <span className="w-2 h-2 rounded-full bg-[#00F5D4]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">Minimalist Luxury</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">Outfit geometric sans, ivory & emerald cyber accents</span>
              </button>

              {/* Neon Cyber */}
              <button
                type="button"
                onClick={() => handleSelectPreset('NEON_CYBER')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'NEON_CYBER'
                    ? 'bg-[#FF2A85]/15 border-[#FF2A85] shadow-md ring-1 ring-[#FF2A85]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#FF2A85] text-[18px]">electric_bolt</span>
                  {style.preset === 'NEON_CYBER' && (
                    <span className="w-2 h-2 rounded-full bg-[#FF2A85]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">Neon Cyber</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">Righteous retro synth, neon pink & cyan glow</span>
              </button>

              {/* Retro Typewriter */}
              <button
                type="button"
                onClick={() => handleSelectPreset('RETRO_TYPEWRITER')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'RETRO_TYPEWRITER'
                    ? 'bg-[#FFB703]/15 border-[#FFB703] shadow-md ring-1 ring-[#FFB703]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#FFB703] text-[18px]">edit_note</span>
                  {style.preset === 'RETRO_TYPEWRITER' && (
                    <span className="w-2 h-2 rounded-full bg-[#FFB703]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">Retro Script</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">Caveat handwritten, warm vintage amber tones</span>
              </button>

              {/* Bold Clean */}
              <button
                type="button"
                onClick={() => handleSelectPreset('BOLD_CLEAN')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'BOLD_CLEAN'
                    ? 'bg-[#FF5757]/15 border-[#FF5757] shadow-md ring-1 ring-[#FF5757]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#FF5757] text-[18px]">format_bold</span>
                  {style.preset === 'BOLD_CLEAN' && (
                    <span className="w-2 h-2 rounded-full bg-[#FF5757]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">Bold Clean</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">High-contrast white & coral, crisp stroke outline</span>
              </button>

              {/* Psych2Go Minimal */}
              <button
                type="button"
                onClick={() => handleSelectPreset('PSYCH2GO_MINIMAL')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'PSYCH2GO_MINIMAL'
                    ? 'bg-[#8781FF]/15 border-[#8781FF] shadow-md ring-1 ring-[#8781FF]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#8781FF] text-[18px]">psychology</span>
                  {style.preset === 'PSYCH2GO_MINIMAL' && (
                    <span className="w-2 h-2 rounded-full bg-[#8781FF]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">Psych2Go Minimal</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">Clean sans-serif, crimson red accents</span>
              </button>

              {/* Hormozi Pop */}
              <button
                type="button"
                onClick={() => handleSelectPreset('HORMOZI_POP')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'HORMOZI_POP'
                    ? 'bg-[#22C55E]/15 border-[#22C55E] shadow-md ring-1 ring-[#22C55E]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#22C55E] text-[18px]">bolt</span>
                  {style.preset === 'HORMOZI_POP' && (
                    <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">Hormozi Pop</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">Impact all-caps, lime-green on dark box</span>
              </button>

              {/* MrBeast Bounce */}
              <button
                type="button"
                onClick={() => handleSelectPreset('MRBEAST_BOUNCE')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'MRBEAST_BOUNCE'
                    ? 'bg-[#FFE600]/15 border-[#FFE600] shadow-md ring-1 ring-[#FFE600]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#FFE600] text-[18px]">local_fire_department</span>
                  {style.preset === 'MRBEAST_BOUNCE' && (
                    <span className="w-2 h-2 rounded-full bg-[#FFE600]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">MrBeast Bounce</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">Heavy black stroke, bright yellow with cyan accents</span>
              </button>

              {/* Cinematic Bar */}
              <button
                type="button"
                onClick={() => handleSelectPreset('CINEMATIC_BAR')}
                className={`p-3 rounded-xl border flex flex-col items-start gap-1.5 transition-all text-left cursor-pointer ${
                  style.preset === 'CINEMATIC_BAR'
                    ? 'bg-[#F59E0B]/15 border-[#F59E0B] shadow-md ring-1 ring-[#F59E0B]/40'
                    : 'bg-[#0B0D10] border-[#464555]/30 hover:border-[#464555]/60 hover:bg-[#1E2023]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="material-symbols-outlined text-[#F59E0B] text-[18px]">movie</span>
                  {style.preset === 'CINEMATIC_BAR' && (
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                  )}
                </div>
                <span className="text-xs font-semibold text-[#E2E2E6]">Cinematic Bar</span>
                <span className="text-[10px] text-[#918FA1] leading-tight">Letterspaced text on sleek lower-third black banner</span>
              </button>
            </div>
          </div>

          {/* Live Visual Preview Box */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#C4C0FF] uppercase tracking-wider font-mono">
                2. Live Preview
              </span>
              <span className="text-[11px] font-mono text-[#918FA1]">
                {style.fontFamily} • {style.fontSize}px • {style.allCaps ? 'ALL-CAPS' : 'Sentence Case'}
              </span>
            </div>

            <div className="w-full h-44 bg-[#08090B] rounded-xl border border-[#464555]/40 relative overflow-hidden flex items-center justify-center p-6 shadow-inner">
              {/* Simulated video frame background glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
              
              {/* Caption rendering */}
              <div
                className={`z-10 text-center transition-all ${
                  style.position === 'BOTTOM'
                    ? 'mt-auto mb-2'
                    : style.position === 'MIDDLE_LOWER'
                    ? 'mt-auto mb-6'
                    : 'my-auto'
                }`}
                style={{
                  backgroundColor: style.hasBackgroundBox
                    ? `${style.boxColor}${Math.round(style.boxOpacity * 255).toString(16).padStart(2, '0')}`
                    : 'transparent',
                  padding: style.hasBackgroundBox ? '8px 16px' : '0px',
                  borderRadius: style.hasBackgroundBox ? '10px' : '0px'
                }}
              >
                <p
                  style={{
                    fontFamily: style.fontFamily,
                    fontSize: `${Math.round(style.fontSize * 0.42)}px`,
                    color: style.primaryColor,
                    textTransform: style.allCaps ? 'uppercase' : 'none',
                    letterSpacing: style.preset === 'CINEMATIC_BAR' ? '0.08em' : 'normal',
                    fontWeight: style.preset === 'HORMOZI_POP' || style.preset === 'MRBEAST_BOUNCE' ? 900 : 700,
                    textShadow: style.outlineWidth > 0 && !style.hasBackgroundBox
                      ? `-${style.outlineWidth * 0.5}px -${style.outlineWidth * 0.5}px 0 ${style.outlineColor}, ${style.outlineWidth * 0.5}px -${style.outlineWidth * 0.5}px 0 ${style.outlineColor}, -${style.outlineWidth * 0.5}px ${style.outlineWidth * 0.5}px 0 ${style.outlineColor}, ${style.outlineWidth * 0.5}px ${style.outlineWidth * 0.5}px 0 ${style.outlineColor}, 0 2px 4px rgba(0,0,0,0.8)`
                      : '0 2px 4px rgba(0,0,0,0.6)'
                  }}
                  className="leading-snug select-none"
                >
                  {sampleWords.map((word, idx) => {
                    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
                    const isHighlight = style.highlightWords.includes(clean);
                    return (
                      <span
                        key={idx}
                        style={{
                          color: isHighlight ? style.highlightColor : style.primaryColor,
                          display: 'inline-block',
                          marginRight: '6px',
                          transform: isHighlight && (style.preset === 'HORMOZI_POP' || style.preset === 'MRBEAST_BOUNCE')
                            ? 'scale(1.08)'
                            : 'none',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </p>
              </div>

              {/* Preview badge */}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#1A1C1F]/80 text-[10px] font-mono text-[#918FA1] border border-[#464555]/20">
                16:9 Canvas Preview
              </div>
            </div>
          </div>

          {/* Custom Controls Grid */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold text-[#C4C0FF] uppercase tracking-wider font-mono">
              3. Fine-Tune Typography & Colors
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Column 1: Typography */}
              <div className="p-4 bg-[#0B0D10] rounded-xl border border-[#464555]/30 flex flex-col gap-3">
                <span className="text-xs font-mono font-semibold text-[#E2E2E6]">Typography</span>

                {/* Font Family */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-[#918FA1]">Font Family</label>
                  <select
                    value={style.fontFamily}
                    onChange={(e) => setStyle({ ...style, fontFamily: e.target.value, preset: 'CUSTOM' })}
                    className="h-8 px-2 bg-[#1A1C1F] border border-[#464555]/40 rounded text-xs text-[#E2E2E6] font-mono focus:outline-none"
                  >
                    {AVAILABLE_FONTS.map((font) => (
                      <option key={font} value={font} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font Size */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#918FA1]">Font Size</span>
                    <span className="font-mono text-[#C4C0FF]">{style.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={36}
                    max={80}
                    value={style.fontSize}
                    onChange={(e) => setStyle({ ...style, fontSize: parseInt(e.target.value, 10), preset: 'CUSTOM' })}
                    className="accent-[#8781FF] cursor-pointer"
                  />
                </div>

                {/* All Caps Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#918FA1]">Uppercase (ALL-CAPS)</span>
                  <input
                    type="checkbox"
                    checked={style.allCaps}
                    onChange={(e) => setStyle({ ...style, allCaps: e.target.checked, preset: 'CUSTOM' })}
                    className="rounded accent-[#8781FF] cursor-pointer"
                  />
                </div>

                {/* Position */}
                <div className="flex flex-col gap-1 pt-1">
                  <label className="text-[11px] text-[#918FA1]">Screen Position</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['BOTTOM', 'MIDDLE_LOWER', 'CENTER'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setStyle({ ...style, position: pos, preset: 'CUSTOM' })}
                        className={`py-1 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                          style.position === pos
                            ? 'bg-[#8781FF]/20 border-[#8781FF] text-[#C4C0FF]'
                            : 'bg-[#1A1C1F] border-[#464555]/30 text-[#918FA1] hover:text-[#E2E2E6]'
                        }`}
                      >
                        {pos === 'BOTTOM' ? 'Bottom' : pos === 'MIDDLE_LOWER' ? 'Mid-Low' : 'Center'}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Column 2: Colors & Outlines */}
              <div className="p-4 bg-[#0B0D10] rounded-xl border border-[#464555]/30 flex flex-col gap-3">
                <span className="text-xs font-mono font-semibold text-[#E2E2E6]">Colors & Stroke</span>

                {/* Primary Color */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-[#918FA1]">Primary Text Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={style.primaryColor}
                      onChange={(e) => setStyle({ ...style, primaryColor: e.target.value, preset: 'CUSTOM' })}
                      className="w-8 h-8 rounded border border-[#464555]/40 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={style.primaryColor.toUpperCase()}
                      onChange={(e) => setStyle({ ...style, primaryColor: e.target.value, preset: 'CUSTOM' })}
                      className="h-8 px-2 bg-[#1A1C1F] border border-[#464555]/40 rounded text-xs font-mono text-[#E2E2E6] w-24 uppercase"
                    />
                  </div>
                </div>

                {/* Highlight Accent Color */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] text-[#918FA1]">Highlight Accent Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={style.highlightColor}
                      onChange={(e) => setStyle({ ...style, highlightColor: e.target.value, preset: 'CUSTOM' })}
                      className="w-8 h-8 rounded border border-[#464555]/40 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={style.highlightColor.toUpperCase()}
                      onChange={(e) => setStyle({ ...style, highlightColor: e.target.value, preset: 'CUSTOM' })}
                      className="h-8 px-2 bg-[#1A1C1F] border border-[#464555]/40 rounded text-xs font-mono text-[#E2E2E6] w-24 uppercase"
                    />
                  </div>
                </div>

                {/* Outline Thickness */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#918FA1]">Outline Thickness</span>
                    <span className="font-mono text-[#C4C0FF]">{style.outlineWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={0.5}
                    value={style.outlineWidth}
                    onChange={(e) => setStyle({ ...style, outlineWidth: parseFloat(e.target.value), preset: 'CUSTOM' })}
                    className="accent-[#8781FF] cursor-pointer"
                  />
                </div>

                {/* Background Box */}
                <div className="flex flex-col gap-2 pt-1 border-t border-[#464555]/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#918FA1]">Background Box</span>
                    <input
                      type="checkbox"
                      checked={style.hasBackgroundBox}
                      onChange={(e) => setStyle({ ...style, hasBackgroundBox: e.target.checked, preset: 'CUSTOM' })}
                      className="rounded accent-[#8781FF] cursor-pointer"
                    />
                  </div>

                  {style.hasBackgroundBox && (
                    <div className="flex flex-col gap-1 pl-2 border-l-2 border-[#8781FF]/40">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#918FA1]">Box Opacity</span>
                        <span className="font-mono text-[#C4C0FF]">{Math.round(style.boxOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.05}
                        value={style.boxOpacity}
                        onChange={(e) => setStyle({ ...style, boxOpacity: parseFloat(e.target.value), preset: 'CUSTOM' })}
                        className="accent-[#8781FF] cursor-pointer"
                      />
                    </div>
                  )}
                </div>

              </div>

              {/* Column 3: Highlight Trigger Keywords */}
              <div className="p-4 bg-[#0B0D10] rounded-xl border border-[#464555]/30 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[#E2E2E6]">Highlight Keywords</span>
                  <button
                    type="button"
                    onClick={handleResetKeywords}
                    className="text-[10px] text-[#8781FF] hover:underline cursor-pointer font-mono"
                  >
                    Reset Defaults
                  </button>
                </div>
                <p className="text-[10px] text-[#918FA1]">
                  Words in your narration matching these terms will pop in your highlight color.
                </p>

                {/* Add Keyword Input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="Add trigger word..."
                    className="flex-1 h-7 px-2.5 bg-[#1A1C1F] border border-[#464555]/40 rounded text-xs font-mono text-[#E2E2E6] placeholder-[#918FA1] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="h-7 px-2.5 rounded bg-[#8781FF]/20 hover:bg-[#8781FF]/30 text-[#C4C0FF] text-xs font-mono cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {/* Keyword Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#141414] rounded-lg border border-[#464555]/20">
                  {style.highlightWords.map((word) => (
                    <span
                      key={word}
                      className="px-2 py-0.5 rounded-full bg-[#1E2023] border border-[#464555]/40 text-[10px] font-mono text-[#E2E2E6] flex items-center gap-1 group"
                    >
                      <span>{word}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(word)}
                        className="text-[#918FA1] hover:text-[#FF897D] text-[12px] cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="h-16 px-6 border-t border-[#464555]/30 bg-[#141414] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => handleSelectPreset(style.preset === 'CUSTOM' ? 'GHIBLI_STORYBOOK' : style.preset)}
            className="text-xs font-mono text-[#918FA1] hover:text-[#E2E2E6] cursor-pointer"
          >
            Reset Current Preset
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-[#1E2023] hover:bg-[#282A2D] text-[#E2E2E6] text-xs font-mono border border-[#464555]/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(style);
                onClose();
              }}
              className="h-9 px-5 rounded-lg bg-gradient-to-r from-[#8781FF] to-[#6C63FF] hover:from-[#9D98FF] hover:to-[#7E77FF] text-[#0C0E11] font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>Apply & Save Style</span>
            </button>
          </div>
        </footer>

      </div>
    </div>
  );
};
