import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function TabIndex() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect href="/login" />;
  return <Redirect href={'/(tabs)/dashboard' as never} />;
}
