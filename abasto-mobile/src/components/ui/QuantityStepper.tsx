import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type QuantityStepperProps = {
  value: ReactNode;
  decreaseIcon: ReactNode;
  increaseIcon: ReactNode;
  decreaseLabel: string;
  increaseLabel: string;
  onDecrease?: () => void;
  onIncrease?: () => void;
  decreaseDisabled?: boolean;
  increaseDisabled?: boolean;
  className: string;
  decreaseClassName: string;
  increaseClassName: string;
  valueClassName?: string;
};

export function QuantityStepper({ value, decreaseIcon, increaseIcon, decreaseLabel, increaseLabel, onDecrease, onIncrease, decreaseDisabled, increaseDisabled, className, decreaseClassName, increaseClassName, valueClassName }: QuantityStepperProps) {
  return <View className={className}>
    <Pressable accessibilityLabel={decreaseLabel} disabled={decreaseDisabled} onPress={onDecrease} className={decreaseClassName}>{decreaseIcon}</Pressable>
    {valueClassName ? <View className={valueClassName}>{value}</View> : value}
    <Pressable accessibilityLabel={increaseLabel} disabled={increaseDisabled} onPress={onIncrease} className={increaseClassName}>{increaseIcon}</Pressable>
  </View>;
}
