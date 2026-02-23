import apiClient from '../api';
import { Transaction, PaginatedResponse } from '@/types';

export interface CreateTransactionDto {
  orderId: number;
  paymentMethodId: number;
  amount: number;
  storeId: number;
}

export interface TransactionsGetAllParams {
  storeId?: number;
  date?: string;
  page?: number;
  limit?: number;
}

export const transactionsService = {
  async getAll(
    params?: TransactionsGetAllParams
  ): Promise<PaginatedResponse<Transaction>> {
    const queryParams: Record<string, string | number | undefined> = {
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
    };
    if (params?.storeId) queryParams.storeId = params.storeId;
    if (params?.date) queryParams.date = params.date;
    const response = await apiClient.get<PaginatedResponse<Transaction>>(
      '/transactions',
      { params: queryParams }
    );
    return response.data;
  },

  async getById(id: number): Promise<Transaction> {
    const response = await apiClient.get<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  async create(transaction: CreateTransactionDto): Promise<Transaction> {
    const response = await apiClient.post<Transaction>(
      '/transactions',
      transaction
    );
    return response.data;
  },
};
