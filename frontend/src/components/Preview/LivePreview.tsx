import { type Ref } from 'react';

interface LivePreviewProps {
  htmlCode: string;
  cssCode: string;
  iframeRef: Ref<HTMLIFrameElement>;
}

export function LivePreview({ htmlCode, cssCode, iframeRef }: LivePreviewProps) {
  const srcDoc = buildSrcDoc(htmlCode, cssCode);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="Live Preview"
      className="w-full h-full bg-white"
    />
  );
}

function buildSrcDoc(html: string, css: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; min-height: 100%; }
    body { background: #ffffff; font-family: sans-serif; }
    ${css}
  </style>
</head>
<body>
${html}
</body>
</html>`;
}
