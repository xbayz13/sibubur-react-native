import apiClient from '../api';
import { Store, PaginatedResponse } from '@/types';

export interface StoresGetAllParams {
  page?: number;
  limit?: number;
}

export const storesService = {
  async getAll(
    params?: StoresGetAllParams
  ): Promise<PaginatedResponse<Store>> {
    const queryParams = { page: params?.page ?? 1, limit: params?.limit ?? 50 };
    const response = await apiClient.get<PaginatedResponse<Store>>(
      '/stores',
      { params: queryParams }
    );
    return response.data;
  },

  async getById(id: number): Promise<Store> {
    const response = await apiClient.get<Store>(`/stores/${id}`);
    return response.data;
  },

  async create(store: { name: string }): Promise<Store> {
    const response = await apiClient.post<Store>('/stores', store);
    return response.data;
  },

  async update(id: number, store: { name?: string }): Promise<Store> {
    const response = await apiClient.patch<Store>(`/stores/${id}`, store);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/stores/${id}`);
  },
};
