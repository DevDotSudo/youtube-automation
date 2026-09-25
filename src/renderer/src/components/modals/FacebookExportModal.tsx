import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/project.store';
import { FacebookViralPack } from '../../../../shared/types';

interface Props {
  projectId: string;
  onClose: () => void;
  onExportReel?: () => void;
}

export const FacebookExportModal: React.FC<Props> = ({ projectId, onClose, onExportReel }) => {
  const { currentProject, currentScenes } = useProjectStore();
  const [viralPack, setViralPack] = useState<FacebookViralPack | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadViralPack = async () => {
      setIsLoading(true);
      try {
        const fullScript = (currentScenes || []).map((s) => s.scriptText).join(' ') || '';
        const title = currentProject?.name || 'Facebook Reel';
        const niche = currentProject?.visualNiche || 'stoic_philosophy';

        if (window.docuforge?.stockMedia?.generateFacebookViralPack) {
          const pack = await window.docuforge.stockMedia.generateFacebookViralPack(fullScript, title, niche);
          setViralPack(pack);
        } else {
          // Client fallback
          setViralPack({
            hook: `Stop scrolling. Most people will never understand the true power behind this.`,
            caption: `🧠 3 Key Truths You Need Today:\n• Silence is often your greatest weapon in chaos.\n• What you resist persists — face reality with relentless composure.\n• Your mindset dictates your trajectory.\n\n💬 Which part resonates most? Drop a comment below 👇`,
            callToAction: 'Save this reel and share with someone building their mindset 🚀',
            hashtags: ['#reelsviral', '#mindsetshift', '#stoicism', '#discipline'],
            suggestedAudioVibe: 'Deep Ambient Sub-Bass & Cinematic Piano (Reels Trending)'
          });
        }
      } catch (err) {
        console.error('Failed generating Facebook viral pack:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadViralPack();
  }, [projectId, currentProject, currentScenes]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const getFullPost = (): string => {
    if (!viralPack) return '';
    if (viralPack.fullPostText) return viralPack.fullPostText;
    return [
      viralPack.caption,
      '',
      viralPack.callToAction,
      '',
      viralPack.hashtags.join(' ')
    ].join('\n');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-2xl bg-[#0F1115] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-gradient-to-r from-[#1877F2]/15 via-[#101216] to-[#0A57C2]/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1877F2]/20 border border-[#1877F2]/30 flex items-center justify-center text-[#1877F2]">
              <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-display">Facebook Viral Post Pack</h3>
                <span className="text-[10px] font-mono font-bold text-[#1877F2] bg-[#1877F2]/20 px-2 py-0.5 rounded border border-[#1877F2]/30">
                  9:16 REELS
                </span>
              </div>
              <span className="text-xs text-[#918FA1]">
                High-CTR Hook, Algorithm-Optimized Post Body, and 3-5 Viral Hashtags
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#918FA1] hover:text-white flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          {isLoading || !viralPack ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#918FA1]">
              <span className="material-symbols-outlined text-[32px] text-[#1877F2] animate-spin">progress_activity</span>
              <span>Analyzing script & generating viral Facebook metadata...</span>
            </div>
          ) : (
            <>
              {/* 1. Opening Hook */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#1877F2] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    Scroll-Stopping Hook (First 3 Seconds)
                  </span>
                  <button
                    onClick={() => copyToClipboard(viralPack.hook, 'hook')}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#C7C4D8] hover:text-white bg-white/[0.04] px-2 py-1 rounded hover:bg-white/[0.08] transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedKey === 'hook' ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedKey === 'hook' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-sm font-semibold text-white leading-relaxed font-sans">{viralPack.hook}</p>
              </div>

              {/* 2. Engaging Post Body & Discussion */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#4EDEA3] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">chat</span>
                    High-Engagement Post Caption
                  </span>
                  <button
                    onClick={() => copyToClipboard(viralPack.caption, 'caption')}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#C7C4D8] hover:text-white bg-white/[0.04] px-2 py-1 rounded hover:bg-white/[0.08] transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedKey === 'caption' ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedKey === 'caption' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="text-xs text-[#C7C4D8] leading-relaxed whitespace-pre-wrap font-sans font-normal">
                  {viralPack.caption}
                </pre>
              </div>

              {/* 3. 3-5 Targeted Viral Hashtags */}
              <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-[#FFB95F] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">tag</span>
                      Targeted Viral Hashtags ({viralPack.hashtags.length})
                    </span>
                    <span className="text-[9px] font-mono text-[#FFB95F] bg-[#FFB95F]/10 px-1.5 py-0.2 rounded border border-[#FFB95F]/20">
                      3-5 TAGS
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(viralPack.hashtags.join(' '), 'tags')}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#C7C4D8] hover:text-white bg-white/[0.04] px-2 py-1 rounded hover:bg-white/[0.08] transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copiedKey === 'tags' ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedKey === 'tags' ? 'Copied' : 'Copy Tags'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {viralPack.hashtags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-[#FFB95F]/10 border border-[#FFB95F]/25 text-[#FFB95F] font-mono text-xs font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 4. Audio Vibe Recommendation */}
              {viralPack.suggestedAudioVibe && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-2 text-[#918FA1]">
                    <span className="material-symbols-outlined text-[16px] text-[#C4C0FF]">graphic_eq</span>
                    <span className="text-[11px]">Recommended Facebook Reels Audio:</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#C4C0FF]">
                    {viralPack.suggestedAudioVibe}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#0A0C0F] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-medium transition-all"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => copyToClipboard(getFullPost(), 'fullPost')}
              disabled={!viralPack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold transition-all border border-white/[0.1] active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] text-[#1877F2]">
                {copiedKey === 'fullPost' ? 'check' : 'assignment'}
              </span>
              <span>{copiedKey === 'fullPost' ? 'Post Copied to Clipboard!' : '1-Click Copy Full Post'}</span>
            </button>

            {onExportReel && (
              <button
                onClick={() => {
                  onClose();
                  onExportReel();
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#1877F2] to-[#0A57C2] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#1877F2]/25"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                <span>Export 9:16 Video</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookExportModal;
