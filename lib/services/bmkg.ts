import apiClient from '../api';

// Kode wilayah untuk Nologaten, Ponorogo, Jawa Timur
const BMKG_ADM4_CODE = '35.02.17.1015';

export interface BMKGWeatherForecast {
  location: {
    province: string;
    city: string;
    district: string;
    village: string;
    code: string;
    coordinates: { longitude: number; latitude: number };
    timezone: string;
  };
  current: {
    temperature: number;
    condition: string;
    conditionEn: string;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    visibility: string;
    precipitation: number;
    cloudCover: number;
    datetime: string;
    image: string;
  } | null;
  forecasts: {
    today: Array<{
      temperature: number;
      condition: string;
      humidity: number;
      windSpeed: number;
      precipitation: number;
      datetime: string;
      timeIndex: string;
    }>;
    tomorrow: Array<unknown>;
    dayAfter: Array<unknown>;
  };
}

export const bmkgService = {
  async getForecast(adm4Code: string = BMKG_ADM4_CODE, transform = true): Promise<BMKGWeatherForecast> {
    const { data } = await apiClient.get<BMKGWeatherForecast>(
      `/weather/bmkg/forecast?adm4=${adm4Code}&transform=${transform}`
    );
    return data;
  },

  async getCurrentWeather(): Promise<BMKGWeatherForecast['current']> {
    const forecast = await this.getForecast();
    return forecast.current;
  },
};
