/**
 * Render service health status — shared across modules.
 *
 * This is a small, dedicated module that both `server.ts` (which manages
 * the render process lifecycle) and `app.ts` (which exposes it in the
 * health endpoint) can import without creating a circular dependency.
 *
 * The status is updated by `server.ts` as the rendering service starts,
 * becomes ready, or fails.
 */

export type RenderServiceStatusValue = 'starting' | 'ready' | 'stopped' | 'error';

interface RenderServiceStatus {
  status: RenderServiceStatusValue;
  pid: number | null;
  port: number;
}

const _state: RenderServiceStatus = {
  status: 'stopped',
  pid: null,
  port: Number(process.env.RENDER_PORT ?? 4001),
};

/**
 * Update the render service status (called by server.ts).
 */
export function setRenderServiceStatus(
  status: RenderServiceStatusValue,
  pid?: number | null,
): void {
  _state.status = status;
  if (pid !== undefined) {
    _state.pid = pid;
  }
}

/**
 * Get the current render service health status (called by app.ts, submission.ts).
 */
export function getRenderServiceStatus(): Readonly<RenderServiceStatus> {
  return { ..._state };
}
