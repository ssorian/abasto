import type { ReactNode } from 'react';
import { View } from 'react-native';

export function Card({ children }: { children: ReactNode }) {
  return <View className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">{children}</View>;
}
