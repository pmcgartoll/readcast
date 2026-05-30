import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';

import { buildReaderHtml } from '../services/readerHtml';
import { useTheme } from '../theme';
import type { ReaderContentProps } from './readerContentProps';

/**
 * Native reader: renders the cleaned article HTML in a WebView and reports
 * scroll progress back so reading position is remembered.
 */
export function ReaderContent({
  article,
  initialProgress = 0,
  onProgress,
}: ReaderContentProps) {
  const { colors } = useTheme();
  const lastReported = useRef(0);

  const html = buildReaderHtml(article.title, article.contentHtml, colors);

  const injected = `
(function() {
  function post() {
    var h = document.body.scrollHeight - window.innerHeight;
    var p = h > 0 ? window.scrollY / h : 0;
    window.ReactNativeWebView.postMessage(String(p));
  }
  window.addEventListener('scroll', function(){ post(); }, { passive: true });
  setTimeout(function() {
    var h = document.body.scrollHeight - window.innerHeight;
    if (h > 0 && ${initialProgress} > 0) window.scrollTo(0, h * ${initialProgress});
    post();
  }, 250);
})();
true;
`;

  return (
    <WebView
      testID="reader-webview"
      originWhitelist={['*']}
      source={{ html }}
      style={{ backgroundColor: colors.background }}
      injectedJavaScript={injected}
      onMessage={(event) => {
        const p = Number(event.nativeEvent.data);
        if (!Number.isNaN(p) && Math.abs(p - lastReported.current) > 0.02) {
          lastReported.current = p;
          onProgress?.(p);
        }
      }}
    />
  );
}
