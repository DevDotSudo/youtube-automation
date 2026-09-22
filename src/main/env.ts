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

  const isConfigured = Boolean(process.env.PIXAZO_API_KEY && process.env.PIXAZO_API_KEY.trim());
  console.log(`[Env] Environment loaded. PIXAZO_API_KEY configured: ${isConfigured ? 'YES' : 'NO'}`);
}

/**
 * Reloads environment files (useful when user updates .env.local at runtime)
 */
export function reloadEnv(): { success: boolean; pixazoApiKeySet: boolean; model: string; concurrency: number } {
  loadEnv();
  return {
    success: true,
    pixazoApiKeySet: isPixazoConfigured(),
    model: getPixazoModel(),
    concurrency: getPixazoConcurrency()
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

  let lines: string[] = [];
  if (fs.existsSync(targetPath)) {
    try {
      lines = fs.readFileSync(targetPath, 'utf-8').split(/\r?\n/);
    } catch {
      lines = [];
    }
  }

  let foundKey = false;
  let foundModel = false;
  let foundConcurrency = false;

  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('PIXAZO_API_KEY=')) {
      foundKey = true;
      return `PIXAZO_API_KEY=${cleanKey}`;
    }
    if (trimmed.startsWith('PIXAZO_MODEL=')) {
      foundModel = true;
      return `PIXAZO_MODEL=${cleanModel}`;
    }
    if (trimmed.startsWith('PIXAZO_CONCURRENCY=')) {
      foundConcurrency = true;
      return `PIXAZO_CONCURRENCY=${cleanConcurrency}`;
    }
    return line;
  });

  if (!foundKey) {
    updatedLines.push(`PIXAZO_API_KEY=${cleanKey}`);
  }
  if (!foundModel) {
    updatedLines.push(`PIXAZO_MODEL=${cleanModel}`);
  }
  if (!foundConcurrency) {
    updatedLines.push(`PIXAZO_CONCURRENCY=${cleanConcurrency}`);
  }

  fs.writeFileSync(targetPath, updatedLines.join('\n'), 'utf-8');
  console.log(`[Env] Saved Pixazo config to ${targetPath}`);

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
