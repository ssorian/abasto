import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

type SelectableOptionProps = {
  selected: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  className?: string;
  children: ReactNode;
};

export function SelectableOption({ selected, onPress, accessibilityLabel, className, children }: SelectableOptionProps) {
  return <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel} accessibilityRole="radio" accessibilityState={{ checked: selected }} className={className}>{children}</Pressable>;
}
