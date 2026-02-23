import apiClient from '../api';
import { Permission, PaginatedResponse } from '@/types';

export interface CreatePermissionDto {
  module: string;
  action: string;
  slug: string;
}

export interface UpdatePermissionDto {
  module?: string;
  action?: string;
  slug?: string;
}

export interface PermissionsGetAllParams {
  module?: string;
  page?: number;
  limit?: number;
}

export const permissionsService = {
  async getAll(
    params?: PermissionsGetAllParams
  ): Promise<Permission[] | PaginatedResponse<Permission>> {
    const queryParams: Record<string, string | number> = params?.module
      ? { module: params.module }
      : { page: params?.page ?? 1, limit: params?.limit ?? 100 };
    const response = await apiClient.get<Permission[] | PaginatedResponse<Permission>>(
      '/permissions',
      { params: queryParams }
    );
    return response.data;
  },

  async getById(id: number): Promise<Permission> {
    const response = await apiClient.get<Permission>(`/permissions/${id}`);
    return response.data;
  },

  async create(permission: CreatePermissionDto): Promise<Permission> {
    const response = await apiClient.post<Permission>('/permissions', permission);
    return response.data;
  },

  async update(id: number, permission: UpdatePermissionDto): Promise<Permission> {
    const response = await apiClient.patch<Permission>(`/permissions/${id}`, permission);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/permissions/${id}`);
  },
};
