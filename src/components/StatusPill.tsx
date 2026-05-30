import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, radii, spacing, useTheme } from '../theme';
import type { ArticleStatus } from '../types';

export function StatusPill({ status }: { status: ArticleStatus }) {
  const { colors } = useTheme();
  const map = {
    pending: { label: 'Saving…', color: colors.warning },
    ready: { label: 'Offline', color: colors.success },
    failed: { label: 'Failed', color: colors.danger },
  } as const;
  const { label, color } = map[status];

  return (
    <View style={[styles.pill, { backgroundColor: `${color}22` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
});
