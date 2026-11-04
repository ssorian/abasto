import { Text, type TextProps } from 'react-native';

type BrandTextProps = TextProps & {
  className?: string;
  variant?: 'body' | 'display';
};

export function BrandText({ className, style, variant = 'body', ...props }: BrandTextProps) {
  const weight = /(?:^|\s)font-(?:extrabold|black)(?:\s|$)/.test(className ?? '') ? 800
    : /(?:^|\s)font-bold(?:\s|$)/.test(className ?? '') ? 700
    : /(?:^|\s)font-semibold(?:\s|$)/.test(className ?? '') ? 600
    : /(?:^|\s)font-medium(?:\s|$)/.test(className ?? '') ? 500
    : 400;
  const family = variant === 'display' ? 'PlusJakartaSans' : 'Inter';

  return <Text {...props} className={className} style={[{ fontFamily: `${family}-${weight}`, fontWeight: 'normal' }, style]} />;
}
