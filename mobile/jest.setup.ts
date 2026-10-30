// Adresse fictive : les tests ne contactent jamais la vraie API (fetch est simulé).
process.env.EXPO_PUBLIC_API_URL = 'https://api.test';

// SecureStore n'existe pas dans Jest : stockage en mémoire, remis à zéro par test.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    __store: store,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
  };
});

beforeEach(() => {
  (jest.requireMock('expo-secure-store') as { __store: Map<string, string> }).__store.clear();
});
