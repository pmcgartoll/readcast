import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { navigate } from '../navigation/navigationRef';
import { usePlayback } from '../playback/PlaybackProvider';
import { fonts, radii, spacing, useTheme } from '../theme';
import { ProgressBar } from './ProgressBar';

export function MiniPlayer() {
  const { colors } = useTheme();
  const { current, isPlaying, isLoading, positionMs, durationMs, toggle } =
    usePlayback();

  if (!current) return null;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <Pressable
      testID="mini-player"
      onPress={() => navigate('Tabs', { screen: 'Listen' })}
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={[styles.site, { color: colors.textMuted }]} numberOfLines={1}>
            {current.siteName}
          </Text>
        </View>
        <Pressable
          testID="mini-player-toggle"
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          onPress={toggle}
          hitSlop={10}
          style={[styles.toggle, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.toggleIcon, { color: colors.accentText }]}>
            {isLoading ? '…' : isPlaying ? '❚❚' : '▶'}
          </Text>
        </Pressable>
      </View>
      <ProgressBar progress={progress} height={3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  site: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 1,
  },
  toggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIcon: {
    fontSize: 15,
    fontWeight: '700',
  },
});
