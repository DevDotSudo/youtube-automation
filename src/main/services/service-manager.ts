import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import path from 'path';

/**
 * ServiceManager manages background local AI sidecars:
 * - Kokoro TTS Voice Synthesis Service (Port 8880)
 * Note: Image generation is handled cloud-side via Pixazo AI Gateway.
 */
export class ServiceManager {
  private static kokoroProcess: ChildProcess | null = null;

  static checkPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(800, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  static async startServices(projectRoot: string): Promise<void> {
    // Check & start Kokoro TTS (Port 8880)
    const kokoroAlive = await this.checkPort(8880);
    if (!kokoroAlive) {
      const serverPath = path.join(projectRoot, 'services/kokoro/server.py');
      console.log('[ServiceManager] Spawning Kokoro TTS sidecar:', serverPath);
      this.kokoroProcess = spawn('py', ['-3.13', serverPath], {
        cwd: projectRoot,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      this.kokoroProcess.stdout?.on('data', (d) => process.stdout.write(`[Kokoro] ${d}`));
      this.kokoroProcess.stderr?.on('data', (d) => process.stderr.write(`[Kokoro Error] ${d}`));
    } else {
      console.log('[ServiceManager] Kokoro TTS service is already running on port 8880');
    }
  }

  static stopServices(): void {
    if (this.kokoroProcess) {
      try { this.kokoroProcess.kill(); } catch {}
      this.kokoroProcess = null;
    }
  }
}
