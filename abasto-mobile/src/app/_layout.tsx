import '../global.css';

import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [loaded] = useFonts({
    'Inter-400': require('../../assets/fonts/Inter-400.ttf'),
    'Inter-500': require('../../assets/fonts/Inter-500.ttf'),
    'Inter-600': require('../../assets/fonts/Inter-600.ttf'),
    'Inter-700': require('../../assets/fonts/Inter-700.ttf'),
    'Inter-800': require('../../assets/fonts/Inter-800.ttf'),
    'PlusJakartaSans-400': require('../../assets/fonts/PlusJakartaSans-400.ttf'),
    'PlusJakartaSans-500': require('../../assets/fonts/PlusJakartaSans-500.ttf'),
    'PlusJakartaSans-600': require('../../assets/fonts/PlusJakartaSans-600.ttf'),
    'PlusJakartaSans-700': require('../../assets/fonts/PlusJakartaSans-700.ttf'),
    'PlusJakartaSans-800': require('../../assets/fonts/PlusJakartaSans-800.ttf'),
  });

  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
