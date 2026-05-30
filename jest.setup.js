/* eslint-disable @typescript-eslint/no-var-requires */

// In-memory AsyncStorage for store + service tests.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// expo-sqlite is native-only; tests use the AsyncStorage store, so a light
// mock keeps imports from blowing up if a module pulls it in transitively.
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(async () => ({
    execAsync: jest.fn(async () => {}),
    runAsync: jest.fn(async () => ({ changes: 0, lastInsertRowId: 0 })),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    withTransactionAsync: jest.fn(async (cb) => {
      await cb();
    }),
  })),
}));
