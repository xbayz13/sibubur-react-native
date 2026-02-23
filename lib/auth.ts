import { LoginRequest, LoginResponse, User } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { TOKEN_KEY, USER_KEY } from './api';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const loginResponse = await apiClient.post<{ access_token: string }>(
      '/auth/login',
      credentials
    );

    if (!loginResponse.data.access_token) {
      throw new Error('No access token received');
    }

    const token = loginResponse.data.access_token;
    await AsyncStorage.setItem(TOKEN_KEY, token);

    let user: User = {
      id: 0,
      username: credentials.username,
      name: credentials.username,
      roleId: 0,
    };

    const payload = decodeJwtPayload(token);
    if (payload) {
      user = {
        id: (payload.sub as number) ?? 0,
        username: (payload.username as string) ?? credentials.username,
        name: (payload.name as string) ?? credentials.username,
        roleId: (payload.roleId as number) ?? 0,
        storeId: (payload.storeId as number | null) ?? null,
        role: payload.roleId
          ? { id: payload.roleId as number, name: (payload.roleName as string) ?? 'User' }
          : undefined,
      };
    }

    try {
      const profileResponse = await apiClient.get<{
        id?: number;
        username?: string;
        name?: string;
        roleId?: number;
        storeId?: number | null;
        role?: { id: number; name: string };
      }>('/auth/profile');

      if (profileResponse.data) {
        user = {
          id: profileResponse.data.id ?? user.id,
          username: profileResponse.data.username ?? user.username,
          name: profileResponse.data.name ?? user.name,
          roleId: profileResponse.data.roleId ?? user.roleId,
          storeId: profileResponse.data.storeId ?? user.storeId,
          role: profileResponse.data.role ?? user.role,
        };
      }
    } catch {
      // Profile fetch optional, use decoded token
    }

    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

    return {
      access_token: token,
      user,
    };
  },

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async getUser(): Promise<User | null> {
    const s = await AsyncStorage.getItem(USER_KEY);
    if (!s) return null;
    try {
      return JSON.parse(s) as User;
    } catch {
      return null;
    }
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  },
};
