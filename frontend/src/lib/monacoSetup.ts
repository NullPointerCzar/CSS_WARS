// ---------------------------------------------------------------------------
// Monaco editor setup
//
// By default @monaco-editor/react loads Monaco from a CDN (jsDelivr). That
// breaks on the event's offline/intranet network and ships a thinner language
// service. We instead bundle Monaco locally and point the loader at it, so the
// editor works fully offline with strong HTML/CSS IntelliSense.
//
// JavaScript is intentionally disabled: the platform is HTML/CSS-only and JS
// execution is already disabled at render time (Playwright). We omit the
// TypeScript worker entirely, so the HTML pane offers no <script> JS
// completions/diagnostics.
//
// Loaded lazily (via initMonaco) so Monaco is only fetched on the Battle page,
// not on every route.
// ---------------------------------------------------------------------------
import { loader } from '@monaco-editor/react';

let initialized: Promise<void> | null = null;

export function initMonaco(): Promise<void> {
  if (initialized) return initialized;

  initialized = (async () => {
    const monaco = await import('monaco-editor');
    const editorWorker = (
      await import('monaco-editor/esm/vs/editor/editor.worker?worker')
    ).default;
    const jsonWorker = (
      await import('monaco-editor/esm/vs/language/json/json.worker?worker')
    ).default;
    const cssWorker = (
      await import('monaco-editor/esm/vs/language/css/css.worker?worker')
    ).default;
    const htmlWorker = (
      await import('monaco-editor/esm/vs/language/html/html.worker?worker')
    ).default;

    // No TypeScript worker on purpose — disables embedded JS in the HTML editor.
    self.MonacoEnvironment = {
      getWorker(_workerId, label) {
        if (label === 'json') return new jsonWorker();
        if (label === 'css' || label === 'scss' || label === 'less')
          return new cssWorker();
        if (label === 'html' || label === 'handlebars' || label === 'razor')
          return new htmlWorker();
        return new editorWorker();
      },
    };

    // Silence any diagnostics in case a <script> block is still authored.
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });

    loader.config({ monaco });
  })();

  return initialized;
}
