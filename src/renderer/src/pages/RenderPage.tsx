import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/project.store';
import { getMediaUrl } from '../utils/media';
import { VisualShotType } from '../../../shared/enums';
import { VisualBeat, CaptionStyleConfig, SceneEditConfig, StockMediaItem } from '../../../shared/types';
import {
  CAPTION_PRESETS,
  EDGE_NEURAL_VOICES,
  COLOR_FILTER_PRESETS,
  ONLINE_BGM_TRACKS,
  TRANSITION_OPTIONS,
  MOTION_OPTIONS,
  VIDEO_EFFECT_PRESETS,
  IN_ANIMATION_OPTIONS,
  OUT_ANIMATION_OPTIONS
} from '../../../shared/constants';
import { CapCutExportModal } from '../components/modals/CapCutExportModal';
import { CaptionStyleModal } from '../components/modals/CaptionStyleModal';
import { YouTubeExportModal } from '../components/modals/YouTubeExportModal';
import { FacebookExportModal } from '../components/modals/FacebookExportModal';

interface TimelineBeatItem extends VisualBeat {
  globalStartMs: number;
  globalEndMs: number;
  parentSceneIndex: number;
  parentScriptText: string;
}

const SHOT_OPTIONS: { value: VisualShotType; label: string }[] = [
  { value: VisualShotType.WIDE_SCENE, label: 'Wide Scene' },
  { value: VisualShotType.MEDIUM_SCENE, label: 'Medium Scene' },
  { value: VisualShotType.CLOSE_UP, label: 'Close Up' },
  { value: VisualShotType.PROP_CLOSEUP, label: 'Prop Close-up' },
  { value: VisualShotType.REACTION_SHOT, label: 'Reaction Shot' },
  { value: VisualShotType.CONCEPT_SHOT, label: 'Concept Shot' },
  { value: VisualShotType.DIAGRAM, label: 'Diagram' },
  { value: VisualShotType.ENVIRONMENT_SHOT, label: 'Environment' },
  { value: VisualShotType.KEYWORD_SCENE, label: 'Keyword Scene' }
];

export const RenderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentProject,
    currentScenes,
    currentBeats,
    fetchProject,
    updateBeat,
    updateScene: _updateScene,
    autoEdit,
    regenerateBeatImage,
    replaceBeatImage
  } = useProjectStore();

  // CapCut Tab Navigation State
  const [activeTab, setActiveTab] = useState<'media' | 'audio' | 'text' | 'animations' | 'transitions' | 'filters' | 'effects' | 'voice'>('media');

  // Playback & Timeline State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
  const [timelineZoom, setTimelineZoom] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSafeGrid, setShowSafeGrid] = useState(false);

  // Track toggles
  const [videoVisible, setVideoVisible] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isAiHardEditing, setIsAiHardEditing] = useState(false);
  const [aiDirectorToast, setAiDirectorToast] = useState<string | null>(null);
  const [masterVoiceFailed, setMasterVoiceFailed] = useState(false);
  const [isRegeneratingBeat, setIsRegeneratingBeat] = useState(false);

  // VUZA Pinterest & Stock B-Roll Media State
  const [mediaSubTab, setMediaSubTab] = useState<'beats' | 'stock'>('beats');
  const [stockQuery, setStockQuery] = useState('aesthetic cinematography');
  const [stockSource, setStockSource] = useState<'all' | 'pinterest' | 'pexels' | 'pixabay'>('all');
  const [stockMediaType, setStockMediaType] = useState<'all' | 'video' | 'photo'>('video');
  const [stockResults, setStockResults] = useState<StockMediaItem[]>([]);
  const [isSearchingStock, setIsSearchingStock] = useState(false);
  const [downloadingStockId, setDownloadingStockId] = useState<string | null>(null);

  const handleSearchStockMedia = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : stockQuery).trim() || 'aesthetic cinematic';
    if (!window.docuforge?.stockMedia) return;
    setIsSearchingStock(true);
    try {
      const items = await window.docuforge.stockMedia.search(q, stockSource, stockMediaType);
      setStockResults(items || []);
    } catch (err) {
      console.error('[StockMedia] Search error:', err);
    } finally {
      setIsSearchingStock(false);
    }
  };

  const handleApplyStockToBeat = async (item: StockMediaItem) => {
    if (!selectedBeat || !id || !window.docuforge?.stockMedia) return;
    setDownloadingStockId(item.id);
    try {
      const res = await window.docuforge.stockMedia.downloadToBeat(item, selectedBeat.id, id);
      if (res?.localPath) {
        await fetchProject(id);
      }
    } catch (err: any) {
      console.error('[StockMedia] Download error:', err);
      alert('Failed to download media: ' + (err.message || String(err)));
    } finally {
      setDownloadingStockId(null);
    }
  };

  // Color Filter Preset State
  const [selectedColorFilter, setSelectedColorFilter] = useState<string>('none');
  const activeColorFilterCss = useMemo(() => {
    const matched = COLOR_FILTER_PRESETS.find((f) => f.id === selectedColorFilter);
    return matched ? matched.css : 'none';
  }, [selectedColorFilter]);

  // Voice selection & synthesis state
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-AndrewMultilingualNeural');
  const [isRegeneratingVoice, setIsRegeneratingVoice] = useState<boolean>(false);
  const [voiceVersion, setVoiceVersion] = useState<number>(Date.now());

  useEffect(() => {
    if (currentProject?.voiceId) {
      setSelectedVoice(currentProject.voiceId);
    }
  }, [currentProject?.voiceId]);

  const handleVoiceChange = async (newVoiceId: string) => {
    if (!id || !window.docuforge || isRegeneratingVoice) return;
    setSelectedVoice(newVoiceId);
    setIsRegeneratingVoice(true);
    try {
      if (isPlaying) setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      await (window as any).docuforge.projects.regenerateAllVoice(id, newVoiceId);
      await fetchProject(id);
      setVoiceVersion(Date.now());
      setMasterVoiceFailed(false);
    } catch (err: any) {
      console.error('Failed to update voice:', err);
      alert('Voice synthesis error: ' + (err.message || String(err)));
    } finally {
      setIsRegeneratingVoice(false);
    }
  };

  // Online BGM State (Zero local downloads)
  const [bgmTracks, setBgmTracks] = useState(ONLINE_BGM_TRACKS);
  const [selectedBgmId, setSelectedBgmId] = useState<string>('deliberate-thought');
  const [bgmVolume, setBgmVolume] = useState<number>(0.16);
  const [previewingBgmId, setPreviewingBgmId] = useState<string | null>(null);
  const [bgmCategoryFilter, setBgmCategoryFilter] = useState<string>('ALL');
  const [bgmSearchQuery, setBgmSearchQuery] = useState<string>('');
  const [isDuckingActive, setIsDuckingActive] = useState<boolean>(false);

  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmPreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (window.docuforge?.audio?.getBgmTracks) {
      window.docuforge.audio.getBgmTracks().then((tracks) => {
        if (tracks && tracks.length > 0) setBgmTracks(tracks as any);
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (currentProject?.musicPath && bgmTracks.length > 0) {
      if (currentProject.musicPath === 'none') {
        setSelectedBgmId('none');
      } else {
        const found = bgmTracks.find((t) => t.streamUrl === currentProject.musicPath || (t as any).filePath === currentProject.musicPath);
        if (found) setSelectedBgmId(found.id);
      }
    }
  }, [currentProject?.musicPath, bgmTracks]);

  const handleBgmChange = (newBgmId: string) => {
    setSelectedBgmId(newBgmId);
    if (!id || !window.docuforge) return;
    const track = bgmTracks.find((t) => t.id === newBgmId);
    const musicPath = newBgmId === 'none' ? 'none' : (track ? track.streamUrl : '');
    window.docuforge.projects.update(id, { musicPath }).catch(console.error);
  };

  const handleTogglePreviewBgm = (trackId: string, streamUrl: string) => {
    if (previewingBgmId === trackId) {
      if (bgmPreviewAudioRef.current) {
        bgmPreviewAudioRef.current.pause();
      }
      setPreviewingBgmId(null);
    } else {
      if (!bgmPreviewAudioRef.current) {
        bgmPreviewAudioRef.current = new Audio();
      }
      bgmPreviewAudioRef.current.src = streamUrl;
      bgmPreviewAudioRef.current.volume = 0.5;
      bgmPreviewAudioRef.current.play().catch(console.error);
      setPreviewingBgmId(trackId);
      bgmPreviewAudioRef.current.onended = () => setPreviewingBgmId(null);
    }
  };

  // Caption Styling State
  const [captionStyle, setCaptionStyle] = useState<CaptionStyleConfig>(CAPTION_PRESETS.GHIBLI_STORYBOOK);
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState(false);
  const [isSyncingCaptions, setIsSyncingCaptions] = useState(false);

  useEffect(() => {
    if (currentProject?.captionStyle) {
      setCaptionStyle(currentProject.captionStyle);
    }
  }, [currentProject?.captionStyle]);

  const handleApplyCaptionStyle = async (newStyle: CaptionStyleConfig) => {
    setCaptionStyle(newStyle);
    if (id && (window as any).docuforge?.projects?.updateCaptionStyle) {
      try {
        await (window as any).docuforge.projects.updateCaptionStyle(id, newStyle);
      } catch (e) {
        console.warn('Failed to persist caption style:', e);
      }
    }
  };

  // Modals State
  const [showCapCutExportModal, setShowCapCutExportModal] = useState(false);
  const [showYouTubePackModal, setShowYouTubePackModal] = useState(false);
  const [showFacebookPackModal, setShowFacebookPackModal] = useState(false);

  // Audio reference for master voice
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up audio on unmount
  useEffect(() => {

  return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.removeAttribute('src');
      }
      if (bgmPreviewAudioRef.current) {
        bgmPreviewAudioRef.current.pause();
        bgmPreviewAudioRef.current.removeAttribute('src');
      }
    };
  }, []);

  useEffect(() => {
    if (id) fetchProject(id);
  }, [id, fetchProject]);

  // Compute unified Visual Beats timeline with 100% exact voice audio duration synchronization
  const timelineBeats = useMemo<TimelineBeatItem[]>(() => {
    const items: TimelineBeatItem[] = [];
    let cumulativeStartMs = 0;

    currentScenes.forEach((scene) => {
      const sceneDuration = Math.max(500, scene.audioDurationMs || scene.durationMs || 4000);
      const sceneStart = cumulativeStartMs;
      const sceneEnd = sceneStart + sceneDuration;
      cumulativeStartMs = sceneEnd;

      const sceneBeats = currentBeats
        .filter((b) => b.sceneId === scene.id)
        .sort((a, b) => a.beatIndex - b.beatIndex);

      if (sceneBeats.length > 0) {
        const beatCount = sceneBeats.length;
        const baseDuration = Math.floor(sceneDuration / beatCount);
        const remainder = sceneDuration - (baseDuration * beatCount);

        let beatOffset = 0;
        sceneBeats.forEach((b, idx) => {
          const beatDuration = baseDuration + (idx < remainder ? 1 : 0);
          const bGlobalStart = sceneStart + beatOffset;
          const bGlobalEnd = bGlobalStart + beatDuration;
          beatOffset += beatDuration;

          items.push({
            ...b,
            durationMs: beatDuration,
            globalStartMs: bGlobalStart,
            globalEndMs: bGlobalEnd,
            parentSceneIndex: scene.sceneIndex,
            parentScriptText: scene.scriptText
          });
        });
      } else {
        items.push({
          id: `fallback_${scene.id}`,
          sceneId: scene.id,
          projectId: scene.projectId,
          beatIndex: 0,
          startOffsetMs: 0,
          endOffsetMs: sceneDuration,
          durationMs: sceneDuration,
          globalStartMs: sceneStart,
          globalEndMs: sceneEnd,
          parentSceneIndex: scene.sceneIndex,
          parentScriptText: scene.scriptText,
          shotType: VisualShotType.WIDE_SCENE,
          visualConcept: scene.scriptText,
          environmentDescription: 'Storybook environment',
          imagePrompt: scene.imagePrompt,
          imagePath: scene.imagePath,
          generationStatus: 'READY',
          motion: 'STATIC',
          transition: 'CUT',
          transitionDurationMs: 0,
          keywordEnabled: false
        });
      }
    });

    items.sort((a, b) => a.globalStartMs - b.globalStartMs);
    return items;
  }, [currentScenes, currentBeats]);

  const totalDurationMs = useMemo(() => {
    if (timelineBeats.length === 0) return currentProject?.durationMs || 10000;
    const last = timelineBeats[timelineBeats.length - 1];
    return Math.max(1000, last.globalEndMs);
  }, [timelineBeats, currentProject?.durationMs]);

  // Active Visual Beat & Scene at currentTimeMs
  const activeBeat = useMemo(() => {
    if (timelineBeats.length === 0) return null;
    return timelineBeats.find(
      (b) => currentTimeMs >= b.globalStartMs && currentTimeMs < b.globalEndMs
    ) || timelineBeats[0];
  }, [timelineBeats, currentTimeMs]);

  const activeScene = useMemo(() => {
    if (!activeBeat) return currentScenes[0];
    return currentScenes.find((s) => s.id === activeBeat.sceneId) || currentScenes[0];
  }, [currentScenes, activeBeat]);
  // Active Beat Video Effect & Live CSS Overlay / Filter (Zero-Download CapCut FX)
  const activeEffect = useMemo(() => {
    const effectId = activeBeat?.videoEffect || 'none';
    if (effectId === 'none') return null;
    return VIDEO_EFFECT_PRESETS.find((e) => e.id === effectId) || null;
  }, [activeBeat?.videoEffect]);

  const combinedFilterCss = useMemo(() => {
    const parts: string[] = [];
    if (activeColorFilterCss && activeColorFilterCss !== 'none') parts.push(activeColorFilterCss);
    if (activeEffect?.cssFilter && activeEffect.cssFilter !== 'none') parts.push(activeEffect.cssFilter);
    return parts.length > 0 ? parts.join(' ') : 'none';
  }, [activeColorFilterCss, activeEffect]);

  const activeCaptionText = useMemo(() => {
    return (
      activeScene?.captionText?.trim() ||
      activeScene?.scriptText?.trim() ||
      activeBeat?.visualConcept?.trim() ||
      ''
    );
  }, [activeScene, activeBeat]);

  const selectedBeat = useMemo(() => {
    if (selectedBeatId) {
      const found = timelineBeats.find((b) => b.id === selectedBeatId);
      if (found) return found;
    }
    return activeBeat || timelineBeats[0] || null;
  }, [timelineBeats, selectedBeatId, activeBeat]);

  // Master Voice Audio URL
  const masterVoiceUrl = useMemo(() => {
    if (!currentProject?.projectPath) return '';
    return getMediaUrl(`${currentProject.projectPath}/audio/master_voice.wav`) + `?v=${voiceVersion}`;
  }, [currentProject?.projectPath, voiceVersion]);

  // Dynamic In/Out Animation Transform & Opacity (CapCut Professional Standards)
  const liveAnimationStyles = useMemo(() => {
    if (!activeBeat) return { transform: '', opacity: 1 };
    const beatDuration = Math.max(500, activeBeat.durationMs);
    const elapsed = Math.max(0, Math.min(beatDuration, currentTimeMs - activeBeat.globalStartMs));
    const remaining = Math.max(0, activeBeat.globalEndMs - currentTimeMs);

    const inDur = Math.min(beatDuration / 2, activeBeat.inAnimationDurationMs || 350);
    const outDur = Math.min(beatDuration / 2, activeBeat.outAnimationDurationMs || 350);

    let transform = '';
    let opacity = 1;

    // IN ANIMATION PHASE (0 to inDur)
    if (elapsed < inDur && activeBeat.inAnimation && activeBeat.inAnimation !== 'NONE') {
      const p = elapsed / inDur; // 0.0 -> 1.0
      switch (activeBeat.inAnimation) {
        case 'FADE_IN':
          opacity = Math.max(0, p);
          break;
        case 'ZOOM_IN':
          transform = `scale(${1.18 - 0.18 * p})`;
          opacity = Math.min(1, p * 1.5);
          break;
        case 'ZOOM_OUT':
          transform = `scale(${0.88 + 0.12 * p})`;
          opacity = Math.min(1, p * 1.5);
          break;
        case 'SLIDE_LEFT':
          transform = `translateX(${25 * (1 - p)}%)`;
          opacity = Math.min(1, p * 2);
          break;
        case 'SLIDE_RIGHT':
          transform = `translateX(${-25 * (1 - p)}%)`;
          opacity = Math.min(1, p * 2);
          break;
        case 'SLIDE_UP':
          transform = `translateY(${25 * (1 - p)}%)`;
          opacity = Math.min(1, p * 2);
          break;
        case 'SLIDE_DOWN':
          transform = `translateY(${-25 * (1 - p)}%)`;
          opacity = Math.min(1, p * 2);
          break;
        case 'POP_IN': {
          const s = p < 0.7 ? 0.85 + (0.22 * (p / 0.7)) : 1.07 - (0.07 * ((p - 0.7) / 0.3));
          transform = `scale(${s})`;
          opacity = Math.min(1, p * 2.5);
          break;
        }
        case 'WIPE_IN':
          opacity = p;
          transform = `scale(${1.04 - 0.04 * p})`;
          break;
        case 'FLASH_WHITE':
          opacity = Math.min(1, p * 1.8);
          break;
      }
    }
    // OUT ANIMATION PHASE (beatDuration - outDur to beatDuration)
    else if (remaining < outDur && activeBeat.outAnimation && activeBeat.outAnimation !== 'NONE') {
      const p = 1 - (remaining / outDur); // 0.0 -> 1.0 as exiting
      switch (activeBeat.outAnimation) {
        case 'FADE_OUT':
          opacity = Math.max(0, 1 - p);
          break;
        case 'ZOOM_OUT':
          transform = `scale(${1.0 + 0.16 * p})`;
          opacity = Math.max(0, 1 - p * 1.2);
          break;
        case 'ZOOM_IN':
          transform = `scale(${1.0 - 0.12 * p})`;
          opacity = Math.max(0, 1 - p * 1.2);
          break;
        case 'SLIDE_LEFT':
          transform = `translateX(${-25 * p}%)`;
          opacity = Math.max(0, 1 - p * 1.5);
          break;
        case 'SLIDE_RIGHT':
          transform = `translateX(${25 * p}%)`;
          opacity = Math.max(0, 1 - p * 1.5);
          break;
        case 'SLIDE_DOWN':
          transform = `translateY(${25 * p}%)`;
          opacity = Math.max(0, 1 - p * 1.5);
          break;
        case 'WIPE_OUT':
          opacity = Math.max(0, 1 - p);
          break;
        case 'DIP_BLACK':
          opacity = Math.max(0, 1 - p);
          break;
        case 'FLASH_WHITE':
          opacity = Math.max(0, 1 - p * 0.5);
          break;
      }
    }

    return { transform, opacity };
  }, [activeBeat, currentTimeMs]);

  // Dynamic In/Out Animation Strobe & Dip Overlays
  const liveAnimationOverlay = useMemo(() => {
    if (!activeBeat) return null;
    const beatDuration = Math.max(500, activeBeat.durationMs);
    const elapsed = currentTimeMs - activeBeat.globalStartMs;
    const remaining = activeBeat.globalEndMs - currentTimeMs;

    const inDur = Math.min(beatDuration / 2, activeBeat.inAnimationDurationMs || 350);
    const outDur = Math.min(beatDuration / 2, activeBeat.outAnimationDurationMs || 350);

    // In Animation Overlay: FLASH_WHITE
    if (elapsed >= 0 && elapsed < inDur && activeBeat.inAnimation === 'FLASH_WHITE') {
      const p = elapsed / inDur;
      const opacity = Math.max(0, 1 - p) * 0.95;
      return <div className="absolute inset-0 bg-white pointer-events-none z-20 transition-opacity" style={{ opacity }} />;
    }

    // Out Animation Overlay: FLASH_WHITE
    if (remaining >= 0 && remaining < outDur && activeBeat.outAnimation === 'FLASH_WHITE') {
      const p = 1 - (remaining / outDur);
      const opacity = Math.min(0.95, p * 1.2);
      return <div className="absolute inset-0 bg-white pointer-events-none z-20 transition-opacity" style={{ opacity }} />;
    }

    // Out Animation Overlay: DIP_BLACK
    if (remaining >= 0 && remaining < outDur && activeBeat.outAnimation === 'DIP_BLACK') {
      const p = 1 - (remaining / outDur);
      const opacity = Math.min(1, p);
      return <div className="absolute inset-0 bg-black pointer-events-none z-20 transition-opacity" style={{ opacity }} />;
    }

    return null;
  }, [activeBeat, currentTimeMs]);

  // Ken Burns Camera Motion CSS Transformation
  const liveCameraTransform = useMemo(() => {
    if (!activeBeat || activeBeat.motion === 'STATIC') return 'scale(1.0) translate(0, 0)';
    const beatDuration = Math.max(500, activeBeat.durationMs);
    const elapsed = Math.max(0, Math.min(beatDuration, currentTimeMs - activeBeat.globalStartMs));
    const progress = elapsed / beatDuration;

    switch (activeBeat.motion) {
      case 'ZOOM_IN':
        return `scale(${1.0 + 0.08 * progress})`;
      case 'ZOOM_OUT':
        return `scale(${1.08 - 0.08 * progress})`;
      case 'PUSH_IN':
        return `scale(${1.0 + 0.04 * progress})`;
      case 'PUNCH_IN':
        return `scale(${1.0 + 0.12 * Math.min(1, progress * 2.5)})`;
      case 'PAN_LEFT':
        return `scale(1.08) translateX(${3 * (1 - progress)}%)`;
      case 'PAN_RIGHT':
        return `scale(1.08) translateX(${-3 * (1 - progress)}%)`;
      default:
        return 'scale(1.0)';
    }
  }, [activeBeat, currentTimeMs]);

  // Dynamic Canvas Transition Overlay (High Impact Visuals)
  const liveTransitionOverlay = useMemo(() => {
    if (!activeBeat || activeBeat.transition === 'CUT') return null;
    const dur = activeBeat.transitionDurationMs || 600;
    const elapsed = currentTimeMs - activeBeat.globalStartMs;
    if (elapsed < 0 || elapsed > dur) return null;
    const progress = elapsed / dur;

    if (activeBeat.transition === 'FADE_WHITE') {
      const opacity = Math.max(0, 1 - progress);
      return <div className="absolute inset-0 bg-white pointer-events-none z-15 transition-opacity" style={{ opacity }} />;
    }
    if (activeBeat.transition === 'FADE') {
      const opacity = Math.max(0, 1 - progress);
      return <div className="absolute inset-0 bg-black pointer-events-none z-15 transition-opacity" style={{ opacity }} />;
    }
    if (activeBeat.transition === 'DISSOLVE' || activeBeat.transition === 'SMOOTH_LEFT' || activeBeat.transition === 'WIPE_RIGHT') {
      const opacity = Math.max(0, (1 - progress) * 0.75);
      return <div className="absolute inset-0 bg-black/40 backdrop-blur-xs pointer-events-none z-15 transition-opacity" style={{ opacity }} />;
    }
    return null;
  }, [activeBeat, currentTimeMs]);

  // Playback Loop
  const tick = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      const audioTimeMs = Math.round(audioRef.current.currentTime * 1000);
      setCurrentTimeMs(audioTimeMs);
      if (audioTimeMs >= totalDurationMs) {
        setIsPlaying(false);
        audioRef.current.pause();
        setCurrentTimeMs(0);
        return;
      }
    } else {
      const now = performance.now();
      const delta = (now - lastTimeRef.current) * playbackSpeed;
      lastTimeRef.current = now;
      setCurrentTimeMs((prev) => {
        const next = prev + delta;
        if (next >= totalDurationMs) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  }, [totalDurationMs, playbackSpeed]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(tick);
      if (audioRef.current && audioEnabled && !masterVoiceFailed) {
        audioRef.current.currentTime = currentTimeMs / 1000;
        audioRef.current.play().catch(() => setMasterVoiceFailed(true));
      }
      // Play ambient BGM if active
      if (selectedBgmId !== 'none') {
        const track = bgmTracks.find((t) => t.id === selectedBgmId);
        if (track) {
          if (!bgmAudioRef.current) bgmAudioRef.current = new Audio();
          bgmAudioRef.current.src = track.streamUrl;
          bgmAudioRef.current.volume = isMuted ? 0 : bgmVolume;
          bgmAudioRef.current.loop = true;
          bgmAudioRef.current.play().catch(console.warn);
          setIsDuckingActive(true);
        }
      }
    } else {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioRef.current) audioRef.current.pause();
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        setIsDuckingActive(false);
      }
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, audioEnabled, masterVoiceFailed, selectedBgmId, bgmVolume, isMuted]);

  const handlePlayToggle = () => setIsPlaying(!isPlaying);

  const handleSeek = (targetMs: number) => {
    const clamped = Math.max(0, Math.min(totalDurationMs, targetMs));
    setCurrentTimeMs(clamped);
    if (audioRef.current) {
      audioRef.current.currentTime = clamped / 1000;
    }
  };

  const handleAiHardEdit = async () => {
    if (!id) return;
    setIsAiHardEditing(true);
    setAiDirectorToast('🎬 AI Master Animator & Editor: Analyzing narrative arc & cadence...');
    try {
      await autoEdit(id);
      setAiDirectorToast('✨ AI Hard Edit Applied: 3-act camera choreography, video effects, kinetic captions & BGM orchestrated!');
      setTimeout(() => setAiDirectorToast(null), 6000);
    } catch (err: any) {
      console.error('AI Hard Edit error:', err);
      setAiDirectorToast(`⚠️ AI Hard Edit: ${err.message || err}`);
      setTimeout(() => setAiDirectorToast(null), 5000);
    } finally {
      setIsAiHardEditing(false);
    }
  };

  const handleAutoCaptionSync = async () => {
    if (!id || !(window as any).docuforge?.projects?.syncCaptions) return;
    setIsSyncingCaptions(true);
    try {
      await (window as any).docuforge.projects.syncCaptions(id);
      await fetchProject(id);
    } catch (err: any) {
      console.error('Auto-caption sync error:', err);
      alert('Auto-caption error: ' + err.message);
    } finally {
      setIsSyncingCaptions(false);
    }
  };

  const handleReplaceSelectedBeatImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBeat) return;
    try {
      await replaceBeatImage(selectedBeat.id, (file as any).path || file.name);
    } catch (err) {
      console.error('Failed to replace beat image:', err);
    }
  };

  const handleRegenerateSelectedBeat = async () => {
    if (!selectedBeat) return;
    setIsRegeneratingBeat(true);
    try {
      await regenerateBeatImage(selectedBeat.id);
    } catch (err: any) {
      alert(`Image generation failed: ${err.message || String(err)}`);
    } finally {
      setIsRegeneratingBeat(false);
    }
  };

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const millis = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${millis}`;
  };

  const calculatedTrackWidth = useMemo(() => {
    const pxPerSec = 75 * timelineZoom;
    const totalSec = totalDurationMs / 1000;
    return Math.max(1200, Math.round(totalSec * pxPerSec));
  }, [totalDurationMs, timelineZoom]);

  // Filtered BGM tracks based on category and search
  const filteredBgmTracks = useMemo(() => {
    return bgmTracks.filter((track) => {
      const matchCat = bgmCategoryFilter === 'ALL' || track.category === bgmCategoryFilter;
      const matchSearch = !bgmSearchQuery || track.name.toLowerCase().includes(bgmSearchQuery.toLowerCase()) || track.category.toLowerCase().includes(bgmSearchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [bgmTracks, bgmCategoryFilter, bgmSearchQuery]);

  const bgmCategories = useMemo(() => {
    const cats = new Set<string>();
    bgmTracks.forEach((t) => { if (t.category) cats.add(t.category); });
    return ['ALL', ...Array.from(cats)];
  }, [bgmTracks]);


    // Canonical scene configs matching preview to export
  const sceneConfigs: SceneEditConfig[] = useMemo(() => {
    return currentScenes.map((s) => ({
      sceneId: s.id,
      startMs: s.startMs,
      endMs: s.endMs,
      imagePath: s.imagePath || '',
      audioPath: s.audioPath || '',
      captionText: s.captionText || s.scriptText || '',
      captionEnabled: s.captionEnabled !== false,
      captionStyle: captionStyle,
      videoEffect: s.videoEffect || 'none',
      motion: (s.motionType as any) || 'STATIC',
      transition: (s.transitionType as any) || 'DISSOLVE',
      transitionDurationMs: s.transitionDurationMs || 300,
      speed: 1.0,
      scale: 1.0,
      fit: 'cover',
      volume: 1.0,
      filter: selectedColorFilter
    }));
  }, [currentScenes, captionStyle, selectedColorFilter]);

  return (
    <div className="h-full flex flex-col bg-[#0E1013] text-[#E2E2E6] select-none overflow-hidden font-sans relative">
      {/* AI Director Telemetry Toast Banner */}
      {aiDirectorToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#1A1D23]/95 border border-[#8781FF]/40 backdrop-blur-md shadow-[0_0_25px_rgba(135,129,255,0.25)] flex items-center gap-2.5 text-xs text-[#E2E2E6] font-mono animate-in fade-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[18px] text-[#8781FF] animate-spin">auto_awesome</span>
          <span>{aiDirectorToast}</span>
        </div>
      )}
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleReplaceSelectedBeatImage}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Hidden Master Audio Element */}
      {masterVoiceUrl && (
        <audio
          ref={audioRef}
          src={masterVoiceUrl}
          preload="auto"
          onEnded={() => setIsPlaying(false)}
          onError={() => setMasterVoiceFailed(true)}
        />
      )}

      {/* CapCut Top Bar */}
      <header className="h-12 border-b border-[#23272F] px-4 flex items-center justify-between bg-[#14161B] shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/project/${id}/review`)}
            className="h-8 px-2.5 rounded-lg bg-[#1B1E24] hover:bg-[#252A32] text-xs text-[#918FA1] hover:text-[#E2E2E6] flex items-center gap-1.5 cursor-pointer transition-colors border border-[#2D323C]"
            title="Back to Scenes Review"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Review</span>
          </button>

          <div className="h-4 w-px bg-[#2D323C]" />

          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00E5FF] text-[20px]">movie_filter</span>
            <span className="text-xs font-bold text-[#E2E2E6] max-w-[280px] truncate">{currentProject?.name}</span>
            <span className="text-[10px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/30 px-2 py-0.5 rounded font-semibold">
              CapCut Editor 1080P
            </span>
          </div>
        </div>

        {/* Top Center Timecode Display */}
        <div className="hidden md:flex items-center gap-2 font-mono text-xs bg-[#090A0D] px-3 py-1 rounded-lg border border-[#23272F]">
          <span className="text-[#00E5FF] font-bold">{formatMs(currentTimeMs)}</span>
          <span className="text-[#918FA1]">/</span>
          <span className="text-[#918FA1]">{formatMs(totalDurationMs)}</span>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2.5">
          {/* AI Hard Edit: Master Animator & Editor */}
          <button
            onClick={handleAiHardEdit}
            disabled={isAiHardEditing}
            className="h-8 px-3.5 rounded-lg bg-gradient-to-r from-[#8781FF] via-[#4EDEA3] to-[#00E5FF] hover:opacity-95 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(135,129,255,0.3)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            title="Autonomous Hard Edit: AI acts as professional Animator & Director (3-act narrative arc, camera choreography, dynamic effects & kinetic subtitles)"
          >
            <span className="material-symbols-outlined text-[16px] animate-pulse">auto_awesome</span>
            <span>{isAiHardEditing ? 'Hard Editing...' : '⚡ AI Hard Edit'}</span>
          </button>

          <button
            onClick={handleAutoCaptionSync}
            disabled={isSyncingCaptions}
            className="h-8 px-3 rounded-lg bg-[#1B1E24] hover:bg-[#252A32] text-[#4EDEA3] font-mono text-xs border border-[#4EDEA3]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
            title="Synchronize audio speech boundaries with visual timeline"
          >
            <span className="material-symbols-outlined text-[16px]">{isSyncingCaptions ? 'sync' : 'graphic_eq'}</span>
            <span>{isSyncingCaptions ? 'Syncing...' : 'Sync Voice'}</span>
          </button>

          <button
            onClick={() => setShowYouTubePackModal(true)}
            className="h-8 px-3 rounded-lg bg-[#1B1E24] hover:bg-[#252A32] text-[#FFB95F] font-mono text-xs border border-[#FFB95F]/30 flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Open YouTube Thumbnail & Metadata Studio"
          >
            <span className="material-symbols-outlined text-[16px]">smart_display</span>
            <span>YouTube Pack</span>
          </button>

          <button
            onClick={() => setShowFacebookPackModal(true)}
            className="h-8 px-3 rounded-lg bg-[#1B1E24] hover:bg-[#252A32] text-[#1877F2] font-mono text-xs border border-[#1877F2]/30 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm shadow-[#1877F2]/10"
            title="Open Facebook Viral Pack (Hook, Post Caption, 3-5 Hashtags, Reels Export)"
          >
            <span className="material-symbols-outlined text-[16px]">video_library</span>
            <span>Facebook Pack</span>
          </button>

          {/* Glowing CapCut Cyan Export Button */}
          <button
            onClick={() => setShowCapCutExportModal(true)}
            className="h-8 px-4 rounded-lg bg-gradient-to-r from-[#00E5FF] to-[#0077FF] hover:from-[#33EBFF] hover:to-[#228BFF] text-black font-extrabold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
            title="Open CapCut Export Dialog (Resolution, FPS, Bitrate)"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Export</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-black/20 text-black font-mono font-bold">1080P</span>
          </button>
        </div>
      </header>

      {/* Main CapCut 3-Pane Body: Left Asset Drawer + Center Canvas + Right Inspector */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* CapCut Left Vertical Tab Strip */}
        <div className="w-16 border-r border-[#23272F] bg-[#14161B] flex flex-col items-center py-2 shrink-0 z-20">
          {[
            { id: 'media', icon: 'perm_media', label: 'Media' },
            { id: 'audio', icon: 'music_note', label: 'Audio' },
            { id: 'transitions', icon: 'transform', label: 'Transitions' },
            { id: 'filters', icon: 'filter_vintage', label: 'Filters' },
            { id: 'effects', icon: 'auto_fix_high', label: 'Effects' },
            { id: 'voice', icon: 'record_voice_over', label: 'Voice' }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center my-1 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/40 shadow-sm'
                    : 'text-[#918FA1] hover:text-[#E2E2E6] hover:bg-[#1E2229]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                <span className="text-[9px] font-mono mt-0.5">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* CapCut Left Drawer Content Panel (280px) */}
        <div className="w-72 border-r border-[#23272F] bg-[#111317] flex flex-col shrink-0 overflow-y-auto z-10">
          
          {/* TAB 1: MEDIA (Visual Beats & Pinterest/Stock B-Roll) */}
          {activeTab === 'media' && (
            <div className="p-3 flex flex-col gap-3">
              {/* Sub-tab toggle: Beats vs Pinterest/Stock B-Roll */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#090A0D] rounded-lg border border-[#23272F]">
                <button
                  onClick={() => setMediaSubTab('beats')}
                  className={`py-1 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors ${
                    mediaSubTab === 'beats'
                      ? 'bg-[#1E2229] text-[#00E5FF] shadow-sm'
                      : 'text-[#918FA1] hover:text-[#E2E2E6]'
                  }`}
                >
                  Beats ({timelineBeats.length})
                </button>
                <button
                  onClick={() => {
                    setMediaSubTab('stock');
                    if (stockResults.length === 0) handleSearchStockMedia();
                  }}
                  className={`py-1 text-[10px] font-mono font-bold rounded cursor-pointer transition-colors flex items-center justify-center gap-1 ${
                    mediaSubTab === 'stock'
                      ? 'bg-[#1E2229] text-[#E0245E] shadow-sm'
                      : 'text-[#918FA1] hover:text-[#E2E2E6]'
                  }`}
                >
                  <span>📌 Pinterest / B-Roll</span>
                </button>
              </div>

              {mediaSubTab === 'beats' ? (
                <>
                  <div className="flex items-center justify-between pb-1 border-b border-[#23272F]">
                    <span className="text-xs font-bold font-mono text-[#00E5FF] uppercase tracking-wider">Visual Beats ({timelineBeats.length})</span>
                    <span className="text-[10px] font-mono text-[#918FA1]">Click to jump</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {timelineBeats.map((beat, idx) => (
                      <div
                        key={beat.id}
                        onClick={() => {
                          setSelectedBeatId(beat.id);
                          handleSeek(beat.globalStartMs);
                        }}
                        className={`rounded-lg border p-1.5 flex flex-col gap-1 cursor-pointer transition-all ${
                          selectedBeat?.id === beat.id
                            ? 'border-[#00E5FF] bg-[#00E5FF]/10 ring-1 ring-[#00E5FF]/30'
                            : 'border-[#23272F] bg-[#181B20] hover:border-[#3D424F]'
                        }`}
                      >
                        <div className="w-full aspect-video bg-[#090A0D] rounded overflow-hidden relative">
                          {beat.imagePath ? (
                            beat.imagePath.toLowerCase().match(/\.(mp4|webm|mov|mkv)$/) ? (
                              <video src={getMediaUrl(beat.imagePath)} className="w-full h-full object-cover pointer-events-none" muted playsInline preload="metadata" />
                            ) : (
                              <img src={getMediaUrl(beat.imagePath)} alt={`Beat ${idx + 1}`} className="w-full h-full object-cover" />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#464555]">
                              <span className="material-symbols-outlined text-[16px]">image</span>
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-[8px] font-mono text-white">
                            {(beat.durationMs / 1000).toFixed(1)}s
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono">
                          <span className="text-[#E2E2E6] font-bold truncate">Beat {idx + 1}</span>
                          <span className="text-[#00E5FF] truncate">{beat.shotType.split('_')[0]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* STOCK & PINTEREST B-ROLL TAB */
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-[#23272F]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold font-mono text-[#E0245E] uppercase tracking-wider">Pinterest & B-Roll</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#E0245E]/20 text-[#E0245E] font-mono font-bold">VUZA</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#4EDEA3]">Free 1080p</span>
                  </div>

                  {/* Source & Media Filters */}
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                    <div className="flex items-center gap-1">
                      {(['all', 'pinterest', 'pexels', 'pixabay'] as const).map((src) => (
                        <button
                          key={src}
                          onClick={() => {
                            setStockSource(src);
                            handleSearchStockMedia();
                          }}
                          className={`px-1.5 py-0.5 rounded uppercase font-bold cursor-pointer transition-colors ${
                            stockSource === src
                              ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                              : 'text-[#918FA1] hover:text-[#E2E2E6]'
                          }`}
                        >
                          {src === 'all' ? 'All' : src === 'pinterest' ? '📌 Pins' : src}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      {(['video', 'photo', 'all'] as const).map((mt) => (
                        <button
                          key={mt}
                          onClick={() => {
                            setStockMediaType(mt);
                            handleSearchStockMedia();
                          }}
                          className={`px-1.5 py-0.5 rounded uppercase cursor-pointer transition-colors ${
                            stockMediaType === mt
                              ? 'bg-[#E0245E]/20 text-[#E0245E] border border-[#E0245E]/40 font-bold'
                              : 'text-[#918FA1] hover:text-[#E2E2E6]'
                          }`}
                        >
                          {mt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={stockQuery}
                      onChange={(e) => setStockQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchStockMedia()}
                      placeholder="Search aesthetic B-roll..."
                      className="flex-1 bg-[#181B20] border border-[#2B2F38] rounded-lg px-2.5 py-1.5 text-xs text-[#E2E2E6] placeholder-[#626173] focus:outline-none focus:border-[#E0245E]"
                    />
                    <button
                      onClick={() => handleSearchStockMedia()}
                      disabled={isSearchingStock}
                      className="h-8 px-2.5 bg-[#E0245E] text-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#C2185B] disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">{isSearchingStock ? 'hourglass_top' : 'search'}</span>
                    </button>
                  </div>

                  {/* Search Results */}
                  <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-0.5">
                    {stockResults.map((item) => {
                      const isDownloading = downloadingStockId === item.id;
                      return (
                        <div
                          key={item.id}
                          className="p-2 rounded-xl bg-[#181B20] border border-[#23272F] flex flex-col gap-1.5 hover:border-[#3D424F] transition-all"
                        >
                          <div className="w-full aspect-video bg-[#090A0D] rounded-lg overflow-hidden relative group">
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                              <span className="bg-black/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-mono text-[#00E5FF] uppercase font-bold">
                                {item.source}
                              </span>
                              <span className="bg-black/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-mono text-[#4EDEA3] uppercase">
                                {item.mediaType}
                              </span>
                            </div>
                            {item.durationSec && (
                              <span className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-white">
                                {item.durationSec}s
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-medium text-[#E2E2E6] truncate" title={item.title}>
                              {item.title}
                            </span>
                            <button
                              onClick={() => handleApplyStockToBeat(item)}
                              disabled={isDownloading || !selectedBeat}
                              className="h-6 px-2.5 rounded bg-[#00E5FF] hover:bg-[#33EBFF] text-black font-bold text-[10px] font-mono flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                            >
                              <span className="material-symbols-outlined text-[12px]">{isDownloading ? 'sync' : 'add'}</span>
                              <span>{isDownloading ? 'Importing...' : 'Use Beat'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* TAB 2: AUDIO / MUSIC (Expanded 100% Online Public Domain Catalog) */}
          {activeTab === 'audio' && (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#23272F]">
                <span className="text-xs font-bold font-mono text-[#4EDEA3] uppercase tracking-wider">Online Music ({bgmTracks.length})</span>
                <span className="text-[10px] font-mono text-[#4EDEA3] bg-[#00A572]/10 px-1.5 py-0.2 rounded border border-[#00A572]/30">
                  Zero Downloads
                </span>
              </div>

              {/* Search & Category Filter */}
              <input
                type="text"
                value={bgmSearchQuery}
                onChange={(e) => setBgmSearchQuery(e.target.value)}
                placeholder="Search moods, acoustic, piano..."
                className="bg-[#090A0D] border border-[#23272F] rounded-lg px-2.5 py-1.5 text-xs text-[#E2E2E6] font-mono focus:outline-none focus:border-[#4EDEA3]"
              />

              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                {bgmCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setBgmCategoryFilter(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono shrink-0 cursor-pointer transition-colors ${
                      bgmCategoryFilter === cat
                        ? 'bg-[#4EDEA3]/20 text-[#4EDEA3] border border-[#4EDEA3]/40'
                        : 'bg-[#181B20] text-[#918FA1] hover:text-[#E2E2E6]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* BGM Volume Slider in Drawer */}
              <div className="bg-[#181B20] p-2.5 rounded-xl border border-[#23272F] flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#918FA1]">
                  <span>BGM Ducking Volume</span>
                  <span className="text-[#4EDEA3] font-bold">{Math.round(bgmVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="1.0"
                  step="0.01"
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                  className="accent-[#4EDEA3] cursor-pointer w-full"
                />
              </div>

              {/* Tracks List */}
              <div className="flex flex-col gap-1.5 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => handleBgmChange('none')}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                    selectedBgmId === 'none'
                      ? 'border-[#FF5449] bg-[#FF5449]/10 text-[#FF897D]'
                      : 'border-[#23272F] bg-[#181B20] text-[#918FA1] hover:text-[#E2E2E6]'
                  }`}
                >
                  <span className="text-xs font-mono font-medium">None (Voice Only)</span>
                  {selectedBgmId === 'none' && <span className="material-symbols-outlined text-[16px]">check</span>}
                </button>

                {filteredBgmTracks.map((track) => {
                  const isSelected = selectedBgmId === track.id;
                  const isPreviewing = previewingBgmId === track.id;
                  return (
                    <div
                      key={track.id}
                      className={`p-2 rounded-lg border flex flex-col gap-1 transition-all ${
                        isSelected
                          ? 'border-[#4EDEA3] bg-[#4EDEA3]/10'
                          : 'border-[#23272F] bg-[#181B20] hover:border-[#3D424F]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#E2E2E6] truncate max-w-[160px]">{track.name.split('(')[0]}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePreviewBgm(track.id, track.streamUrl)}
                            className="w-6 h-6 rounded bg-[#090A0D] text-[#4EDEA3] flex items-center justify-center hover:bg-[#4EDEA3]/20 cursor-pointer"
                            title={isPreviewing ? 'Stop Preview' : 'Listen Online'}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {isPreviewing ? 'stop' : 'play_arrow'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleBgmChange(track.id)}
                            className={`h-6 px-2 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#4EDEA3] text-black font-bold'
                                : 'bg-[#090A0D] text-[#918FA1] hover:text-white'
                            }`}
                          >
                            {isSelected ? 'Applied' : 'Use'}
                          </button>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#918FA1] font-mono truncate">{track.category} ? Public Domain</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: ANIMATIONS (CapCut Style In & Out Animations) */}
          {activeTab === 'animations' && (
            <div className="p-3 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-[#23272F]">
                <span className="text-xs font-bold font-mono text-[#8781FF] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">animation</span>
                  <span>In / Out Animations</span>
                </span>
                <span className="text-[10px] font-mono text-[#918FA1]">Selected Beat</span>
              </div>

              {/* Quick AI Auto-Edit Re-run */}
              <button
                type="button"
                onClick={handleAiHardEdit}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#8781FF] to-[#635BFF] text-[#0C0E11] font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#8781FF]/20 hover:brightness-110 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
                <span>Auto-Choreograph All In/Out Animations</span>
              </button>

              {/* In Animations Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#8781FF] uppercase tracking-wide">
                    In Animations (Entry)
                  </span>
                  <span className="text-[10px] font-mono text-[#918FA1]">
                    {selectedBeat?.inAnimation || 'NONE'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {IN_ANIMATION_OPTIONS.map((opt) => {
                    const isSelected = (selectedBeat?.inAnimation || 'NONE') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => selectedBeat && updateBeat(selectedBeat.id, { inAnimation: opt.id as any })}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#8781FF] bg-[#8781FF]/15 text-[#8781FF] font-semibold'
                            : 'border-[#23272F] bg-[#181B20] text-[#918FA1] hover:text-[#E2E2E6] hover:bg-[#1E2229]'
                        }`}
                      >
                        <span className="text-xs font-mono truncate">{opt.label}</span>
                        {isSelected && <span className="material-symbols-outlined text-[15px]">check</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Out Animations Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#FFB95F] uppercase tracking-wide">
                    Out Animations (Exit)
                  </span>
                  <span className="text-[10px] font-mono text-[#918FA1]">
                    {selectedBeat?.outAnimation || 'NONE'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {OUT_ANIMATION_OPTIONS.map((opt) => {
                    const isSelected = (selectedBeat?.outAnimation || 'NONE') === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => selectedBeat && updateBeat(selectedBeat.id, { outAnimation: opt.id as any })}
                        className={`p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#FFB95F] bg-[#FFB95F]/15 text-[#FFB95F] font-semibold'
                            : 'border-[#23272F] bg-[#181B20] text-[#918FA1] hover:text-[#E2E2E6] hover:bg-[#1E2229]'
                        }`}
                      >
                        <span className="text-xs font-mono truncate">{opt.label}</span>
                        {isSelected && <span className="material-symbols-outlined text-[15px]">check</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}


          {/* TAB 4: TRANSITIONS */}
          {activeTab === 'transitions' && (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#23272F]">
                <span className="text-xs font-bold font-mono text-[#FFB95F] uppercase tracking-wider">Transitions</span>
                <span className="text-[10px] font-mono text-[#918FA1]">Selected Beat</span>
              </div>
              <div className="flex flex-col gap-2">
                {TRANSITION_OPTIONS.map((tr) => {
                  const isSelected = selectedBeat?.transition === tr.id;
                  return (
                    <button
                      key={tr.id}
                      onClick={() => selectedBeat && updateBeat(selectedBeat.id, { transition: tr.id as any })}
                      className={`p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#FFB95F] bg-[#FFB95F]/15 text-[#FFB95F]'
                          : 'border-[#23272F] bg-[#181B20] text-[#918FA1] hover:text-[#E2E2E6]'
                      }`}
                    >
                      <span className="text-xs font-mono font-medium">{tr.label}</span>
                      {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: FILTERS */}
          {activeTab === 'filters' && (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#23272F]">
                <span className="text-xs font-bold font-mono text-[#F59E0B] uppercase tracking-wider">Color Grade Filters</span>
                <span className="text-[10px] font-mono text-[#918FA1]">Procedural</span>
              </div>
              <div className="flex flex-col gap-2">
                {COLOR_FILTER_PRESETS.map((f) => {
                  const isSelected = selectedColorFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setSelectedColorFilter(f.id)}
                      className={`p-2.5 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#F59E0B] bg-[#F59E0B]/15 text-[#F59E0B]'
                          : 'border-[#23272F] bg-[#181B20] text-[#918FA1] hover:text-[#E2E2E6]'
                      }`}
                    >
                      <span className="text-xs font-mono font-medium">{f.label}</span>
                      {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: EFFECTS (Zero-Download CapCut FX) */}
          {activeTab === 'effects' && (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#23272F]">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-mono text-[#00E5FF] uppercase tracking-wider">Video Effects</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#8781FF]/20 text-[#8781FF] font-mono font-bold">CapCut FX</span>
                </div>
                <span className="text-[10px] font-mono text-[#4EDEA3]">Zero-Download</span>
              </div>
              <div className="flex flex-col gap-2">
                {VIDEO_EFFECT_PRESETS.map((eff) => {
                  const isSelected = (selectedBeat?.videoEffect || 'none') === eff.id;
                  const isCapCutPro = eff.id === 'vintage_noise' || eff.id === 'antique_film';
                  const isCapCutEffect = eff.id === 'analog_noise' || eff.id === 'vintage_noise' || eff.id === 'antique_film';
                  return (
                    <button
                      key={eff.id}
                      onClick={() => {
                        if (selectedBeat) {
                          updateBeat(selectedBeat.id, { videoEffect: eff.id as any });
                        }
                      }}
                      className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#00E5FF] bg-[#00E5FF]/15 text-[#00E5FF]'
                          : 'border-[#23272F] bg-[#181B20] text-[#918FA1] hover:text-[#E2E2E6]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {isCapCutPro && (
                            <span className="text-[11px] text-[#A855F7]" title="CapCut PRO Effect">💎</span>
                          )}
                          <span className="text-xs font-mono font-bold">{eff.name}</span>
                          {isCapCutEffect && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-mono font-bold">
                              CAPCUT
                            </span>
                          )}
                        </div>
                        {isSelected && <span className="material-symbols-outlined text-[16px]">check</span>}
                      </div>
                      <span className="text-[10px] text-[#918FA1] line-clamp-2">{eff.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 6: VOICE */}
          {activeTab === 'voice' && (
            <div className="p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#23272F]">
                <span className="text-xs font-bold font-mono text-[#00E5FF] uppercase tracking-wider">Neural Voices</span>
                <span className="text-[10px] font-mono text-[#4EDEA3]">100% Free HTTPS</span>
              </div>
              <div className="flex flex-col gap-2">
                {EDGE_NEURAL_VOICES.map((v) => {
                  const isSelected = selectedVoice === v.id;
                  return (
                    <button
                      key={v.id}
                      disabled={isRegeneratingVoice}
                      onClick={() => handleVoiceChange(v.id)}
                      className={`p-2.5 rounded-lg border text-left flex flex-col gap-0.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#00E5FF] bg-[#00E5FF]/15 text-[#00E5FF]'
                          : 'border-[#23272F] bg-[#181B20] text-[#918FA1] hover:text-[#E2E2E6]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{v.label.split('(')[0]}</span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-mono">
                            {isRegeneratingVoice ? 'Synthesizing...' : 'Active'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-[#918FA1] truncate">{v.tone}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Center Video Canvas Preview */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 bg-[#090A0D] relative overflow-hidden">
          {/* Responsive Canvas Container (16:9 Landscape or 9:16 Vertical Reel) */}
          <div className={`${
            currentProject?.aspectRatio === '9:16' || currentProject?.platform === 'FACEBOOK'
              ? 'h-full max-h-[520px] aspect-[9/16]'
              : 'w-full max-w-4xl aspect-video'
          } bg-[#111317] rounded-2xl border border-[#23272F] relative overflow-hidden shadow-2xl flex items-center justify-center`}>
            {/* Background Illustration with Ken Burns Camera Motion */}
            {activeBeat?.imagePath && videoVisible ? (
              <div
                className="w-full h-full flex items-center justify-center overflow-hidden"
                style={{
                  transform: `${liveCameraTransform} ${liveAnimationStyles.transform}`,
                  opacity: liveAnimationStyles.opacity,
                  transition: 'transform 0.08s linear, opacity 0.08s linear'
                }}
              >
                                {activeBeat.imagePath.toLowerCase().match(/\.(mp4|webm|mov|mkv)$/) ? (
                  <video
                    key={`render-active-vid-${activeBeat.id}`}
                    src={getMediaUrl(activeBeat.imagePath)}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover pointer-events-none"
                    style={{ filter: combinedFilterCss }}
                  />
                ) : (
                  <img
                    key={`render-active-${activeBeat.id}`}
                    src={getMediaUrl(activeBeat.imagePath)}
                    alt="Current Visual Beat"
                    className="w-full h-full object-cover pointer-events-none transition-all duration-300"
                    style={{ filter: combinedFilterCss }}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-[#918FA1] gap-2">
                <span className="material-symbols-outlined text-[48px]">movie</span>
                <span className="text-xs font-mono">No Image for Current Beat</span>
              </div>
            )}

            {/* Procedural Video Effect Live CSS Overlay (e.g. Scanlines, Celluloid grain/dust, Vignette) */}
            {activeEffect?.cssOverlay && videoVisible && (
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{ background: activeEffect.cssOverlay }}
              />
            )}

            {/* Dynamic Canvas Transition Overlay */}
            {liveTransitionOverlay}
            {liveAnimationOverlay}

            {/* Beat Meta Badge in Preview */}
            <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
              <span className="bg-[#090A0D]/80 backdrop-blur px-2.5 py-1 rounded text-xs font-mono text-[#00E5FF] border border-[#00E5FF]/30 font-semibold">
                {activeBeat?.shotType || 'SHOT'}
              </span>
              <span className="bg-[#090A0D]/80 backdrop-blur px-2.5 py-1 rounded text-xs font-mono text-[#4EDEA3] border border-[#4EDEA3]/30">
                {activeBeat?.motion || 'STATIC'}
              </span>
            </div>

            {/* Safe Area Grid Guide */}
            {showSafeGrid && (
              <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#00E5FF]/30 m-6 rounded-lg flex items-center justify-center">
                <div className="w-1/2 h-1/2 border border-dotted border-[#00E5FF]/20" />
              </div>
            )}
          </div>

          {/* Quick Preview Toolbar beneath canvas */}
          <div className="flex items-center gap-4 mt-3 text-xs text-[#918FA1] font-mono">
            <span>{formatMs(currentTimeMs)} / {formatMs(totalDurationMs)}</span>
            <div className="h-3 w-px bg-[#23272F]" />
            <button
              onClick={() => setShowSafeGrid((prev) => !prev)}
              className={`px-2 py-0.5 rounded cursor-pointer ${showSafeGrid ? 'bg-[#00E5FF]/20 text-[#00E5FF]' : 'hover:text-[#E2E2E6]'}`}
            >
              Safe Grid
            </button>

            <button
              onClick={() => setVideoVisible((prev) => !prev)}
              className={`px-2 py-0.5 rounded cursor-pointer ${videoVisible ? 'bg-[#00E5FF]/20 text-[#00E5FF]' : 'hover:text-[#E2E2E6]'}`}
            >
              Video
            </button>
            <button
              onClick={() => setAudioEnabled((prev) => !prev)}
              className={`px-2 py-0.5 rounded cursor-pointer ${audioEnabled ? 'bg-[#00E5FF]/20 text-[#00E5FF]' : 'hover:text-[#E2E2E6]'}`}
            >
              Voice {audioEnabled ? 'ON' : 'OFF'}
            </button>
            {isDuckingActive && (
              <span className="text-[10px] text-[#4EDEA3] bg-[#00A572]/20 border border-[#00A572]/40 px-2 py-0.5 rounded font-mono">
                BGM Ducking
              </span>
            )}
          </div>
        </div>

        {/* Right Inspector Panel (CapCut Beat Properties) */}
        <aside className="w-72 border-l border-[#23272F] bg-[#14161B] flex flex-col shrink-0 overflow-y-auto p-3 gap-3">
          <div className="flex items-center justify-between border-b border-[#23272F] pb-2">
            <span className="text-xs font-mono font-bold text-[#00E5FF] uppercase tracking-wider">
              Beat Inspector
            </span>
            <span className="text-[11px] font-mono text-[#918FA1]">
              Beat {(selectedBeat?.beatIndex ?? 0) + 1}
            </span>
          </div>

          {selectedBeat ? (
            <div className="flex flex-col gap-3">
              {/* Beat Thumbnail & Actions */}
              <div className="w-full aspect-video bg-[#090A0D] rounded-xl border border-[#23272F] overflow-hidden relative group">
                {selectedBeat.generationStatus === 'READY' && selectedBeat.imagePath ? (
                  selectedBeat.imagePath.toLowerCase().match(/\.(mp4|webm|mov|mkv)$/) ? (
                    <video
                      key={`render-insp-vid-${selectedBeat.id}`}
                      src={getMediaUrl(selectedBeat.imagePath)}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      key={`render-insp-${selectedBeat.id}`}
                      src={getMediaUrl(selectedBeat.imagePath)}
                      alt="Selected Beat"
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#464555]">
                    <span className="material-symbols-outlined text-[32px]">image</span>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-90 group-hover:opacity-100">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="h-6 px-2 bg-black/80 text-[10px] text-[#E2E2E6] rounded border border-[#2D323C] cursor-pointer hover:bg-black"
                  >
                    Replace
                  </button>
                  <button
                    onClick={handleRegenerateSelectedBeat}
                    disabled={isRegeneratingBeat}
                    className="h-6 px-2 bg-[#00E5FF] text-[10px] text-black font-bold rounded cursor-pointer disabled:opacity-50 hover:bg-[#33EBFF]"
                  >
                    {isRegeneratingBeat ? 'Generating...' : 'Regenerate'}
                  </button>
                </div>
              </div>

              {/* Shot Type */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-[#918FA1]">SHOT TYPE</label>
                <select
                  value={selectedBeat.shotType}
                  onChange={(e) => updateBeat(selectedBeat.id, { shotType: e.target.value as VisualShotType })}
                  className="bg-[#090A0D] border border-[#23272F] rounded-lg px-2.5 py-1.5 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                >
                  {SHOT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera Motion */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-[#918FA1]">CAMERA MOTION</label>
                <select
                  value={selectedBeat.motion}
                  onChange={(e) => updateBeat(selectedBeat.id, { motion: e.target.value as any })}
                  className="bg-[#090A0D] border border-[#23272F] rounded-lg px-2.5 py-1.5 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                >
                  {MOTION_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transition */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-[#918FA1]">TRANSITION</label>
                <select
                  value={selectedBeat.transition}
                  onChange={(e) => updateBeat(selectedBeat.id, { transition: e.target.value as any })}
                  className="bg-[#090A0D] border border-[#23272F] rounded-lg px-2.5 py-1.5 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                >
                  {TRANSITION_OPTIONS.map((tr) => (
                    <option key={tr.id} value={tr.id}>
                      {tr.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video Effect (Zero-Download Procedural Math) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-[#918FA1]">VIDEO EFFECT</label>
                <select
                  value={selectedBeat.videoEffect || 'none'}
                  onChange={(e) => updateBeat(selectedBeat.id, { videoEffect: e.target.value as any })}
                  className="bg-[#090A0D] border border-[#23272F] rounded-lg px-2.5 py-1.5 text-xs text-[#E2E2E6] focus:outline-none focus:border-[#8781FF] cursor-pointer"
                >
                  {VIDEO_EFFECT_PRESETS.map((eff) => (
                    <option key={eff.id} value={eff.id}>
                      {eff.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Stepper */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-[#918FA1]">DURATION</label>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateBeat(selectedBeat.id, { durationMs: Math.max(500, selectedBeat.durationMs - 500) })}
                    className="h-8 px-2.5 bg-[#090A0D] border border-[#23272F] rounded text-xs text-[#918FA1] hover:text-white cursor-pointer"
                  >
                    -0.5s
                  </button>
                  <input
                    type="number"
                    step="100"
                    min="500"
                    value={selectedBeat.durationMs}
                    onChange={(e) => updateBeat(selectedBeat.id, { durationMs: parseInt(e.target.value, 10) || 1000 })}
                    className="flex-1 h-8 bg-[#090A0D] border border-[#23272F] rounded-lg px-2 text-xs text-[#E2E2E6] text-center font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => updateBeat(selectedBeat.id, { durationMs: selectedBeat.durationMs + 500 })}
                    className="h-8 px-2.5 bg-[#090A0D] border border-[#23272F] rounded text-xs text-[#918FA1] hover:text-white cursor-pointer"
                  >
                    +0.5s
                  </button>
                </div>
              </div>

              {/* Storytelling Concept */}
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-[10px] font-mono text-[#918FA1]">SCENE SCRIPT</span>
                <p className="text-[#C7C4D8] text-[11px] italic bg-[#090A0D] p-2 rounded-lg border border-[#23272F]">
                  "{selectedBeat.parentScriptText}"
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[#918FA1] text-center py-8">
              Click a Visual Beat on the timeline to inspect.
            </div>
          )}
        </aside>
      </div>

      {/* CapCut Multi-Track Timeline */}
      <div className="h-64 border-t border-[#23272F] bg-[#111317] flex flex-col shrink-0 select-none">
        
        {/* Timeline Header Toolbar */}
        <div className="h-10 border-b border-[#23272F] px-4 flex items-center justify-between bg-[#14161B]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSeek(0)}
              className="text-[#918FA1] hover:text-[#E2E2E6] cursor-pointer"
              title="Jump to Start"
            >
              <span className="material-symbols-outlined text-[18px]">skip_previous</span>
            </button>

            <button
              onClick={handlePlayToggle}
              className="w-7 h-7 rounded-full bg-gradient-to-r from-[#00E5FF] to-[#0077FF] text-black flex items-center justify-center font-bold cursor-pointer hover:brightness-110 transition-transform active:scale-95 shadow"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            <button
              onClick={() => handleSeek(totalDurationMs)}
              className="text-[#918FA1] hover:text-[#E2E2E6] cursor-pointer"
              title="Jump to End"
            >
              <span className="material-symbols-outlined text-[18px]">skip_next</span>
            </button>

            <span className="text-xs font-mono text-[#00E5FF] font-semibold ml-2">
              {formatMs(currentTimeMs)}
            </span>

            {/* Playback Speed */}
            <div className="flex items-center gap-1 text-xs font-mono text-[#918FA1] ml-4">
              <span>Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="bg-[#090A0D] text-[#E2E2E6] border border-[#23272F] rounded px-1.5 py-0.5 text-xs focus:outline-none cursor-pointer"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>
            </div>

            {/* Volume / Mute */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#918FA1] ml-4">
              <button
                onClick={() => setIsMuted((prev) => !prev)}
                className="text-[#918FA1] hover:text-[#E2E2E6] cursor-pointer"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isMuted ? 'volume_off' : 'volume_up'}
                </span>
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                className="w-14 accent-[#00E5FF] cursor-pointer"
                title="Voice Volume"
              />
            </div>
          </div>

          {/* Timeline Zoom Slider */}
          <div className="flex items-center gap-2 text-xs font-mono text-[#918FA1]">
            <span className="material-symbols-outlined text-[16px]">zoom_out</span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={timelineZoom}
              onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
              className="w-24 accent-[#00E5FF] cursor-pointer"
            />
            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
            <button
              onClick={() => setTimelineZoom(1.0)}
              className="h-6 px-2 rounded bg-[#1B1E24] text-[10px] font-mono text-[#918FA1] hover:text-white border border-[#2D323C] cursor-pointer"
            >
              Fit
            </button>
          </div>
        </div>

        {/* Scrollable Multi-Track Timeline Canvas */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden p-3 relative"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left + e.currentTarget.scrollLeft;
            const targetMs = (clickX / calculatedTrackWidth) * totalDurationMs;
            handleSeek(targetMs);
          }}
        >
          <div
            className="h-full flex flex-col gap-1.5 relative"
            style={{ width: `${calculatedTrackWidth}px` }}
          >
            {/* Draggable Playhead Needle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#00E5FF] z-30 pointer-events-none"
              style={{ left: `${(currentTimeMs / totalDurationMs) * 100}%` }}
            >
              <div className="w-3 h-3 bg-[#00E5FF] -ml-1.25 -mt-1 rotate-45 shadow" />
            </div>

            {/* TRACK 1: Visual Beats Track (CapCut Clip Cards with Transitions) */}
            <div className="flex-1 bg-[#090A0D] rounded-xl border border-[#23272F] p-1 flex items-center gap-1 overflow-hidden">
              {timelineBeats.map((beat, bIdx) => {
                const widthPercent = (beat.durationMs / totalDurationMs) * 100;
                const isSelected = beat.id === selectedBeat?.id;
                const isActive = currentTimeMs >= beat.globalStartMs && currentTimeMs < beat.globalEndMs;

                return (
                  <div
                    key={beat.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBeatId(beat.id);
                      handleSeek(beat.globalStartMs);
                    }}
                    style={{ width: `${widthPercent}%`, minWidth: '85px' }}
                    className={`h-full rounded-lg border p-1.5 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden shrink-0 ${
                      isSelected
                        ? 'border-[#00E5FF] bg-[#00E5FF]/15 ring-1 ring-[#00E5FF]'
                        : isActive
                        ? 'border-[#4EDEA3] bg-[#4EDEA3]/10'
                        : 'border-[#23272F] bg-[#181B20] hover:border-[#3D424F]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] font-mono">
                      <span className="text-[#00E5FF] font-bold">B{bIdx + 1}</span>
                      <span className="text-[#918FA1]">{(beat.durationMs / 1000).toFixed(1)}s</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-6 bg-[#090A0D] rounded shrink-0 overflow-hidden">
                        {beat.imagePath ? (
                          beat.imagePath.toLowerCase().match(/\.(mp4|webm|mov|mkv)$/) ? (
                            <video src={getMediaUrl(beat.imagePath)} className="w-full h-full object-cover pointer-events-none" muted playsInline preload="metadata" />
                          ) : (
                            <img src={getMediaUrl(beat.imagePath)} alt={`Beat ${bIdx + 1}`} className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#464555]">
                            <span className="material-symbols-outlined text-[12px]">image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[9px] text-[#E2E2E6] font-mono truncate">{beat.shotType.split('_')[0]}</span>
                        <span className="text-[8px] text-[#00E5FF] font-mono truncate">{beat.motion}</span>
                      </div>
                    </div>

                    {beat.transition && beat.transition !== 'CUT' && (
                      <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1 rounded bg-[#FFB95F]/20 text-[#FFB95F] border border-[#FFB95F]/30">
                        {beat.transition}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* TRACK 2: Burned ASS Captions Track */}
            <div className="h-7 bg-[#090A0D] rounded-lg border border-[#23272F] px-2 flex items-center text-[10px] font-mono text-[#8781FF] overflow-hidden">
              <span className="material-symbols-outlined text-[13px] mr-1.5">title</span>
              <span className="truncate">Captions: {activeCaptionText || 'Story Narration'}</span>
            </div>

            {/* TRACK 3: Continuous Narration Audio Track */}
            <div className="h-7 bg-[#090A0D] rounded-lg border border-[#23272F] px-2 flex items-center justify-between text-[10px] font-mono text-[#00E5FF]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[13px]">graphic_eq</span>
                <span>Narration Voice (Uncut)</span>
                <span className="text-[9px] px-1.5 rounded bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                  {selectedVoice.split('Neural')[0].replace('en-US-', '').replace('en-GB-', '')}
                </span>
              </div>
              <span className="text-[#918FA1]">{formatMs(totalDurationMs)}</span>
            </div>

            {/* TRACK 4: Ambient BGM Track */}
            <div className="h-7 bg-[#090A0D] rounded-lg border border-[#23272F] px-2 flex items-center justify-between text-[10px] font-mono text-[#4EDEA3]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[13px]">music_note</span>
                <span>BGM: {selectedBgmId === 'none' ? 'None' : (bgmTracks.find((t) => t.id === selectedBgmId)?.name.split('(')[0] || selectedBgmId)}</span>
                <span className="text-[9px] px-1.5 rounded bg-[#4EDEA3]/10 text-[#4EDEA3] border border-[#4EDEA3]/30">
                  {Math.round(bgmVolume * 100)}% Volume
                </span>
              </div>
              {isDuckingActive && (
                <span className="text-[9px] text-[#4EDEA3] animate-pulse">
                  [Ducking -18dB Active]
                </span>
              )}
            </div>

          </div>
        </div>
      </div>


      {/* CapCut Style Export Dialog Modal */}
      <CapCutExportModal
        isOpen={showCapCutExportModal}
        onClose={() => setShowCapCutExportModal(false)}
        projectId={id || ''}
        projectName={currentProject?.name || 'Project'}
        projectDurationMs={totalDurationMs}
        activeBeat={activeBeat || undefined}
        selectedColorFilter={selectedColorFilter}
        onColorFilterChange={setSelectedColorFilter}
        bgmVolume={bgmVolume}
        onBgmVolumeChange={setBgmVolume}
        captionStyle={captionStyle}
        sceneConfigs={sceneConfigs}
        onOpenYouTubePack={() => setShowYouTubePackModal(true)}
      />

      {/* Caption Style Modal */}
      <CaptionStyleModal
        isOpen={isCaptionModalOpen}
        onClose={() => setIsCaptionModalOpen(false)}
        currentStyle={captionStyle}
        onApply={handleApplyCaptionStyle}
      />

      {/* YouTube Export Modal */}
      {showYouTubePackModal && (
        <YouTubeExportModal
          projectId={id || ''}
          onClose={() => setShowYouTubePackModal(false)}
        />
      )}

      {/* Facebook Export Modal */}
      {showFacebookPackModal && (
        <FacebookExportModal
          projectId={id || ''}
          onClose={() => setShowFacebookPackModal(false)}
          onExportReel={() => setShowCapCutExportModal(true)}
        />
      )}
    </div>
  );
};
