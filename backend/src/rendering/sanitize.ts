/**
 * HTML/CSS sanitization for the rendering pipeline.
 *
 * This runs BEFORE the content reaches Playwright, as defense in depth.
 * Even though JS is disabled at the Playwright level, we strip/reject
 * suspicious patterns here so they never even enter the renderer.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum payload size (HTML + CSS combined) in bytes. */
export const MAX_PAYLOAD_BYTES = 500_000; // 500 KB

/** Absolute minimum payload — empty submissions make no sense. */
export const MIN_PAYLOAD_BYTES = 10; // roughly "<div>x</div>" + minimal CSS

/** Regular expression to detect external URL references in content. */
const EXTERNAL_URL_RE =
  /(?:url\s*\(\s*(?:['"]?)\s*(?:https?:\/\/|\/\/))/gi;

/** Pattern to strip <script> tags and their contents. */
const SCRIPT_TAG_RE =
  /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;

/** Pattern to strip event handler attributes (onclick, onload, etc.). */
const EVENT_HANDLER_RE =
  /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/** Pattern to detect javascript: URLs in href/src/action/etc. */
const JAVASCRIPT_URL_RE = /javascript\s*:/gi;



// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SanitizationResult {
  html: string;
  css: string;
  sanitized: boolean;
  warnings: string[];
}

export interface ValidationError {
  valid: false;
  error: string;
}

export interface ValidationSuccess {
  valid: true;
}

export type ValidationResult = ValidationError | ValidationSuccess;

// ---------------------------------------------------------------------------
// Validation — reject before sanitization
// ---------------------------------------------------------------------------

/**
 * Validate the raw submission payload before any processing.
 * Checks size limits and obvious rejection patterns.
 */
export function validatePayload(
  html: string,
  css: string,
): ValidationResult {
  const combined = html + css;
  const byteLength = Buffer.byteLength(combined, 'utf8');

  if (byteLength > MAX_PAYLOAD_BYTES) {
    return {
      valid: false,
      error: `Payload too large: ${byteLength} bytes (max ${MAX_PAYLOAD_BYTES})`,
    };
  }

  if (byteLength < MIN_PAYLOAD_BYTES) {
    return {
      valid: false,
      error: `Payload too small: ${byteLength} bytes (min ${MIN_PAYLOAD_BYTES})`,
    };
  }

  if (typeof html !== 'string' || typeof css !== 'string') {
    return { valid: false, error: 'HTML and CSS must be strings' };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize HTML + CSS before rendering.
 *
 * Strips:
 * - <script> tags and their contents
 * - event handler attributes (onclick, onload, onerror, etc.)
 * - javascript: URLs
 * - external URL references in CSS url() values
 *
 * Does NOT strip:
 * - data: URIs (allowed for embedded images/fonts)
 * - same-origin relative URLs like `/uploads/...` (allowed for challenge assets)
 */
export function sanitizeSubmission(
  html: string,
  css: string,
): SanitizationResult {
  const warnings: string[] = [];
  let sanitizedHtml = html;
  let sanitizedCss = css;
  let sanitized = false;

  // 1. Strip <script> tags and their contents
  const scriptMatch = SCRIPT_TAG_RE.exec(sanitizedHtml);
  if (scriptMatch) {
    sanitizedHtml = sanitizedHtml.replace(SCRIPT_TAG_RE, '');
    warnings.push(`Removed ${scriptMatch.length} <script> tag(s)`);
    sanitized = true;
  }

  // 2. Strip event handler attributes
  const eventMatch = EVENT_HANDLER_RE.exec(sanitizedHtml);
  if (eventMatch) {
    sanitizedHtml = sanitizedHtml.replace(EVENT_HANDLER_RE, '');
    warnings.push('Removed event handler attributes');
    sanitized = true;
  }

  // 3. Strip javascript: URLs from HTML attributes
  if (JAVASCRIPT_URL_RE.test(sanitizedHtml)) {
    sanitizedHtml = sanitizedHtml.replace(
      JAVASCRIPT_URL_RE,
      'blocked:',
    );
    warnings.push('Replaced javascript: URLs');
    sanitized = true;
  }

  // 4. Strip external URL references from CSS (data: URIs are not matched by EXTERNAL_URL_RE)
  const cssUrlMatch = EXTERNAL_URL_RE.exec(sanitizedCss);
  if (cssUrlMatch) {
    sanitizedCss = sanitizedCss.replace(
      EXTERNAL_URL_RE,
      'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==) /* blocked */ ',
    );
    warnings.push('Replaced external URL references in CSS');
    sanitized = true;
  }

  // 5. Strip @import with external URLs
  const importExternalRe = /@import\s+(?:url\s*)?\(?\s*(['"]?)(?:https?:\/\/|\/\/)/gi;
  if (importExternalRe.test(sanitizedCss)) {
    sanitizedCss = sanitizedCss.replace(importExternalRe, '/* @import blocked */ ');
    warnings.push('Blocked external @import URLs');
    sanitized = true;
  }

  // 6. Strip <link> tags with external hrefs
  const linkExternalRe = /<link\b[^>]*?\bhref\s*=\s*(['"]?)(?:https?:\/\/|\/\/)[^>]*>/gi;
  if (linkExternalRe.test(sanitizedHtml)) {
    sanitizedHtml = sanitizedHtml.replace(linkExternalRe, '');
    warnings.push('Removed <link> tags with external URLs');
    sanitized = true;
  }

  return {
    html: sanitizedHtml,
    css: sanitizedCss,
    sanitized,
    warnings,
  };
}
