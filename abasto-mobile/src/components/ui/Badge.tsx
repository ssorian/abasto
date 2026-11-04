import type { ComponentProps } from 'react';
import { BrandText } from './brand-text';

type BadgeProps = ComponentProps<typeof BrandText> & {
  tone?: 'stock' | 'neutral';
};

/** Non-interactive, rounded status label. Placement and spacing belong to the screen. */
export function Badge({ tone = 'stock', className = '', ...props }: BadgeProps) {
  return <BrandText {...props} className={`rounded font-bold ${tone === 'stock' ? 'bg-stock-green-bg text-stock-green' : 'bg-[#e4e2dd] text-text-carbon'} ${className}`} />;
}
