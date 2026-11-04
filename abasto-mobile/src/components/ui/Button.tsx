import { Pressable, type PressableProps } from 'react-native';

type ButtonProps = PressableProps & {
  className?: string;
};

// Shared primary-action alignment and color; screen geometry belongs to callers.
const primaryAction = 'flex-row items-center justify-center bg-primary';

export function Button({ className, ...props }: ButtonProps) {
  return <Pressable {...props} className={className ? `${primaryAction} ${className}` : primaryAction} />;
}
