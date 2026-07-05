import { createApp } from './app.js';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const PORT = Number(process.env.PORT ?? 4000);
const RENDER_PORT = Number(process.env.RENDER_PORT ?? 4001);

// ---------------------------------------------------------------------------
// Start the rendering service as an isolated child process
// ---------------------------------------------------------------------------

function startRenderingService(): void {
  const servicePath = path.resolve('src/rendering/service.ts');

  if (!fs.existsSync(servicePath)) {
    console.error(`[server] Rendering service not found at ${servicePath}`);
    console.error('[server] Please ensure the file exists. The main API will start without it.');
    return;
  }

  const renderProcess = spawn('npx', ['tsx', servicePath], {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: {
      ...process.env,
      RENDER_PORT: String(RENDER_PORT),
    },
  });

  renderProcess.stdout?.on('data', (data: Buffer) => {
    for (const line of data.toString().trim().split('\n')) {
      console.log(`[rendering] ${line}`);
    }
  });

  renderProcess.stderr?.on('data', (data: Buffer) => {
    for (const line of data.toString().trim().split('\n')) {
      console.error(`[rendering:err] ${line}`);
    }
  });

  renderProcess.on('exit', (code, signal) => {
    console.log(`[server] Rendering service exited (code=${code}, signal=${signal})`);
    // Don't restart automatically — a crash here means something is wrong
    // The main API continues to serve requests (returns errors for render calls)
  });

  renderProcess.on('error', (err) => {
    console.error(`[server] Failed to start rendering service:`, err.message);
  });

  // Clean up child process on main process exit
  const cleanup = () => {
    if (renderProcess && !renderProcess.killed) {
      renderProcess.kill('SIGTERM');
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  // Don't add 'exit' listener — it can cause infinite loops
}

// ---------------------------------------------------------------------------
// Start the main API server
// ---------------------------------------------------------------------------

const app = createApp();

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);

  // Start the rendering service after the main API is ready
  startRenderingService();
});
