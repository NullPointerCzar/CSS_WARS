import { useRef, useCallback, useEffect } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';

const STORAGE_PREFIX = 'csswars_draft_';

interface MonacoEditorProps {
  challengeId: string;
  userId: string;
  htmlCode: string;
  cssCode: string;
  onHtmlChange: (html: string) => void;
  onCssChange: (css: string) => void;
}

export function MonacoEditor({
  challengeId,
  userId,
  htmlCode,
  cssCode,
  onHtmlChange,
  onCssChange,
}: MonacoEditorProps) {
  const htmlEditorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const cssEditorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const htmlTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cssTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = `${STORAGE_PREFIX}${userId}_${challengeId}`;

  // Use refs to avoid stale closures in debounce handlers
  const htmlRef = useRef(htmlCode);
  const cssRef = useRef(cssCode);
  htmlRef.current = htmlCode;
  cssRef.current = cssCode;

  // Save to localStorage
  const saveDraft = useCallback(
    (html: string, css: string) => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ html, css, updatedAt: Date.now() })
        );
      } catch {
        // localStorage full or unavailable — silently ignore
      }
    },
    [storageKey]
  );

  // Debounced change handlers (300ms) — read latest values from refs
  const handleHtmlChange = useCallback(
    (value: string | undefined) => {
      const newHtml = value ?? '';
      if (htmlTimerRef.current) clearTimeout(htmlTimerRef.current);
      htmlTimerRef.current = setTimeout(() => {
        onHtmlChange(newHtml);
        saveDraft(newHtml, cssRef.current);
      }, 300);
    },
    [onHtmlChange, saveDraft]
  );

  const handleCssChange = useCallback(
    (value: string | undefined) => {
      const newCss = value ?? '';
      if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
      cssTimerRef.current = setTimeout(() => {
        onCssChange(newCss);
        saveDraft(htmlRef.current, newCss);
      }, 300);
    },
    [onCssChange, saveDraft]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (htmlTimerRef.current) clearTimeout(htmlTimerRef.current);
      if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
    };
  }, []);

  const handleHtmlMount: OnMount = (editor) => {
    htmlEditorRef.current = editor;
  };

  const handleCssMount: OnMount = (editor) => {
    cssEditorRef.current = editor;
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* HTML Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 rounded-t-xl">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">HTML</span>
          <span className="text-[10px] text-slate-600 font-mono">index.html</span>
        </div>
        <div className="flex-1 min-h-0 rounded-b-xl overflow-hidden border border-slate-800/50 border-t-0">
          <Editor
            height="100%"
            defaultLanguage="html"
            value={htmlCode}
            onChange={handleHtmlChange}
            onMount={handleHtmlMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12 },
            }}
            loading={
              <div className="flex items-center justify-center h-full bg-slate-950">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              </div>
            }
          />
        </div>
      </div>

      {/* CSS Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50 rounded-t-xl">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">CSS</span>
          <span className="text-[10px] text-slate-600 font-mono">styles.css</span>
        </div>
        <div className="flex-1 min-h-0 rounded-b-xl overflow-hidden border border-slate-800/50 border-t-0">
          <Editor
            height="100%"
            defaultLanguage="css"
            value={cssCode}
            onChange={handleCssChange}
            onMount={handleCssMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 2,
              automaticLayout: true,
              padding: { top: 12 },
            }}
            loading={
              <div className="flex items-center justify-center h-full bg-slate-950">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
