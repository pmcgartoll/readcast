import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<Name extends keyof RootStackParamList>(
  ...args: undefined extends RootStackParamList[Name]
    ? [screen: Name] | [screen: Name, params: RootStackParamList[Name]]
    : [screen: Name, params: RootStackParamList[Name]]
): void {
  if (navigationRef.isReady()) {
    // @ts-expect-error variadic param spread is sound for our route map
    navigationRef.navigate(...args);
  }
}
