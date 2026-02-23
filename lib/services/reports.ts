import apiClient from '../api';
import { DailyReport, MonthlyReport, YearlyReport } from '@/types';

export interface ProductionRecommendation {
  recommendedAmount: number;
  baseRecommendation: number;
  weatherMultiplier: number;
  avgSalesForDayOfWeek: string;
  targetDayOfWeek: number;
  targetWeather?: {
    id: number;
    date: string;
    condition: string;
    description?: string;
  };
  recommendations: string[];
  historicalData: {
    productionCount: number;
    orderCount: number;
    lookbackDays: number;
  };
}

export const reportsService = {
  async getDailyReport(
    date: string,
    storeId?: number
  ): Promise<DailyReport & { recommendations?: ProductionRecommendation }> {
    const params = storeId ? { storeId } : {};
    const response = await apiClient.get<
      DailyReport & { recommendations?: ProductionRecommendation }
    >(`/reports/daily/${date}`, { params });
    return response.data;
  },

  async getMonthlyReport(
    year: number,
    month: number,
    storeId?: number
  ): Promise<MonthlyReport> {
    const params = storeId ? { storeId } : {};
    const response = await apiClient.get<MonthlyReport>(
      `/reports/monthly/${year}/${month}`,
      { params }
    );
    return response.data;
  },

  async getYearlyReport(
    year: number,
    storeId?: number
  ): Promise<YearlyReport> {
    const params = storeId ? { storeId } : {};
    const response = await apiClient.get<YearlyReport>(
      `/reports/yearly/${year}`,
      { params }
    );
    return response.data;
  },

  async getProductionRecommendations(
    date: string,
    storeId?: number,
    lookbackDays = 30
  ): Promise<ProductionRecommendation> {
    const params: Record<string, string | number> = { lookbackDays };
    if (storeId) params.storeId = storeId;
    const response = await apiClient.get<ProductionRecommendation>(
      `/reports/recommendations/${date}`,
      { params }
    );
    return response.data;
  },
};
