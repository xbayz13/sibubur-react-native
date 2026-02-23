import apiClient from '../api';
import { ExpenseCategory, PaginatedResponse } from '@/types';

export interface CreateExpenseCategoryDto {
  name: string;
  description?: string;
}

export interface UpdateExpenseCategoryDto {
  name?: string;
  description?: string;
}

export interface ExpenseCategoriesGetAllParams {
  page?: number;
  limit?: number;
}

export const expenseCategoriesService = {
  async getAll(
    params?: ExpenseCategoriesGetAllParams
  ): Promise<PaginatedResponse<ExpenseCategory>> {
    const queryParams = { page: params?.page ?? 1, limit: params?.limit ?? 100 };
    const response = await apiClient.get<PaginatedResponse<ExpenseCategory>>(
      '/expense-categories',
      { params: queryParams }
    );
    return response.data;
  },

  async getById(id: number): Promise<ExpenseCategory> {
    const response = await apiClient.get<ExpenseCategory>(
      `/expense-categories/${id}`
    );
    return response.data;
  },

  async create(
    category: CreateExpenseCategoryDto
  ): Promise<ExpenseCategory> {
    const response = await apiClient.post<ExpenseCategory>(
      '/expense-categories',
      category
    );
    return response.data;
  },

  async update(
    id: number,
    category: UpdateExpenseCategoryDto
  ): Promise<ExpenseCategory> {
    const response = await apiClient.patch<ExpenseCategory>(
      `/expense-categories/${id}`,
      category
    );
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/expense-categories/${id}`);
  },
};
