import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, useTheme } from '../theme';

export function ProgressBar({
  progress,
  height = 4,
}: {
  progress: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceMuted, height }]}>
      <View
        style={[
          styles.fill,
          { backgroundColor: colors.accent, width: `${pct}%`, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radii.pill,
  },
});
