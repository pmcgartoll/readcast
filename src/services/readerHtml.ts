import type { Palette } from '../theme';

/** Wraps article body HTML in a styled, readable document for the WebView. */
export function buildReaderHtml(
  title: string,
  bodyHtml: string,
  palette: Palette,
): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  :root { color-scheme: ${palette.background === '#FBF7F0' ? 'light' : 'dark'}; }
  body {
    margin: 0;
    padding: 24px 20px 96px;
    background: ${palette.background};
    color: ${palette.text};
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 19px;
    line-height: 1.7;
    -webkit-text-size-adjust: 100%;
  }
  h1, h2, h3 { line-height: 1.25; }
  a { color: ${palette.accent}; }
  img { max-width: 100%; height: auto; border-radius: 12px; }
  p { margin: 0 0 1.1em; }
  blockquote {
    margin: 1.2em 0;
    padding-left: 16px;
    border-left: 3px solid ${palette.accent};
    color: ${palette.textMuted};
  }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

/** Builds simple, safe paragraph HTML from plain text paragraphs. */
export function paragraphsToHtml(paragraphs: string[]): string {
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
