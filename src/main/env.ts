import fs from 'fs';
import path from 'path';

/**
 * Lightweight .env.local and .env parser for Electron Main process.
 * Eliminates external dotenv dependency while ensuring .env.local takes precedence.
 */
function parseEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();

      // Unquote value if wrapped in quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      result[key] = val;
    }
  } catch (err) {
    console.warn(`[Env] Failed to read ${filePath}:`, err);
  }

  return result;
}

/**
 * Discovers the project root directory across dev and packaged Electron builds.
 */
export function getCandidateRoots(): string[] {
  const roots: string[] = [
    process.cwd(),
    path.resolve(__dirname, '../..'),
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '.')
  ];
  return Array.from(new Set(roots));
}

export function getPrimaryEnvLocalPath(): string {
  const roots = getCandidateRoots();
  for (const root of roots) {
    const candidate = path.join(root, '.env.local');
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(roots[0], '.env.local');
}

/**
 * Loads .env and .env.local into process.env.
 * .env.local takes precedence over .env.
 */
export function loadEnv(): void {
  const candidateRoots = getCandidateRoots();
  let loadedFrom: string[] = [];

  for (const root of candidateRoots) {
    const envPath = path.join(root, '.env');
    const envLocalPath = path.join(root, '.env.local');

    if (fs.existsSync(envPath)) {
      const parsed = parseEnvFile(envPath);
      for (const [k, v] of Object.entries(parsed)) {
        if (!process.env[k]) {
          process.env[k] = v;
        }
      }
      loadedFrom.push(envPath);
    }

    if (fs.existsSync(envLocalPath)) {
      const parsedLocal = parseEnvFile(envLocalPath);
      for (const [k, v] of Object.entries(parsedLocal)) {
        // .env.local overrides existing env
        process.env[k] = v;
      }
      loadedFrom.push(envLocalPath);
    }

    if (loadedFrom.length > 0) {
      break; // Found the active project root
    }
  }

  const isPixazoSet = Boolean(process.env.PIXAZO_API_KEY && process.env.PIXAZO_API_KEY.trim());
  const isAgnesSet = Boolean(process.env.AGNES_API_KEY && process.env.AGNES_API_KEY.trim());
  const isGroqSet = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
  console.log(`[Env] Environment loaded. Pixazo: ${isPixazoSet ? 'YES' : 'NO'} | Agnes AI: ${isAgnesSet ? 'YES' : 'NO'} | Groq: ${isGroqSet ? 'YES' : 'NO'}`);
}

/**
 * Reloads environment files (useful when user updates .env.local at runtime)
 */
export function reloadEnv(): {
  success: boolean;
  pixazoApiKeySet: boolean;
  model: string;
  concurrency: number;
  agnesApiKeySet: boolean;
  groqApiKeySet: boolean;
} {
  loadEnv();
  return {
    success: true,
    pixazoApiKeySet: isPixazoConfigured(),
    model: getPixazoModel(),
    concurrency: getPixazoConcurrency(),
    agnesApiKeySet: isAgnesConfigured(),
    groqApiKeySet: isGroqConfigured()
  };
}

/**
 * Saves Pixazo configuration to .env.local and hot-reloads process.env
 */
export function savePixazoConfig(
  apiKey: string,
  model: string,
  concurrency: number = 5
): { success: boolean; pixazoApiKeySet: boolean; model: string; concurrency: number } {
  const targetPath = getPrimaryEnvLocalPath();
  const cleanKey = apiKey.trim();
  const cleanModel = model.trim() || 'flux-1-schnell';
  const cleanConcurrency = Math.max(1, Math.min(10, concurrency || 5));

  updateEnvKeyValue(targetPath, 'PIXAZO_API_KEY', cleanKey);
  updateEnvKeyValue(targetPath, 'PIXAZO_MODEL', cleanModel);
  updateEnvKeyValue(targetPath, 'PIXAZO_CONCURRENCY', String(cleanConcurrency));

  process.env.PIXAZO_API_KEY = cleanKey;
  process.env.PIXAZO_MODEL = cleanModel;
  process.env.PIXAZO_CONCURRENCY = String(cleanConcurrency);

  return {
    success: true,
    pixazoApiKeySet: cleanKey.length > 0,
    model: cleanModel,
    concurrency: cleanConcurrency
  };
}

export function getPrimaryPromptProvider(): 'agnes' | 'groq' {
  const pref = (process.env.PRIMARY_PROMPT_PROVIDER || process.env.PROMPT_PROVIDER || '').trim().toLowerCase();
  if (pref === 'groq') return 'groq';
  if (pref === 'agnes') return 'agnes';
  // If only Groq is configured, default to groq
  if (isGroqConfigured() && !isAgnesConfigured()) return 'groq';
  // Default to groq if both or only groq configured, otherwise agnes if configured
  return 'groq';
}

export function getAiPromptConfig(): {
  agnesApiKey: string;
  agnesModel: string;
  groqApiKey: string;
  groqModel: string;
  primaryProvider: 'agnes' | 'groq';
} {
  return {
    agnesApiKey: getAgnesApiKey(),
    agnesModel: getAgnesModel(),
    groqApiKey: getGroqApiKey(),
    groqModel: getGroqModel(),
    primaryProvider: getPrimaryPromptProvider()
  };
}

/**
 * Saves Agnes AI and Groq configuration to .env.local and hot-reloads process.env
 */
export function saveAiPromptConfig(config: {
  agnesApiKey?: string;
  agnesModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  primaryProvider?: 'agnes' | 'groq';
}): { success: boolean; agnesConfigured: boolean; groqConfigured: boolean; primaryProvider: 'agnes' | 'groq' } {
  const targetPath = getPrimaryEnvLocalPath();

  if (config.primaryProvider !== undefined) {
    const clean = config.primaryProvider.toLowerCase() === 'agnes' ? 'agnes' : 'groq';
    updateEnvKeyValue(targetPath, 'PRIMARY_PROMPT_PROVIDER', clean);
    process.env.PRIMARY_PROMPT_PROVIDER = clean;
  }
  if (config.agnesApiKey !== undefined) {
    const clean = config.agnesApiKey.trim();
    updateEnvKeyValue(targetPath, 'AGNES_API_KEY', clean);
    process.env.AGNES_API_KEY = clean;
  }
  if (config.agnesModel !== undefined) {
    const clean = config.agnesModel.trim() || 'agnes-2.0-flash';
    updateEnvKeyValue(targetPath, 'AGNES_MODEL', clean);
    process.env.AGNES_MODEL = clean;
  }
  if (config.groqApiKey !== undefined) {
    const clean = config.groqApiKey.trim();
    updateEnvKeyValue(targetPath, 'GROQ_API_KEY', clean);
    process.env.GROQ_API_KEY = clean;
  }
  if (config.groqModel !== undefined) {
    const clean = config.groqModel.trim() || 'qwen/qwen3.8-27b';
    updateEnvKeyValue(targetPath, 'GROQ_MODEL', clean);
    process.env.GROQ_MODEL = clean;
  }

  return {
    success: true,
    agnesConfigured: isAgnesConfigured(),
    groqConfigured: isGroqConfigured(),
    primaryProvider: getPrimaryPromptProvider()
  };
}


function updateEnvKeyValue(filePath: string, key: string, value: string): void {
  let lines: string[] = [];
  if (fs.existsSync(filePath)) {
    try {
      lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
    } catch {
      lines = [];
    }
  }

  let found = false;
  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    updatedLines.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, updatedLines.join('\n'), 'utf-8');
}

/**
 * Starts automatic disk watcher on .env.local to hot-reload config on external edit
 */
export function startEnvWatcher(): void {
  const roots = getCandidateRoots();
  for (const root of roots) {
    const target = path.join(root, '.env.local');
    try {
      if (fs.existsSync(target)) {
        fs.watchFile(target, { interval: 1000 }, (curr, prev) => {
          if (curr.mtimeMs !== prev.mtimeMs) {
            console.log(`[Env] Detected external edit to ${target}. Hot-reloading environment...`);
            loadEnv();
          }
        });
      }
    } catch (e) {
      console.warn(`[Env] Failed to watch ${target}:`, e);
    }
  }
}

// Pixazo getters
export function getPixazoApiKey(): string {
  return (process.env.PIXAZO_API_KEY || '').trim();
}

export function getPixazoModel(): string {
  return (process.env.PIXAZO_MODEL || 'flux-1-schnell').trim();
}

export function isPixazoConfigured(): boolean {
  return getPixazoApiKey().length > 0;
}

export function getPixazoConcurrency(): number {
  const val = parseInt(process.env.PIXAZO_CONCURRENCY || '5', 10);
  if (isNaN(val) || val < 1) return 5;
  return Math.min(10, Math.max(1, val));
}

// Agnes AI getters (Primary Prompt Provider)
export function getAgnesApiKey(): string {
  return (process.env.AGNES_API_KEY || '').trim();
}

export function getAgnesModel(): string {
  return (process.env.AGNES_MODEL || 'agnes-2.0-flash').trim();
}

export function getAgnesBaseUrl(): string {
  return (process.env.AGNES_BASE_URL || 'https://apihub.agnes-ai.com/v1').trim();
}

export function isAgnesConfigured(): boolean {
  return getAgnesApiKey().length > 0;
}

// Groq getters (Fallback Prompt Provider)
export function getGroqApiKey(): string {
  return (process.env.GROQ_API_KEY || '').trim();
}

export function getGroqModel(): string {
  return (process.env.GROQ_MODEL || 'qwen/qwen3.8-27b').trim();
}

export function getGroqBaseUrl(): string {
  return (process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').trim();
}

export function isGroqConfigured(): boolean {
  return getGroqApiKey().length > 0;
}
