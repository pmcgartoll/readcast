import React, { useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { layout, spacing, useTheme } from '../theme';
import type { ReaderContentProps } from './readerContentProps';

/**
 * Web reader: renders article paragraphs as native text in a ScrollView and
 * reports scroll progress. This is what the agent verifies in the web preview.
 */
export function ReaderContent({ article, onProgress }: ReaderContentProps) {
  const { colors } = useTheme();
  const lastReported = useRef(0);
  const paragraphs = article.contentText
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const scrollable = contentSize.height - layoutMeasurement.height;
    const p = scrollable > 0 ? contentOffset.y / scrollable : 0;
    if (Math.abs(p - lastReported.current) > 0.02) {
      lastReported.current = p;
      onProgress?.(Math.max(0, Math.min(1, p)));
    }
  };

  return (
    <ScrollView
      testID="reader-scroll"
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      scrollEventThrottle={64}
      onScroll={handleScroll}
    >
      {article.heroImageUrl ? (
        <View
          style={[styles.hero, { backgroundColor: colors.surfaceMuted }]}
          accessibilityRole="image"
        />
      ) : null}
      {paragraphs.map((p, i) => (
        <Text key={i} style={[styles.paragraph, { color: colors.text }]}>
          {p}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 120,
    width: '100%',
    maxWidth: layout.contentMaxWidth + 80,
    alignSelf: 'center',
  },
  hero: {
    height: 180,
    borderRadius: 16,
    marginBottom: spacing.lg,
  },
  paragraph: {
    fontFamily: 'Georgia',
    fontSize: 19,
    lineHeight: 31,
    marginBottom: spacing.lg,
  },
});
