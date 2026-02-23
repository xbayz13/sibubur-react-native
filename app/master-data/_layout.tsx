import { Stack } from 'expo-router';

export default function MasterDataLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'card' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="products" />
      <Stack.Screen name="product-categories" />
      <Stack.Screen name="product-addons" />
      <Stack.Screen name="stores" />
      <Stack.Screen name="expense-categories" />
    </Stack>
  );
}
