import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { DEV_STUB_MODE, API_BASE_URL, PLAYBACK_RATES } from '../config';
import { useLibrary } from '../state/LibraryProvider';
import { useSettings } from '../state/SettingsProvider';
import { fonts, layout, radii, spacing, useTheme } from '../theme';

export function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { articles, remove } = useLibrary();
  const { playbackRate, voiceInstructions, setPlaybackRate, setVoiceInstructions } =
    useSettings();

  const clearAll = async () => {
    for (const a of articles) {
      await remove(a.id);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Settings</Text>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Section title="Audio" colors={colors}>
          <Row label="Voice" value="Cedar" colors={colors} />
          <Row
            label="Generation"
            value={DEV_STUB_MODE ? 'Sample (stub mode)' : 'OpenAI · gpt-4o-mini-tts'}
            colors={colors}
          />
        </Section>

        <Section title="Playback speed" colors={colors}>
          <View style={styles.speedRow}>
            {PLAYBACK_RATES.map((r) => {
              const selected = r === playbackRate;
              return (
                <Pressable
                  key={r}
                  testID={`speed-${r}`}
                  onPress={() => setPlaybackRate(r)}
                  style={[
                    styles.speedChip,
                    {
                      backgroundColor: selected ? colors.accent : colors.surfaceMuted,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.speedChipText,
                      { color: selected ? colors.accentText : colors.text },
                    ]}
                  >
                    {r}×
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.note, { color: colors.textFaint }]}>
            Default speed for new listens. You can also change it on the fly from the
            player.
          </Text>
        </Section>

        <Section title="Voice prompt" colors={colors}>
          <TextInput
            testID="voice-instructions-input"
            value={voiceInstructions}
            onChangeText={setVoiceInstructions}
            placeholder="e.g. Calm, warm narrator. Speak clearly with relaxed pacing."
            placeholderTextColor={colors.textFaint}
            multiline
            style={[
              styles.promptInput,
              { backgroundColor: colors.surfaceMuted, borderColor: colors.border, color: colors.text },
            ]}
          />
          <Text style={[styles.note, { color: colors.textFaint }]}>
            Steers tone and delivery for the Cedar voice on newly generated audio.
            Leave blank for default narration.
          </Text>
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
  speedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  speedChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 56,
    alignItems: 'center',
  },
  speedChipText: { fontFamily: fonts.medium, fontSize: 14 },
  promptInput: {
    minHeight: 92,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },
  version: { fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginTop: spacing.lg },
});
