import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  PLAYBACK_RATE_MAX,
  PLAYBACK_RATE_MIN,
  PLAYBACK_RATE_PRESETS,
  PLAYBACK_RATE_STEP,
} from '../config';
import {
  formatPlaybackRate,
  parsePlaybackRateInput,
  snapPlaybackRate,
} from '../services/playbackRate';
import { fonts, radii, spacing, useTheme } from '../theme';

type SpeedControlOverlayProps = {
  visible: boolean;
  rate: number;
  onClose: () => void;
  onSelectRate: (rate: number) => void;
};

/**
 * Floating speed picker: preset chips, a stepped slider, and tap-to-type for
 * precise values. Shown over the player when the user taps the speed control.
 */
export function SpeedControlOverlay({
  visible,
  rate,
  onClose,
  onSelectRate,
}: SpeedControlOverlayProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState(rate);
  const [editing, setEditing] = useState(false);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft(snapPlaybackRate(rate));
      setEditing(false);
    }
  }, [visible, rate]);

  const commit = (value: number) => {
    const snapped = snapPlaybackRate(value);
    setDraft(snapped);
    onSelectRate(snapped);
  };

  const startEditing = () => {
    setInputText(String(draft).replace(/\.0+$/, ''));
    setEditing(true);
  };

  const finishEditing = () => {
    setEditing(false);
    const parsed = parsePlaybackRateInput(inputText);
    if (parsed !== null) commit(parsed);
  };

  const selectPreset = (preset: number) => {
    commit(preset);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        testID="speed-overlay-backdrop"
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        <Pressable
          testID="speed-overlay-card"
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.text,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.textMuted }]}>Playback speed</Text>

          {editing ? (
            <View style={styles.rateEditRow}>
              <TextInput
                testID="speed-overlay-input"
                value={inputText}
                onChangeText={setInputText}
                keyboardType="decimal-pad"
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={finishEditing}
                onBlur={finishEditing}
                style={[
                  styles.rateInput,
                  {
                    color: colors.text,
                    borderColor: colors.accent,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              />
              <Text style={[styles.rateSuffix, { color: colors.textMuted }]}>×</Text>
            </View>
          ) : (
            <Pressable
              testID="speed-overlay-rate"
              onPress={startEditing}
              hitSlop={8}
              style={[
                styles.rateChip,
                { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.rateChipText, { color: colors.text }]}>
                {formatPlaybackRate(draft)}
              </Text>
              <Text style={[styles.rateHint, { color: colors.textFaint }]}>tap to type</Text>
            </Pressable>
          )}

          <View style={styles.sliderWrap}>
            <Slider
              testID="speed-overlay-slider"
              value={draft}
              minimumValue={PLAYBACK_RATE_MIN}
              maximumValue={PLAYBACK_RATE_MAX}
              step={PLAYBACK_RATE_STEP}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.surfaceMuted}
              thumbTintColor={colors.accent}
              onValueChange={(v) => setDraft(snapPlaybackRate(v))}
              onSlidingComplete={(v) => commit(v)}
            />
            <View style={styles.sliderLabels}>
              <Text style={[styles.sliderLabel, { color: colors.textFaint }]}>
                {PLAYBACK_RATE_MIN}×
              </Text>
              <Text style={[styles.sliderLabel, { color: colors.textFaint }]}>
                {PLAYBACK_RATE_MAX}×
              </Text>
            </View>
          </View>

          <View style={styles.presets}>
            {PLAYBACK_RATE_PRESETS.map((preset) => {
              const selected = snapPlaybackRate(draft) === preset;
              return (
                <Pressable
                  key={preset}
                  testID={`speed-preset-${preset}`}
                  onPress={() => selectPreset(preset)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: selected ? colors.accent : colors.surfaceMuted,
                      borderColor: selected ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: selected ? colors.accentText : colors.text },
                    ]}
                  >
                    {preset}×
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  rateChip: {
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    minWidth: 120,
  },
  rateChipText: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 38,
  },
  rateHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 2,
  },
  rateEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  rateInput: {
    fontFamily: fonts.serif,
    fontSize: 32,
    lineHeight: 38,
    minWidth: 88,
    textAlign: 'center',
    borderWidth: 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rateSuffix: {
    fontFamily: fonts.serif,
    fontSize: 28,
  },
  sliderWrap: {
    marginBottom: spacing.md,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.xs,
  },
  sliderLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 52,
    alignItems: 'center',
  },
  presetText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
