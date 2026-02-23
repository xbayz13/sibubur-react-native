import apiClient from '../api';
import { User, PaginatedResponse } from '@/types';

export interface CreateUserDto {
  username: string;
  password: string;
  name: string;
  roleId: number;
}

export interface UpdateUserDto {
  username?: string;
  password?: string;
  name?: string;
  roleId?: number;
}

export interface UsersGetAllParams {
  page?: number;
  limit?: number;
}

export const usersService = {
  async getAll(
    params?: UsersGetAllParams
  ): Promise<PaginatedResponse<User>> {
    const queryParams = { page: params?.page ?? 1, limit: params?.limit ?? 50 };
    const response = await apiClient.get<PaginatedResponse<User>>(
      '/users',
      { params: queryParams }
    );
    return response.data;
  },

  async getById(id: number): Promise<User> {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  async create(user: CreateUserDto): Promise<User> {
    const response = await apiClient.post<User>('/users', user);
    return response.data;
  },

  async update(id: number, user: UpdateUserDto): Promise<User> {
    const response = await apiClient.patch<User>(`/users/${id}`, user);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};
