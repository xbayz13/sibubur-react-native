import apiClient from '../api';
import { Expense, PaginatedResponse } from '@/types';

export interface CreateExpenseDto {
  expenseCategoryId: number;
  storeId: number;
  totalAmount: number;
}

export interface UpdateExpenseDto {
  expenseCategoryId?: number;
  storeId?: number;
  totalAmount?: number;
}

export interface ExpensesGetAllParams {
  storeId?: number;
  date?: string;
  page?: number;
  limit?: number;
}

export const expensesService = {
  async getAll(
    params?: ExpensesGetAllParams
  ): Promise<PaginatedResponse<Expense>> {
    const queryParams: Record<string, string | number | undefined> = {
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
    };
    if (params?.storeId) queryParams.storeId = params.storeId;
    if (params?.date) queryParams.date = params.date;
    const response = await apiClient.get<PaginatedResponse<Expense>>(
      '/expenses',
      { params: queryParams }
    );
    return response.data;
  },

  async getById(id: number): Promise<Expense> {
    const response = await apiClient.get<Expense>(`/expenses/${id}`);
    return response.data;
  },

  async create(expense: CreateExpenseDto): Promise<Expense> {
    const response = await apiClient.post<Expense>('/expenses', expense);
    return response.data;
  },

  async update(id: number, expense: UpdateExpenseDto): Promise<Expense> {
    const response = await apiClient.patch<Expense>(`/expenses/${id}`, expense);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/expenses/${id}`);
  },
};
