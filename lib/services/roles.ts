import apiClient from '../api';
import { Role, PaginatedResponse } from '@/types';

export interface CreateRoleDto {
  name: string;
}

export interface UpdateRoleDto {
  name?: string;
}

export const rolesService = {
  async getAll(): Promise<Role[]> {
    const response = await apiClient.get<PaginatedResponse<Role>>(
      '/roles',
      { params: { limit: 100 } }
    );
    return response.data.data ?? [];
  },

  async getById(id: number): Promise<Role> {
    const response = await apiClient.get<Role>(`/roles/${id}`);
    return response.data;
  },

  async create(role: CreateRoleDto): Promise<Role> {
    const response = await apiClient.post<Role>('/roles', role);
    return response.data;
  },

  async update(id: number, role: UpdateRoleDto): Promise<Role> {
    const response = await apiClient.patch<Role>(`/roles/${id}`, role);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/roles/${id}`);
  },
};
