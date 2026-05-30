import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { DEV_STUB_MODE, API_BASE_URL } from '../config';
import { useLibrary } from '../state/LibraryProvider';
import { fonts, layout, radii, spacing, useTheme } from '../theme';

export function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { articles, remove } = useLibrary();

  const clearAll = async () => {
    for (const a of articles) {
      await remove(a.id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Settings</Text>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Audio" colors={colors}>
          <Row label="Voice" value="Narrator (default)" colors={colors} />
          <Row label="Generation" value={DEV_STUB_MODE ? 'Sample (stub mode)' : 'Cloud TTS'} colors={colors} />
        </Section>

        <Section title="Sync & Backend" colors={colors}>
          <Row label="Mode" value={DEV_STUB_MODE ? 'Offline stub' : 'Connected'} colors={colors} />
          <Row label="API" value={DEV_STUB_MODE ? '—' : API_BASE_URL} colors={colors} />
        </Section>

        <Section title="CarPlay" colors={colors}>
          <Row label="Status" value="Phase 3 (device build)" colors={colors} />
          <Text style={[styles.note, { color: colors.textFaint }]}>
            CarPlay needs a native iOS build and Apple’s carplay-audio entitlement. The audio engine is built behind an interface so it drops in without UI changes.
          </Text>
        </Section>

        <Section title="Storage" colors={colors}>
          <Row label="Saved articles" value={String(articles.length)} colors={colors} />
          <AppButton
            label="Clear library"
            variant="secondary"
            onPress={clearAll}
            style={{ marginTop: spacing.md }}
            testID="clear-library"
          />
        </Section>

        <Text style={[styles.version, { color: colors.textFaint }]}>ReadCast 0.1.0</Text>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  colors,
  children,
}: {
  title: string;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function Row({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: colors.textMuted }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  screenTitle: {
    fontFamily: fonts.serif,
    fontSize: 28,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowLabel: { fontFamily: fonts.body, fontSize: 15 },
  rowValue: { fontFamily: fonts.body, fontSize: 15, flexShrink: 1, textAlign: 'right' },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, paddingBottom: spacing.md },
  version: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginTop: spacing.lg },
});
