import type { ReactNode } from 'react';
import { View } from 'react-native';
import { BrandText } from './brand-text';

type SectionHeadingProps = {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  titleClassName?: string;
  variant: 'display' | 'body';
};

export function SectionHeading({ title, leading, trailing, className = '', titleClassName = '', variant }: SectionHeadingProps) {
  return <View className={`flex-row items-center ${className}`}>
    {leading}
    <BrandText variant={variant} className={`text-[18px] font-bold text-text-carbon ${titleClassName}`}>{title}</BrandText>
    {trailing}
  </View>;
}
