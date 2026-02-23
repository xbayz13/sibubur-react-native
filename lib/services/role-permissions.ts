import apiClient from '../api';
import { Permission } from '@/types';

export const rolePermissionsService = {
  async getRolePermissions(roleId: number): Promise<Permission[]> {
    const response = await apiClient.get<Permission[]>(`/roles/${roleId}/permissions`);
    return response.data;
  },

  async assignPermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await apiClient.post(`/roles/${roleId}/permissions`, { permissionIds });
  },

  async addPermission(roleId: number, permissionId: number): Promise<void> {
    await apiClient.post(`/roles/${roleId}/permissions/permission/${permissionId}`);
  },

  async removePermission(roleId: number, permissionId: number): Promise<void> {
    await apiClient.delete(`/roles/${roleId}/permissions/permission/${permissionId}`);
  },
};
