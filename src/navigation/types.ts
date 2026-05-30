import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Library: undefined;
  Listen: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Reader: { articleId: string };
  AddUrl: undefined;
};
