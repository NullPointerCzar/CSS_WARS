import { createApp } from './app.js';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { setRenderServiceStatus, getRenderServiceStatus } from './renderStatus.js';

const PORT = Number(process.env.PORT ?? 4000);
const RENDER_PORT = Number(process.env.RENDER_PORT ?? 4001);

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1_000,
};

// ---------------------------------------------------------------------------
// Spawn a single render process
// ---------------------------------------------------------------------------

function spawnRenderProcess(): ChildProcess | null {
  const servicePath = path.resolve('src/rendering/service.ts');

  if (!fs.existsSync(servicePath)) {
    console.error(`[render-mgr] Rendering service not found at ${servicePath}`);
    console.error('[render-mgr] The main API will start without it. Submissions will fail with a clear error.');
    return null;
  }

  const renderProcess = spawn('npx', ['tsx', servicePath], {
    cwd: process.cwd(),
    stdio: 'pipe',
    detached: true,
    env: {
      ...process.env,
      RENDER_PORT: String(RENDER_PORT),
    },
  });

  setRenderServiceStatus('starting', renderProcess.pid ?? null);

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

  renderProcess.on('error', (err) => {
    console.error(`[render-mgr] Failed to spawn render process:`, err.message);
    setRenderServiceStatus('error');
  });

  return renderProcess;
}

// ---------------------------------------------------------------------------
// Wait for render service to become healthy
// ---------------------------------------------------------------------------

async function waitForRenderService(
  maxAttempts: number = 10,
  intervalMs: number = 800,
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`http://localhost:${RENDER_PORT}/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      if (res.ok) {
        setRenderServiceStatus('ready');
        return;
      }
    } catch {
      // Not ready yet — keep polling
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  setRenderServiceStatus('error');
  throw new Error(
    `Render service on port ${RENDER_PORT} did not become healthy after ${(maxAttempts * intervalMs) / 1000}s`,
  );
}

// ---------------------------------------------------------------------------
// Retry loop
// ---------------------------------------------------------------------------

async function startRenderingService(retryConfig: RetryConfig = DEFAULT_RETRY): Promise<void> {
  console.log('[render-mgr] Starting rendering service...');
  setRenderServiceStatus('starting');

  let successfulProcess: ChildProcess | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = retryConfig.baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`[render-mgr] Retry ${attempt}/${retryConfig.maxRetries} in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
    }

    // Check if port is already occupied (informational)
    try {
      await fetch(`http://localhost:${RENDER_PORT}/health`, {
        signal: AbortSignal.timeout(500),
      });
      console.warn(`[render-mgr] Port ${RENDER_PORT} appears to be in use. Attempting to start anyway...`);
    } catch {
      // Port is free — proceed
    }

    const renderProcess = spawnRenderProcess();
    if (!renderProcess) {
      setRenderServiceStatus('error');
      return;
    }

    // Unref so it won't keep the parent alive if we don't need it
    renderProcess.unref();

    // Brief pause to detect immediate crashes
    await new Promise((r) => setTimeout(r, 300));

    if (renderProcess.exitCode !== null) {
      console.error(
        `[render-mgr] Render process exited immediately (code=${renderProcess.exitCode}) on attempt ${attempt + 1}`,
      );
      continue;
    }

    try {
      await waitForRenderService();
      console.log(`[render-mgr] Rendering service is ready (PID ${renderProcess.pid}, port ${RENDER_PORT})`);

      successfulProcess = renderProcess;

      // Monitor for unexpected exits post-readiness
      renderProcess.on('exit', (code, signal) => {
        console.error(
          `[render-mgr] Rendering service exited unexpectedly (code=${code}, signal=${signal})`,
        );
        setRenderServiceStatus('error');
        if (code !== 0 && signal === null) {
          console.error('[render-mgr] The scoring engine is no longer available. Submissions will fail with a clear error.');
          console.error('[render-mgr] Restart the backend to re-enable submissions.');
        }
      });

      return; // Success!
    } catch (err: any) {
      console.error(`[render-mgr] Attempt ${attempt + 1}/${retryConfig.maxRetries + 1} failed: ${err.message}`);
      if (!renderProcess.killed) {
        renderProcess.kill('SIGTERM');
      }
    }
  }

  // All retries exhausted
  setRenderServiceStatus('error');
  console.error(
    `[render-mgr] Rendering service failed to start after ${retryConfig.maxRetries + 1} attempt(s).`,
  );
  console.error('[render-mgr] The main API will continue running, but submissions will fail.');
  console.error(`[render-mgr] To fix: check if port ${RENDER_PORT} is in use, or manually start:`);
  console.error(`  cd ${process.cwd()} && RENDER_PORT=${RENDER_PORT} npx tsx src/rendering/service.ts`);
}

// ---------------------------------------------------------------------------
// Start the main API server
// ---------------------------------------------------------------------------

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
  startRenderingService();
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[backend] port ${PORT} is already in use — exiting`);
  } else {
    console.error(`[backend] server error:`, err.message);
  }
  process.exit(1);
});

// ---------------------------------------------------------------------------
// Graceful shutdown — kill render process on exit
// ---------------------------------------------------------------------------

function shutdown(): void {
  console.log('[backend] shutting down...');
  const status = getRenderServiceStatus();
  // If the render service was started, attempt a SIGTERM to its process
  if (status.pid) {
    try {
      process.kill(status.pid, 'SIGTERM');
    } catch {
      // Process may already be dead
    }
  }
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('unhandledRejection', (reason) => {
  console.error('[backend] unhandled rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[backend] uncaught exception:', err);
  process.exit(1);
});
