import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settings.store';
import { EDGE_NEURAL_VOICES, MOTION_OPTIONS } from '../../../shared/constants';
import { MotionType } from '../../../shared/enums';

const PIXAZO_MODEL_OPTIONS = [
  {
    id: 'flux-1-schnell',
    name: 'Flux 1 Schnell (Recommended - Ultra Fast ~2s)',
    desc: 'Ultra-fast sync cloud generation (1280x720 16:9), instantaneous delivery'
  },
  {
    id: 'studio-ghibli',
    name: 'Official Studio Ghibli',
    desc: 'Specialized Pixazo Ghibli anime checkpoint'
  },
  {
    id: 'flux-dev',
    name: 'Flux Dev',
    desc: 'High-fidelity cinematic detailing with 1280x720 canvas'
  },
  {
    id: 'flux-pro',
    name: 'Flux Pro',
    desc: 'Maximum dynamic range and painterly lighting composition'
  }
];

export const SettingsPage: React.FC = () => {
  const { settings, fetchSettings, saveSettings, isLoading } = useSettingsStore();

  // Core settings state
  const [workspace, setWorkspace] = useState('');
  const [voice, setVoice] = useState('en-US-AndrewMultilingualNeural');
  const [motion, setMotion] = useState<MotionType>(MotionType.AUTO_HARD_EDIT);
  const [volume, setVolume] = useState(12);

    // Pixazo AI Parallel Engine state
  const [pixazoApiKey, setPixazoApiKey] = useState('');
  const [pixazoModel, setPixazoModel] = useState('flux-1-schnell');
  const [pixazoConcurrency, setPixazoConcurrency] = useState(5);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isCheckingPixazo, setIsCheckingPixazo] = useState(false);
  const [pixazoHealth, setPixazoHealth] = useState<{
    tested: boolean;
    ready: boolean;
    message: string;
  }>({
    tested: false,
    ready: false,
    message: ''
  });

  // AI Prompt Generation State (Agnes AI Primary & Groq Fallback)
  const [agnesApiKey, setAgnesApiKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [primaryProvider, setPrimaryProvider] = useState<'agnes' | 'groq'>('groq');
  const [circuitBreakerInfo, setCircuitBreakerInfo] = useState<{
    active: boolean;
    remainingSeconds: number;
    reason?: string;
  }>({ active: false, remainingSeconds: 0 });
  const [showAgnesKey, setShowAgnesKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [isTestingPromptAi, setIsTestingPromptAi] = useState(false);
  const [aiPromptStatus, setAiPromptStatus] = useState<{
    tested: boolean;
    ready: boolean;
    message: string;
    samplePrompt?: string;
  }>({
    tested: false,
    ready: false,
    message: ''
  });

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();

    // Load Pixazo config from environment
    if (window.docuforge?.pixazo?.getConfig) {
      window.docuforge.pixazo.getConfig().then((cfg) => {
        if (cfg) {
          if (cfg.apiKey) setPixazoApiKey(cfg.apiKey);
          if (cfg.model) setPixazoModel(cfg.model);
          if (cfg.concurrency) setPixazoConcurrency(cfg.concurrency);
        }
      });
    }

    // Load AI Prompt config and circuit breaker status from environment
    const aiApi = (window as any).docuforge?.aiPrompts;
    if (aiApi?.getConfig) {
      aiApi.getConfig().then((cfg: any) => {
        if (cfg) {
          if (cfg.agnesApiKey) setAgnesApiKey(cfg.agnesApiKey);
          if (cfg.groqApiKey) setGroqApiKey(cfg.groqApiKey);
          if (cfg.primaryProvider) setPrimaryProvider(cfg.primaryProvider);
        }
      });
    }

    if (aiApi?.checkHealth) {
      aiApi.checkHealth().then((health: any) => {
        if (health) {
          setCircuitBreakerInfo({
            active: health.agnesCircuitBreakerActive,
            remainingSeconds: health.circuitBreakerRemainingSeconds,
            reason: health.agnesFailureReason
          });
        }
      });
    }
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setWorkspace(settings.workspacePath);
      setVoice(settings.defaultVoiceId);
      setMotion(settings.defaultMotion || MotionType.AUTO_HARD_EDIT);
      setVolume(settings.musicVolumePercent);
    }
  }, [settings]);

  
  const handleResetCircuitBreaker = async () => {
    const api = (window as any).docuforge?.aiPrompts;
    if (api?.resetCircuitBreaker) {
      await api.resetCircuitBreaker();
      setCircuitBreakerInfo({ active: false, remainingSeconds: 0 });
    }
  };

  const handleTestAiPrompt = async () => {
    const api = (window as any).docuforge?.aiPrompts;
    if (!api) return;
    setIsTestingPromptAi(true);
    try {
      if (api.resetCircuitBreaker) {
        await api.resetCircuitBreaker();
      }
      if (api.saveConfig) {
        await api.saveConfig({ agnesApiKey, groqApiKey, primaryProvider });
      }
      const res = await api.generatePrompt({
        scriptLine: 'A Stoic philosopher walking alone through ancient Rome at sunset.',
        niche: 'stoic_philosophy',
        shotType: 'WIDE_SCENE',
        aspectRatio: '16:9'
      });

      setAiPromptStatus({
        tested: true,
        ready: true,
        message: `Successfully generated via ${res.provider.toUpperCase()} (${res.model})`,
        samplePrompt: res.prompt
      });
      setCircuitBreakerInfo({ active: false, remainingSeconds: 0 });
    } catch (err: any) {
      setAiPromptStatus({
        tested: true,
        ready: false,
        message: err.message || 'AI Prompt test failed.'
      });
    } finally {
      setIsTestingPromptAi(false);
    }
  };

  const handleTestPixazo = async () => {
    if (!window.docuforge?.pixazo) return;
    setIsCheckingPixazo(true);
    try {
      if (window.docuforge.pixazo.saveConfig) {
        await window.docuforge.pixazo.saveConfig(pixazoApiKey, pixazoModel, pixazoConcurrency);
      }
      const health = await window.docuforge.pixazo.checkHealth();
      if (health.ready) {
        setPixazoHealth({
          tested: true,
          ready: true,
          message: `Pixazo Parallel Engine Ready (${health.model || pixazoModel}, ${pixazoConcurrency} workers)`
        });
      } else {
        setPixazoHealth({
          tested: true,
          ready: false,
          message: 'Pixazo API Key is empty or invalid. Please verify your key.'
        });
      }
    } catch (err: any) {
      setPixazoHealth({
        tested: true,
        ready: false,
        message: err.message || 'Connection test failed.'
      });
    } finally {
      setIsCheckingPixazo(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings({
        workspacePath: workspace,
        defaultVoiceId: voice,
        defaultMotion: motion,
        musicVolumePercent: volume
      });

            if (window.docuforge?.pixazo?.saveConfig) {
        await window.docuforge.pixazo.saveConfig(pixazoApiKey, pixazoModel, pixazoConcurrency);
      }

      const aiPromptsApi = (window as any).docuforge?.aiPrompts;
      if (aiPromptsApi?.saveConfig) {
        await aiPromptsApi.saveConfig({ agnesApiKey, groqApiKey, primaryProvider });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-10 flex flex-col gap-6 w-full select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#464555]/30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-widest text-[#00e5ff] uppercase bg-[#00e5ff]/10 px-2 py-0.5 rounded-full border border-[#00e5ff]/20 font-semibold">
              Pixazo Parallel Generation Pipeline
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#E2E2E6] tracking-tight">Studio Settings</h1>
          <p className="text-xs text-[#C7C4D8]">
            Configure Pixazo AI Parallel Generation Engine (5 simultaneous workers), visual presets, continuous voice synthesis, and auto-editing rules.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className={`h-9 px-5 rounded-lg font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer ${
            saved
              ? 'bg-[#4EDEA3] text-[#003822]'
              : 'bg-[#8781FF] text-[#1B0091] hover:bg-[#C4C0FF]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {saved ? 'check_circle' : 'save'}
          </span>
          {saved ? 'Saved Successfully!' : isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* AI Prompt Provider Card: Agnes AI & Groq (with Circuit Breaker & Primary Selector) */}
      <div className="bg-[#1A1C1F] rounded-xl border border-[#00e5ff]/30 p-5 flex flex-col gap-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-[#464555]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8781FF]/15 border border-[#8781FF]/40 flex items-center justify-center text-[#8781FF]">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#E2E2E6]">Text-to-Image Prompt Providers</h2>
                <span className="text-[10px] font-mono uppercase bg-[#8781FF]/20 text-[#C4C0FF] px-2 py-0.5 rounded-full border border-[#8781FF]/40 font-bold tracking-wider">
                  {primaryProvider === 'groq' ? 'GROQ PRIMARY (AGNES FALLBACK)' : 'AGNES PRIMARY (GROQ FALLBACK)'}
                </span>
              </div>
              <p className="text-[11px] text-[#918FA1]">
                Prompts for Pixazo are generated by <code className={primaryProvider === 'groq' ? 'text-[#00e5ff]' : 'text-[#8781FF]'}>{primaryProvider === 'groq' ? 'Groq (openai/gpt-oss-120b)' : 'Agnes AI (agnes-2.0-flash)'}</code> with automatic circuit breaker fallback.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                aiPromptStatus.ready
                  ? 'bg-[#00A572]/20 text-[#4EDEA3] border-[#00A572]/40'
                  : 'bg-[#FFDE82]/20 text-[#FFDE82] border-[#FFDE82]/40'
              }`}
            >
              {aiPromptStatus.ready ? 'AI Prompts Active' : 'Keys Configured'}
            </span>
          </div>
        </div>

        {/* Primary Provider Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-lg bg-[#141619] border border-[#464555]/30">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-[#E2E2E6]">Preferred Primary Provider</span>
            <span className="text-[11px] text-[#918FA1]">
              Groq provides high throughput without 429 rate limit spikes. Agnes AI is available with automatic cooldown.
            </span>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-[#0C0E11] rounded-lg border border-[#464555]/40 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPrimaryProvider('groq')}
              className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                primaryProvider === 'groq'
                  ? 'bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/50 font-bold shadow-sm'
                  : 'text-[#918FA1] hover:text-[#E2E2E6]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              Groq (Fast - Recommended)
            </button>
            <button
              type="button"
              onClick={() => setPrimaryProvider('agnes')}
              className={`px-3 py-1 rounded text-xs font-medium cursor-pointer transition-all flex items-center gap-1.5 ${
                primaryProvider === 'agnes'
                  ? 'bg-[#8781FF]/20 text-[#C4C0FF] border border-[#8781FF]/50 font-bold shadow-sm'
                  : 'text-[#918FA1] hover:text-[#E2E2E6]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">psychology</span>
              Agnes AI
            </button>
          </div>
        </div>

        {/* Circuit Breaker Alert Banner */}
        {circuitBreakerInfo.active && (
          <div className="bg-[#FFB4AB]/10 border border-[#FFB4AB]/30 rounded-lg p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#FFB4AB]">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <div>
                <span className="font-bold">Agnes AI In Cooldown ({Math.ceil(circuitBreakerInfo.remainingSeconds / 60)}m left):</span> Hit rate limit or error. All prompt generation is routing directly to Groq with zero delay.
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetCircuitBreaker}
              className="px-2.5 py-1 rounded bg-[#FFB4AB]/20 text-[#FFB4AB] hover:bg-[#FFB4AB]/30 border border-[#FFB4AB]/40 font-mono text-[11px] font-semibold cursor-pointer transition-colors"
            >
              Reset Cooldown
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Agnes AI Key */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#C7C4D8] flex items-center gap-1">
                <span>Agnes AI API Key</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  primaryProvider === 'agnes'
                    ? 'bg-[#8781FF]/20 text-[#8781FF]'
                    : 'bg-[#464555]/30 text-[#918FA1]'
                }`}>
                  {primaryProvider === 'agnes' ? 'PRIMARY' : 'FALLBACK'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowAgnesKey(!showAgnesKey)}
                className="text-[11px] font-mono text-[#8781FF] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {showAgnesKey ? 'visibility_off' : 'visibility'}
                </span>
                {showAgnesKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showAgnesKey ? 'text' : 'password'}
                value={agnesApiKey}
                onChange={(e) => setAgnesApiKey(e.target.value)}
                placeholder="Paste AGNES_API_KEY..."
                className="w-full h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs font-mono rounded-lg border border-[#464555]/40 focus:outline-none focus:ring-1 focus:ring-[#8781FF]"
              />
            </div>
            <span className="text-[10px] text-[#918FA1]">
              Endpoint: <code className="text-[#8781FF]">https://apihub.agnes-ai.com/v1</code> (Model: agnes-2.0-flash)
            </span>
          </div>

          {/* Groq Key */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#C7C4D8] flex items-center gap-1">
                <span>Groq API Key</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  primaryProvider === 'groq'
                    ? 'bg-[#00e5ff]/20 text-[#00e5ff]'
                    : 'bg-[#464555]/30 text-[#918FA1]'
                }`}>
                  {primaryProvider === 'groq' ? 'PRIMARY (RECOMMENDED)' : 'FALLBACK'}
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowGroqKey(!showGroqKey)}
                className="text-[11px] font-mono text-[#00e5ff] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {showGroqKey ? 'visibility_off' : 'visibility'}
                </span>
                {showGroqKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showGroqKey ? 'text' : 'password'}
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="Paste GROQ_API_KEY..."
                className="w-full h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs font-mono rounded-lg border border-[#464555]/40 focus:outline-none focus:ring-1 focus:ring-[#00e5ff]"
              />
            </div>
            <span className="text-[10px] text-[#918FA1]">
              Endpoint: <code className="text-[#00e5ff]">https://api.groq.com/openai/v1</code> (Model: openai/gpt-oss-120b)
            </span>
          </div>
        </div>

        {/* Test Connection Button & Status */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#464555]/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleTestAiPrompt}
                disabled={isTestingPromptAi || (!agnesApiKey.trim() && !groqApiKey.trim())}
                className="h-8 px-3 rounded-lg bg-[#282A2D] hover:bg-[#34373C] text-[#C4C0FF] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <span className={`material-symbols-outlined text-[16px] ${isTestingPromptAi ? 'animate-spin' : ''}`}>
                  {isTestingPromptAi ? 'progress_activity' : 'auto_fix_high'}
                </span>
                {isTestingPromptAi ? 'Generating Test Prompt...' : 'Test AI Prompt Generation'}
              </button>

              {aiPromptStatus.tested && (
                <span
                  className={`text-xs flex items-center gap-1 font-mono ${
                    aiPromptStatus.ready ? 'text-[#4EDEA3]' : 'text-[#FFB4AB]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {aiPromptStatus.ready ? 'check_circle' : 'error'}
                  </span>
                  {aiPromptStatus.message}
                </span>
              )}
            </div>
          </div>

          {aiPromptStatus.samplePrompt && (
            <div className="p-3 bg-[#0C0E11] rounded-lg border border-[#8781FF]/30 text-xs font-mono text-[#C7C4D8] leading-relaxed">
              <span className="text-[#8781FF] font-bold block mb-1">Generated Diffusion Prompt:</span>
              "{aiPromptStatus.samplePrompt}"
            </div>
          )}
        </div>
      </div>

      {/* Pixazo AI Parallel Generation Engine Card */}
      <div className="bg-[#1A1C1F] p-6 rounded-xl border-2 border-[#00e5ff]/40 flex flex-col gap-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/15 border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff]">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#E2E2E6]">Pixazo AI Parallel Generation Engine</h2>
                <span className="text-[10px] font-mono uppercase bg-[#00e5ff]/20 text-[#00e5ff] px-2 py-0.5 rounded-full border border-[#00e5ff]/40 font-bold tracking-wider">
                  {pixazoConcurrency}x CONCURRENT WORKERS
                </span>
              </div>
              <p className="text-[11px] text-[#918FA1]">
                High-speed cloud image synthesis engine at gateway.pixazo.ai. Keeps 5 requests active simultaneously with instant worker recycling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                pixazoApiKey.trim()
                  ? 'bg-[#00A572]/20 text-[#4EDEA3] border-[#00A572]/40'
                  : 'bg-[#FFDE82]/20 text-[#FFDE82] border-[#FFDE82]/40'
              }`}
            >
              {pixazoApiKey.trim() ? 'Engine Ready' : 'API Key Required'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* API Key */}
          <div className="flex flex-col gap-1.5 md:col-span-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#C7C4D8]">Pixazo API Key</label>
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-[11px] font-mono text-[#00e5ff] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {showApiKey ? 'visibility_off' : 'visibility'}
                </span>
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={pixazoApiKey}
                onChange={(e) => setPixazoApiKey(e.target.value)}
                placeholder="Paste PIXAZO_API_KEY..."
                className="w-full h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs font-mono rounded-lg border border-[#464555]/40 focus:outline-none focus:ring-1 focus:ring-[#00e5ff]"
              />
            </div>
            <span className="text-[10px] text-[#918FA1]">
              Saved strictly in backend <code className="text-[#00e5ff]">.env.local</code>.
            </span>
          </div>

          {/* Model Selector */}
          <div className="flex flex-col gap-1.5 md:col-span-1">
            <label className="text-xs font-medium text-[#C7C4D8]">Pixazo Model</label>
            <select
              value={pixazoModel}
              onChange={(e) => setPixazoModel(e.target.value)}
              className="h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-lg border border-[#464555]/40 focus:outline-none focus:ring-1 focus:ring-[#00e5ff] cursor-pointer"
            >
              {PIXAZO_MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#1A1C1F]">
                  {m.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-[#918FA1]">
              {PIXAZO_MODEL_OPTIONS.find((m) => m.id === pixazoModel)?.desc || ''}
            </span>
          </div>

          {/* Concurrency Selector */}
          <div className="flex flex-col gap-1.5 md:col-span-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#C7C4D8]">Parallel Workers</label>
              <span className="text-[10px] font-mono text-[#00e5ff] font-semibold">
                {pixazoConcurrency} simultaneous
              </span>
            </div>
            <select
              value={pixazoConcurrency}
              onChange={(e) => setPixazoConcurrency(parseInt(e.target.value, 10))}
              className="h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-lg border border-[#464555]/40 focus:outline-none focus:ring-1 focus:ring-[#00e5ff] cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num} className="bg-[#1A1C1F]">
                  {num} Worker{num > 1 ? 's' : ''} {num === 5 ? '(Default 5x Recommended)' : ''}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-[#918FA1]">
              Maintains {pixazoConcurrency} active requests simultaneously until all prompts complete.
            </span>
          </div>
        </div>

        {/* Parallel Queue Engine Notice */}
        <div className="p-3 rounded-lg bg-[#0C0E11]/80 border border-[#00e5ff]/25 flex items-start gap-2.5 text-xs text-[#C7C4D8]">
          <span className="material-symbols-outlined text-[#00e5ff] text-[18px] mt-0.5 shrink-0">auto_mode</span>
          <div>
            <span className="font-semibold text-[#E2E2E6]">Sliding-Window Worker Queue & Auto-Retry: </span>
            Whenever one worker completes an image, it immediately grabs the next pending prompt without waiting for others. Transient errors (HTTP 429 Rate Limits or network timeouts) trigger automatic exponential backoff retries without blocking active workers.
          </div>
        </div>

        {/* Test Connection Button & Status */}
        <div className="flex items-center justify-between pt-2 border-t border-[#464555]/20">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestPixazo}
              disabled={isCheckingPixazo || !pixazoApiKey.trim()}
              className="h-8 px-3 rounded-lg bg-[#282A2D] hover:bg-[#34373C] text-[#C4C0FF] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <span className={`material-symbols-outlined text-[16px] ${isCheckingPixazo ? 'animate-spin' : ''}`}>
                {isCheckingPixazo ? 'progress_activity' : 'bolt'}
              </span>
              {isCheckingPixazo ? 'Testing Engine...' : 'Test Pixazo Connection'}
            </button>

            {pixazoHealth.tested && (
              <span
                className={`text-xs flex items-center gap-1 font-mono ${
                  pixazoHealth.ready ? 'text-[#4EDEA3]' : 'text-[#FFB4AB]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {pixazoHealth.ready ? 'check_circle' : 'error'}
                </span>
                {pixazoHealth.message}
              </span>
            )}
          </div>

          <a
            href="https://api-console.pixazo.ai"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-mono text-[#00e5ff] hover:underline flex items-center gap-1"
          >
            Pixazo Console & Keys
            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </a>
        </div>
      </div>

      {/* Visual Niche & Character Presets */}
      <div className="bg-[#1A1C1F] p-6 rounded-xl border border-[#464555]/30 flex flex-col gap-5">
        <h2 className="text-xs font-semibold text-[#C4C0FF] uppercase tracking-wider font-mono">
          Visual Niche & Art Presets
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#C7C4D8]">Visual Style</label>
            <input
              type="text"
              readOnly
              value="Studio Ghibli Real-World Slice-of-Life"
              className="h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs font-mono rounded-lg border border-[#464555]/40 opacity-90"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#C7C4D8]">Resolution & Aspect</label>
            <input
              type="text"
              readOnly
              value="1280x720 (16:9 Landscape YouTube)"
              className="h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs font-mono rounded-lg border border-[#464555]/40 opacity-90"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#C7C4D8]">Art Direction</label>
            <input
              type="text"
              readOnly
              value="Hand-Painted Anime and Watercolor Aesthetics"
              className="h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs font-mono rounded-lg border border-[#464555]/40 opacity-90"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#C7C4D8]">Image Text Overlay</label>
            <div className="h-9 px-3 bg-[#0C0E11] text-[#4EDEA3] text-xs font-mono rounded-lg border border-[#464555]/40 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-[#4EDEA3]">block</span>
              <span>Disabled (Pure Clean Artwork - Zero Text Overlay)</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-[#464555]/20 my-1"></div>

        <h2 className="text-xs font-semibold text-[#C4C0FF] uppercase tracking-wider font-mono">
          Continuous Narration & Editing Defaults
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#C7C4D8]">Default Story Narrator</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-lg border border-[#464555]/40 focus:outline-none cursor-pointer"
            >
              <optgroup label="Flagship Human Voices (Microsoft Next-Gen Multilingual Neural)">
                {EDGE_NEURAL_VOICES.map((v) => (
                  <option key={v.id} value={v.id} className="bg-[#1A1C1F]">
                    {v.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[#C7C4D8]">Scene Motion Default</label>
            <select
              value={motion}
              onChange={(e) => setMotion(e.target.value as MotionType)}
              className="h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs rounded-lg border border-[#464555]/40 focus:outline-none cursor-pointer"
            >
              {MOTION_OPTIONS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#1A1C1F]">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#E2E2E6]">BGM Sidechain Ducking Volume</span>
            <span className="font-mono text-[#C4C0FF]">{volume}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value, 10))}
            className="w-full accent-[#8781FF] cursor-pointer"
          />
          <span className="text-[11px] text-[#918FA1]">
            Ducks background music during narration speech to keep storytelling voices crystal clear.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-[#E2E2E6]">Workspace Directory</label>
          <input
            type="text"
            value={workspace}
            onChange={(e) => setWorkspace(e.target.value)}
            className="h-9 px-3 bg-[#0C0E11] text-[#E2E2E6] text-xs font-mono rounded-lg border border-[#464555]/40 focus:outline-none focus:ring-1 focus:ring-[#8781FF]"
          />
          <span className="text-[11px] text-[#918FA1]">
            Where all storytelling scenes, Ghibli anime assets, master voiceovers, and rendered videos are stored.
          </span>
        </div>
      </div>
    </div>
  );
};
