import { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface CardProps {
  children: ReactNode;
  title?: string;
  style?: ViewStyle;
}

export default function Card({ children, title, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {title ? (
        <>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.content}>{children}</View>
        </>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  content: {},
});
