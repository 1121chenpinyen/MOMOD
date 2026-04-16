import { MoneyProvider } from '../context/moneyContext';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <MoneyProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </MoneyProvider>
  );
}