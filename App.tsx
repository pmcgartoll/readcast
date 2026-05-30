import {
  DMSans_400Regular,
  DMSans_500Medium,
  useFonts as useSansFonts,
} from '@expo-google-fonts/dm-sans';
import {
  DMSerifDisplay_400Regular,
  useFonts as useSerifFonts,
} from '@expo-google-fonts/dm-serif-display';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { PlaybackProvider } from './src/playback/PlaybackProvider';
import { LibraryProvider } from './src/state/LibraryProvider';
import { SettingsProvider } from './src/state/SettingsProvider';
import { palettes } from './src/theme';

function buildNavTheme(isDark: boolean): NavTheme {
  const palette = isDark ? palettes.dark : palettes.light;
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.accent,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
    },
  };
}

export default function App() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [sansLoaded] = useSansFonts({ DMSans_400Regular, DMSans_500Medium });
  const [serifLoaded] = useSerifFonts({ DMSerifDisplay_400Regular });
  const fontsLoaded = sansLoaded && serifLoaded;

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? palettes.dark.background : palettes.light.background,
        }}
      >
        <ActivityIndicator color={palettes.light.accent} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <LibraryProvider>
          <PlaybackProvider>
            <NavigationContainer ref={navigationRef} theme={buildNavTheme(isDark)}>
              <RootNavigator />
            </NavigationContainer>
            <StatusBar style={isDark ? 'light' : 'dark'} />
          </PlaybackProvider>
        </LibraryProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
