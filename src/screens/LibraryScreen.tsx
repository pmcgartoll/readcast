import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArticleRow } from '../components/ArticleRow';
import { EmptyState } from '../components/EmptyState';
import { usePlayback } from '../playback/PlaybackProvider';
import { useAudioProcessing } from '../state/AudioProcessingProvider';
import { useLibrary } from '../state/LibraryProvider';
import { fonts, layout, radii, spacing, useTheme } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function LibraryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { articles, isLoading, refresh } = useLibrary();
  const { playArticle, enqueue, isQueued, current, isPlaying } = usePlayback();
  const { getJob, retry } = useAudioProcessing();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const onListen = useCallback(
    async (articleId: string) => {
      const article = articles.find((a) => a.id === articleId);
      if (!article) return;
      await playArticle(article);
      navigation.navigate('Tabs', { screen: 'Listen' });
    },
    [articles, playArticle, navigation],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Library</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {articles.length === 0
              ? 'Save anything to read later'
              : `${articles.length} saved`}
          </Text>
        </View>
        <Pressable
          testID="open-add-url"
          accessibilityRole="button"
          onPress={() => navigation.navigate('AddUrl')}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.addLabel, { color: colors.accentText }]}>+ Add</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="📚"
              title="Nothing saved yet"
              subtitle="Tap + Add and paste a link. ReadCast saves it for offline reading and listening."
            />
          }
          renderItem={({ item }) => (
            <ArticleRow
              article={item}
              onPress={() => navigation.navigate('Reader', { articleId: item.id })}
              onListen={() => onListen(item.id)}
              onEnqueue={() => enqueue(item)}
              isPlaying={current?.id === item.id && isPlaying}
              isQueued={isQueued(item.id)}
              audioJob={getJob(item.id)}
              onRetryAudio={() => retry(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  title: { fontFamily: fonts.serif, fontSize: 32 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, marginTop: 2 },
  addButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  addLabel: { fontFamily: fonts.medium, fontSize: 15 },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
