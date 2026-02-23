import apiClient from '../api';
import { Production, PaginatedResponse } from '@/types';

export interface CreateProductionDto {
  date: string;
  storeId: number;
  weatherId?: number;
  porridgeAmount?: number;
  supplies?: Array<{
    supplyId: number;
    quantity: number;
  }>;
}

export interface UpdateProductionDto {
  date?: string;
  storeId?: number;
  weatherId?: number;
  porridgeAmount?: number;
  supplies?: Array<{
    supplyId: number;
    quantity: number;
  }>;
}

export interface ProductionsGetAllParams {
  storeId?: number;
  date?: string;
  page?: number;
  limit?: number;
}

export const productionsService = {
  async getAll(
    params?: ProductionsGetAllParams
  ): Promise<PaginatedResponse<Production>> {
    const queryParams: Record<string, string | number | undefined> = {
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
    };
    if (params?.storeId) queryParams.storeId = params.storeId;
    if (params?.date) queryParams.date = params.date;
    const response = await apiClient.get<PaginatedResponse<Production>>(
      '/productions',
      { params: queryParams }
    );
    return response.data;
  },

  async getById(id: number): Promise<Production> {
    const response = await apiClient.get<Production>(`/productions/${id}`);
    return response.data;
  },

  async create(production: CreateProductionDto): Promise<Production> {
    const response = await apiClient.post<Production>('/productions', production);
    return response.data;
  },

  async update(
    id: number,
    production: UpdateProductionDto
  ): Promise<Production> {
    const response = await apiClient.patch<Production>(
      `/productions/${id}`,
      production
    );
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/productions/${id}`);
  },
};
