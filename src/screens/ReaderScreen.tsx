import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { ReaderContent } from '../components/ReaderContent';
import { usePlayback } from '../playback/PlaybackProvider';
import { useLibrary } from '../state/LibraryProvider';
import { fonts, radii, spacing, useTheme } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type ReaderRoute = RouteProp<RootStackParamList, 'Reader'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ReaderScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<ReaderRoute>();
  const { getById, updateProgress } = useLibrary();
  const { playArticle } = usePlayback();

  const article = getById(route.params.articleId);
  const initialProgress = useRef(article?.readProgress ?? 0).current;

  const onProgress = useCallback(
    (p: number) => {
      if (article) void updateProgress(article.id, p);
    },
    [article, updateProgress],
  );

  if (!article) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <EmptyState title="Article not found" subtitle="It may have been removed." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable testID="reader-back" onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={[styles.back, { color: colors.text }]}>‹ Library</Text>
        </Pressable>
        <Text style={[styles.site, { color: colors.textMuted }]} numberOfLines={1}>
          {article.siteName}
        </Text>
        <Pressable
          testID="reader-listen"
          onPress={() => {
            void playArticle(article);
            navigation.navigate('Tabs', { screen: 'Listen' });
          }}
          hitSlop={10}
          style={[styles.listenBtn, { backgroundColor: colors.surfaceMuted }]}
        >
          <Text style={[styles.listenLabel, { color: colors.text }]}>▶ Listen</Text>
        </Pressable>
      </View>

      <ReaderContent
        article={article}
        initialProgress={initialProgress}
        onProgress={onProgress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { fontFamily: fonts.medium, fontSize: 16 },
  site: { flex: 1, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  listenBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  listenLabel: { fontFamily: fonts.medium, fontSize: 14 },
});
