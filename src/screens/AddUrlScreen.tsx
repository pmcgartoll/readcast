import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '../components/AppButton';
import { useLibrary } from '../state/LibraryProvider';
import { isValidUrl } from '../services/url';
import { fonts, radii, spacing, useTheme } from '../theme';

export function AddUrlScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { addUrl } = useLibrary();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setError(null);
    if (!isValidUrl(url)) {
      setError('Enter a valid web address (e.g. example.com/article).');
      return;
    }
    setSaving(true);
    try {
      await addUrl(url);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that link.');
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Save a link</Text>
        <Pressable testID="cancel-add" onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={[styles.cancel, { color: colors.textMuted }]}>Cancel</Text>
        </Pressable>
      </View>

      <Text style={[styles.label, { color: colors.textMuted }]}>Web address</Text>
      <TextInput
        testID="add-url-input"
        value={url}
        onChangeText={(t) => {
          setUrl(t);
          if (error) setError(null);
        }}
        placeholder="https://example.com/great-article"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSave}
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border, color: colors.text },
        ]}
      />
      {error ? (
        <Text testID="add-url-error" style={[styles.error, { color: colors.danger }]}>
          {error}
        </Text>
      ) : (
        <Text style={[styles.hint, { color: colors.textFaint }]}>
          ReadCast extracts the article, saves it for offline reading, and can read it aloud.
        </Text>
      )}

      <AppButton
        testID="save-button"
        label="Save for later"
        onPress={onSave}
        loading={saving}
        style={{ marginTop: spacing.lg }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  title: { fontFamily: fonts.serif, fontSize: 26 },
  cancel: { fontFamily: fonts.medium, fontSize: 16 },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  error: { fontFamily: fonts.body, fontSize: 13, marginTop: spacing.sm },
  hint: { fontFamily: fonts.body, fontSize: 13, marginTop: spacing.sm, lineHeight: 19 },
});
