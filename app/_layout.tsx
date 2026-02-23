import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { setOnUnauthorized } from '@/lib/api';
import ErrorBoundary from '@/components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

function RootLayoutNav() {
  const { loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setOnUnauthorized(() => {
      router.replace('/login');
    });
  }, [router]);

  // Redirect to login when user logs out (isAuthenticated becomes false while on protected routes)
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="productions" options={{ presentation: 'card' }} />
      <Stack.Screen name="transactions" options={{ presentation: 'card' }} />
      <Stack.Screen name="supplies" options={{ presentation: 'card' }} />
      <Stack.Screen name="expenses" options={{ presentation: 'card' }} />
      <Stack.Screen name="employees" options={{ presentation: 'card' }} />
      <Stack.Screen name="master-data" options={{ presentation: 'card' }} />
      <Stack.Screen name="users" options={{ presentation: 'card' }} />
      <Stack.Screen name="roles" options={{ presentation: 'card' }} />
      <Stack.Screen name="settings" options={{ presentation: 'card' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <RootLayoutNav />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
