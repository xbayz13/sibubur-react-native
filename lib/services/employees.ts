import apiClient from '../api';
import { Employee, PaginatedResponse } from '@/types';

export interface CreateEmployeeDto {
  name: string;
  storeId?: number;
  status?: 'active' | 'inactive';
  dailySalary?: number;
}

export interface UpdateEmployeeDto {
  name?: string;
  storeId?: number;
  status?: 'active' | 'inactive';
  dailySalary?: number;
}

export interface EmployeesGetAllParams {
  page?: number;
  limit?: number;
}

export const employeesService = {
  async getAll(
    params?: EmployeesGetAllParams
  ): Promise<PaginatedResponse<Employee>> {
    const queryParams = { page: params?.page ?? 1, limit: params?.limit ?? 50 };
    const response = await apiClient.get<PaginatedResponse<Employee>>(
      '/employees',
      { params: queryParams }
    );
    return response.data;
  },

  async getById(id: number): Promise<Employee> {
    const response = await apiClient.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  async create(employee: CreateEmployeeDto): Promise<Employee> {
    const response = await apiClient.post<Employee>('/employees', employee);
    return response.data;
  },

  async update(id: number, employee: UpdateEmployeeDto): Promise<Employee> {
    const response = await apiClient.patch<Employee>(
      `/employees/${id}`,
      employee
    );
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  },
};
