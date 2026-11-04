import { Pressable, type PressableProps } from 'react-native';

type IconButtonProps = Omit<PressableProps, 'accessibilityLabel'> & {
  accessibilityLabel: string;
  className?: string;
};

const iconAction = 'h-11 w-11 items-center justify-center';

export function IconButton({ accessibilityLabel, className, ...props }: IconButtonProps) {
  return <Pressable {...props} accessibilityLabel={accessibilityLabel} className={className ? `${iconAction} ${className}` : iconAction} />;
}
