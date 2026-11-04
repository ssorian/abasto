import type { ReactNode } from 'react';
import { View } from 'react-native';

type FieldProps = {
  children: ReactNode;
  className?: string;
};

/** Shared horizontal input surface; labels, adornments and input behavior stay with each screen. */
export function Field({ children, className = '' }: FieldProps) {
  return <View className={`flex-row items-center rounded-lg bg-surface-container-lowest ${className}`}>{children}</View>;
}
