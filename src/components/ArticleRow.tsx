import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts, radii, spacing, useTheme } from '../theme';
import type { Article, AudioJob } from '../types';
import { formatRelativeTime } from '../services/format';
import { ProgressBar } from './ProgressBar';
import { StatusPill } from './StatusPill';

type Props = {
  article: Article;
  onPress: () => void;
  onListen: () => void;
  onEnqueue: () => void;
  isPlaying?: boolean;
  isQueued?: boolean;
  /** Current audio processing job for this article, if any. */
  audioJob?: AudioJob;
  onRetryAudio?: () => void;
};

export function ArticleRow({
  article,
  onPress,
  onListen,
  onEnqueue,
  isPlaying,
  isQueued,
  audioJob,
  onRetryAudio,
}: Props) {
  const { colors } = useTheme();
  const ready = article.status === 'ready';

  // Audio pipeline sub-state, only meaningful once the article is ingested.
  const audioStatus = audioJob?.status;
  const audioReady = ready && audioStatus === 'ready';
  const audioFailed = ready && audioStatus === 'failed';
  const audioPreparing = ready && !audioReady && !audioFailed;
  const { completedChunks = 0, totalChunks = 0 } = audioJob ?? {};
  const preparingLabel =
    totalChunks > 0 && completedChunks > 0
      ? `Preparing audio… ${completedChunks}/${totalChunks}`
      : 'Preparing audio…';

  return (
    <Pressable
      testID={`article-row-${article.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.body}>
        {article.heroImageUrl ? (
          <Image
            source={{ uri: article.heroImageUrl }}
            style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]}
          />
        ) : (
          <View style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]} />
        )}
        <View style={styles.content}>
          <Text style={[styles.site, { color: colors.textMuted }]} numberOfLines={1}>
            {article.siteName}
          </Text>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {article.title}
          </Text>
          <View style={styles.metaRow}>
            <StatusPill status={article.status} />
            {ready ? (
              <Text style={[styles.meta, { color: colors.textFaint }]}>
                {article.estimatedReadMinutes} min · {formatRelativeTime(article.createdAt)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {audioReady ? (
        <View style={styles.actions}>
          <Pressable
            testID={`listen-button-${article.id}`}
            accessibilityRole="button"
            onPress={onListen}
            style={({ pressed }) => [
              styles.listenBtn,
              { backgroundColor: colors.surfaceMuted },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.listenLabel, { color: colors.text }]}>
              {isPlaying ? '❚❚  Playing' : '▶  Listen'}
            </Text>
          </Pressable>
          <Pressable
            testID={`queue-button-${article.id}`}
            accessibilityRole="button"
            accessibilityLabel={isQueued ? 'Queued' : 'Add to queue'}
            onPress={onEnqueue}
            style={({ pressed }) => [
              styles.queueBtn,
              { backgroundColor: colors.surfaceMuted },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.listenLabel, { color: isQueued ? colors.success : colors.text }]}>
              {isQueued ? '✓ Queued' : '＋ Queue'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {audioPreparing ? (
        <View
          testID={`audio-status-${article.id}`}
          style={[styles.audioStatus, { backgroundColor: colors.surfaceMuted }]}
        >
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.audioStatusText, { color: colors.textMuted }]}>
            {preparingLabel}
          </Text>
        </View>
      ) : null}

      {audioFailed ? (
        <View
          testID={`audio-status-${article.id}`}
          style={[styles.audioStatus, { backgroundColor: colors.surfaceMuted }]}
        >
          <Text style={[styles.audioStatusText, { color: colors.danger, flex: 1 }]}>
            Audio unavailable
          </Text>
          <Pressable
            testID={`retry-audio-button-${article.id}`}
            accessibilityRole="button"
            accessibilityLabel="Retry audio processing"
            onPress={onRetryAudio}
            style={({ pressed }) => [
              styles.retryBtn,
              { borderColor: colors.accent },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={[styles.retryLabel, { color: colors.accent }]}>↻ Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {article.readProgress > 0.02 ? (
        <View style={styles.progress}>
          <ProgressBar progress={article.readProgress} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    gap: spacing.md,
  },
  body: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  site: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 23,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  listenBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  queueBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  listenLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  audioStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  audioStatusText: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  retryLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  progress: {
    marginTop: 2,
  },
});
