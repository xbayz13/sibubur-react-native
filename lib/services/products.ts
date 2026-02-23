import apiClient from '../api';
import {
  Product,
  ProductCategory,
  ProductAddon,
  PaginatedResponse,
} from '@/types';

function transformProduct(product: unknown): Product {
  const p = product as Record<string, unknown> & {
    productAddons?: Array<{
      addon?: { id: number; name: string; price: number; description?: string };
      addonPriceOverride?: number;
    }>;
  };
  const addons = (p?.productAddons ?? []).map((pap) => ({
    id: pap.addon?.id ?? 0,
    name: pap.addon?.name ?? '',
    price: Number(pap.addonPriceOverride ?? pap.addon?.price ?? 0),
    description: pap.addon?.description,
  }));
  return {
    ...p,
    addons,
  } as Product;
}

export interface ProductsGetAllParams {
  page?: number;
  limit?: number;
}

export const productsService = {
  async getAll(
    params?: ProductsGetAllParams
  ): Promise<PaginatedResponse<Product>> {
    const queryParams = { page: params?.page ?? 1, limit: params?.limit ?? 50 };
    const response = await apiClient.get<PaginatedResponse< unknown>>(
      '/products',
      { params: queryParams }
    );
    const rawData = (response.data.data ?? []) as Record<string, unknown>[];
    return {
      data: rawData.map((p) => transformProduct(p)),
      total: response.data.total,
      page: response.data.page,
      limit: response.data.limit,
      totalPages: response.data.totalPages,
    };
  },

  async getById(id: number): Promise<Product> {
    const response = await apiClient.get<Record<string, unknown>>(
      `/products/${id}`
    );
    return transformProduct(response.data);
  },

  async create(product: {
    name: string;
    description?: string;
    price: number;
    productCategoryId?: number;
  }): Promise<Product> {
    const response = await apiClient.post<Record<string, unknown>>(
      '/products',
      product
    );
    return transformProduct(response.data);
  },

  async update(
    id: number,
    product: {
      name?: string;
      description?: string;
      price?: number;
      productCategoryId?: number;
    }
  ): Promise<Product> {
    const response = await apiClient.patch<Record<string, unknown>>(
      `/products/${id}`,
      product
    );
    return transformProduct(response.data);
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}`);
  },

  async addAddon(
    productId: number,
    addonId: number,
    addonPriceOverride?: number
  ): Promise<Product> {
    const response = await apiClient.post<Record<string, unknown>>(
      `/products/${productId}/addons`,
      { addonId, addonPriceOverride }
    );
    return transformProduct(response.data);
  },

  async removeAddon(productId: number, addonId: number): Promise<Product> {
    const response = await apiClient.delete<Record<string, unknown>>(
      `/products/${productId}/addons/${addonId}`
    );
    return transformProduct(response.data as Record<string, unknown>);
  },
};
