import apiClient from '../api';
import { PaymentMethod, PaginatedResponse } from '@/types';

export interface PaymentMethodsGetAllParams {
  page?: number;
  limit?: number;
}

export const paymentMethodsService = {
  async getAll(
    params?: PaymentMethodsGetAllParams
  ): Promise<PaginatedResponse<PaymentMethod>> {
    const queryParams = { page: params?.page ?? 1, limit: params?.limit ?? 50 };
    const response = await apiClient.get<PaginatedResponse<PaymentMethod>>(
      '/payment-methods',
      { params: queryParams }
    );
    return response.data;
  },

  async getById(id: number): Promise<PaymentMethod> {
    const response = await apiClient.get<PaymentMethod>(
      `/payment-methods/${id}`
    );
    return response.data;
  },
};
