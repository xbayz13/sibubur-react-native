import apiClient from '../api';
import { ProductCategory, PaginatedResponse } from '@/types';

export const productCategoriesService = {
  async getAll(): Promise<ProductCategory[]> {
    const response = await apiClient.get<PaginatedResponse<ProductCategory>>(
      '/product-categories',
      { params: { limit: 100 } }
    );
    return response.data.data ?? [];
  },
};
