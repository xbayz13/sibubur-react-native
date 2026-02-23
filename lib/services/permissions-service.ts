import apiClient from '../api';

export const permissionsService = {
  async getUserPermissions(): Promise<string[]> {
    try {
      const profileResponse = await apiClient.get<{ roleName?: string; permissions?: string[] }>('/auth/profile');
      const profileData = profileResponse.data;

      if (profileData.roleName === 'SuperAdmin') {
        return ['superadmin:*'];
      }
      if (profileData.roleName === 'Owner') {
        return profileData.permissions ?? [];
      }

      return profileData.permissions ?? [];
    } catch {
      return [];
    }
  },

  async isSuperAdmin(): Promise<boolean> {
    try {
      const profileResponse = await apiClient.get<{ roleName?: string }>('/auth/profile');
      const roleName = profileResponse.data.roleName;
      return roleName === 'SuperAdmin' || roleName === 'Owner';
    } catch {
      return false;
    }
  },
};
