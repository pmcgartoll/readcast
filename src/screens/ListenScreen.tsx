import React, { useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { usePlayback } from '../playback/PlaybackProvider';
import { formatDuration } from '../services/format';
import { fonts, layout, radii, spacing, useTheme } from '../theme';

export function ListenScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const player = usePlayback();
  const [trackWidth, setTrackWidth] = useState(0);

  const {
    current,
    queue,
    currentIndex,
    isPlaying,
    isLoading,
    positionMs,
    durationMs,
    rate,
    toggle,
    seekTo,
    skipNext,
    skipPrev,
    cycleRate,
    playAt,
    removeFromQueue,
  } = player;

  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  const onSeekPress = (e: GestureResponderEvent) => {
    if (trackWidth <= 0 || durationMs <= 0) return;
    const x = e.nativeEvent.locationX;
    void seekTo((x / trackWidth) * durationMs);
  };

  if (!current) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Listen</Text>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="🎧"
            title="Nothing playing"
            subtitle="Tap Listen on any saved article to start a podcast-style queue."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Now Playing</Text>

        {current.heroImageUrl ? (
          <Image source={{ uri: current.heroImageUrl }} style={[styles.art, { backgroundColor: colors.surfaceMuted }]} />
        ) : (
          <View style={[styles.art, { backgroundColor: colors.surfaceMuted }]} />
        )}

        <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
        <Text style={[styles.site, { color: colors.textMuted }]}>{current.siteName}</Text>

        <Pressable
          testID="seek-track"
          onPress={onSeekPress}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={styles.seekHit}
        >
          <View style={[styles.seekTrack, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.seekFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
          </View>
        </Pressable>
        <View style={styles.times}>
          <Text style={[styles.time, { color: colors.textFaint }]}>{formatDuration(positionMs)}</Text>
          <Text style={[styles.time, { color: colors.textFaint }]}>{formatDuration(durationMs)}</Text>
        </View>

        <View style={styles.controls}>
          <ControlButton label="⏮" onPress={skipPrev} colors={colors} testID="ctrl-prev" />
          <ControlButton label="-15" small onPress={() => seekTo(positionMs - 15000)} colors={colors} testID="ctrl-back15" />
          <Pressable
            testID="ctrl-toggle"
            onPress={toggle}
            style={[styles.playBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.playIcon, { color: colors.accentText }]}>
              {isLoading ? '…' : isPlaying ? '❚❚' : '▶'}
            </Text>
          </Pressable>
          <ControlButton label="+15" small onPress={() => seekTo(positionMs + 15000)} colors={colors} testID="ctrl-fwd15" />
          <ControlButton label="⏭" onPress={skipNext} colors={colors} testID="ctrl-next" />
        </View>

        <Pressable testID="ctrl-rate" onPress={cycleRate} style={styles.rate}>
          <Text style={[styles.rateLabel, { color: colors.textMuted }]}>Speed {rate}×</Text>
        </Pressable>

        {queue.length > 1 ? (
          <View style={styles.queue}>
            <Text style={[styles.queueTitle, { color: colors.text }]}>Up Next</Text>
            {queue.map((item, index) => (
              <View
                key={item.id}
                style={[styles.queueRow, { borderColor: colors.border }]}
              >
                <Pressable style={{ flex: 1 }} onPress={() => playAt(index)} testID={`queue-item-${item.id}`}>
                  <Text
                    style={[
                      styles.queueItemTitle,
                      { color: index === currentIndex ? colors.accent : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {index === currentIndex ? '♪ ' : ''}
                    {item.title}
                  </Text>
                  <Text style={[styles.queueItemSite, { color: colors.textFaint }]} numberOfLines={1}>
                    {item.siteName}
                  </Text>
                </Pressable>
                <Pressable onPress={() => removeFromQueue(item.id)} hitSlop={8} testID={`queue-remove-${item.id}`}>
                  <Text style={[styles.remove, { color: colors.textFaint }]}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function ControlButton({
  label,
  onPress,
  colors,
  small,
  testID,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  small?: boolean;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} hitSlop={10} style={styles.ctrl}>
      <Text style={[small ? styles.ctrlSmall : styles.ctrlLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  screenTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  art: {
    width: '100%',
    maxWidth: layout.artMaxWidth,
    alignSelf: 'center',
    aspectRatio: 1.4,
    borderRadius: radii.lg,
    marginBottom: spacing.xl,
  },
  title: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30 },
  site: { fontFamily: fonts.body, fontSize: 15, marginTop: 4, marginBottom: spacing.xl },
  seekHit: { paddingVertical: spacing.sm },
  seekTrack: { height: 6, borderRadius: radii.pill, overflow: 'hidden' },
  seekFill: { height: 6, borderRadius: radii.pill },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  time: { fontFamily: fonts.body, fontSize: 12 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  ctrl: { minWidth: 36, alignItems: 'center' },
  ctrlLabel: { fontSize: 26 },
  ctrlSmall: { fontFamily: fonts.medium, fontSize: 14 },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { fontSize: 24, fontWeight: '700' },
  rate: { alignSelf: 'center', marginTop: spacing.xl, padding: spacing.sm },
  rateLabel: { fontFamily: fonts.medium, fontSize: 14 },
  queue: { marginTop: spacing.xl, gap: spacing.sm },
  queueTitle: { fontFamily: fonts.serif, fontSize: 20, marginBottom: spacing.sm },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  queueItemTitle: { fontFamily: fonts.medium, fontSize: 15 },
  queueItemSite: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  remove: { fontSize: 16, paddingHorizontal: spacing.sm },
});
