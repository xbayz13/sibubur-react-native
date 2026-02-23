import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variants = {
  primary: { bg: '#4f46e5', bgPressed: '#4338ca', text: '#fff' },
  secondary: { bg: '#6b7280', bgPressed: '#4b5563', text: '#fff' },
  outline: { bg: 'transparent', bgPressed: '#f3f4f6', text: '#4f46e5', border: '#4f46e5' },
  danger: { bg: '#ef4444', bgPressed: '#dc2626', text: '#fff' },
};

const sizes = {
  sm: { paddingV: 8, paddingH: 16, fontSize: 14 },
  md: { paddingV: 12, paddingH: 20, fontSize: 16 },
  lg: { paddingV: 16, paddingH: 24, fontSize: 18 },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const v = variants[variant];
  const s = sizes[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? v.bgPressed : v.bg,
          paddingVertical: s.paddingV,
          paddingHorizontal: s.paddingH,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: 'border' in v ? v.border : undefined,
          opacity: disabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }, textStyle]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontWeight: '600',
  },
});
