import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { reportsService } from '@/lib/services/reports';
import { suppliesService } from '@/lib/services/supplies';
import { bmkgService } from '@/lib/services/bmkg';
import { getLocalDateString } from '@/lib/date-utils';

interface DailyStats {
  revenue: number;
  orders: number;
  productions: number;
  lowStock: number;
}

interface ChartData {
  date: string;
  revenue: number;
  orders: number;
}

async function fetchDashboardData(): Promise<{
  stats: DailyStats;
  chartData: ChartData[];
}> {
  const today = getLocalDateString();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(getLocalDateString(date));
  }

  const [todayReport, lowStockSupplies, ...chartReports] = await Promise.all([
    reportsService.getDailyReport(today).catch(() => null),
    suppliesService.getLowStock().catch(() => []),
    ...dates.map((date) => reportsService.getDailyReport(date).catch(() => null)),
  ]);

  if (todayReport === null) {
    throw new Error('Gagal memuat data dashboard');
  }

  const chartDataArray: ChartData[] = dates.map((date, index) => {
    const report = chartReports[index];
    return {
      date,
      revenue: Number(report?.revenue?.total ?? 0),
      orders: Number(report?.orders?.total ?? 0),
    };
  });

  const lowStockData = Array.isArray(lowStockSupplies)
    ? lowStockSupplies
    : (lowStockSupplies as { data?: unknown[] })?.data ?? [];

  return {
    stats: {
      revenue: Number(todayReport?.revenue?.total ?? 0),
      orders: Number(todayReport?.orders?.total ?? 0),
      productions: todayReport?.production ? 1 : 0,
      lowStock: lowStockData.length,
    },
    chartData: chartDataArray,
  };
}

const chartConfig = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 8 },
};

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60 * 1000,
  });

  const { data: weatherData, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather-bmkg'],
    queryFn: () => bmkgService.getCurrentWeather(),
    staleTime: 30 * 60 * 1000, // 30 menit
    retry: 1,
  });

  const onRefresh = useCallback(() => refetch(), [refetch]);

  useEffect(() => {
    if (isError) {
      showToast(
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Gagal memuat data dashboard',
        'error'
      );
    }
  }, [isError, error, showToast]);

  const chartWidth = Dimensions.get('window').width - 64;

  const stats = data?.stats ?? { revenue: 0, orders: 0, productions: 0, lowStock: 0 };
  const chartData = data?.chartData ?? [];

  const revenueChartData = {
    labels: chartData.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    }),
    datasets: [{ data: chartData.map((d) => d.revenue) }],
  };

  const ordersChartData = {
    labels: chartData.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    }),
    datasets: [{ data: chartData.map((d) => d.orders) }],
  };

  if (isLoading && !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Memuat dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            Selamat datang, {user?.name ?? user?.username ?? 'User'}
          </Text>
        </View>
        <Button title="Keluar" variant="outline" size="sm" onPress={logout} />
      </View>

      {/* Cuaca BMKG */}
      <Card style={styles.weatherCard}>
        <Text style={styles.weatherTitle}>Prakiraan Cuaca (BMKG)</Text>
        {weatherLoading ? (
          <Text style={styles.weatherLoading}>Memuat data cuaca...</Text>
        ) : weatherData ? (
          <View style={styles.weatherContent}>
            <View style={styles.weatherMain}>
              <Text style={styles.weatherTemp}>{weatherData.temperature}°C</Text>
              <Text style={styles.weatherCondition}>{weatherData.condition}</Text>
            </View>
            <View style={styles.weatherDetails}>
              <Text style={styles.weatherDetail}>Kelembaban: {weatherData.humidity}%</Text>
              <Text style={styles.weatherDetail}>Angin: {weatherData.windSpeed} m/s {weatherData.windDirection}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.weatherLoading}>Data cuaca tidak tersedia</Text>
        )}
      </Card>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <Card style={StyleSheet.flatten([styles.statCard, styles.statSuccess])}>
          <Text style={styles.statLabel}>Total Penjualan Hari Ini</Text>
          <Text style={styles.statValue}>
            Rp {stats.revenue.toLocaleString('id-ID')}
          </Text>
        </Card>
        <Card style={StyleSheet.flatten([styles.statCard, styles.statPrimary])}>
          <Text style={styles.statLabel}>Pesanan Hari Ini</Text>
          <Text style={styles.statValue}>{stats.orders}</Text>
        </Card>
        <Card style={StyleSheet.flatten([styles.statCard, styles.statDefault])}>
          <Text style={styles.statLabel}>Produksi Hari Ini</Text>
          <Text style={styles.statValue}>{stats.productions}</Text>
        </Card>
        <Card
          style={StyleSheet.flatten([
            styles.statCard,
            stats.lowStock > 0 ? styles.statDanger : styles.statDefault,
          ])}
        >
          <Text style={styles.statLabel}>Persediaan Rendah</Text>
          <Text style={styles.statValue}>{stats.lowStock}</Text>
        </Card>
      </View>

      {/* Charts */}
      {chartData.length > 0 && (
        <>
          <Card title="Pendapatan 7 Hari Terakhir">
            <BarChart
              data={revenueChartData}
              width={chartWidth}
              height={200}
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              withInnerLines={false}
              showBarTops={false}
              yAxisLabel="Rp"
              yAxisSuffix=""
            />
            <Text style={styles.chartTotal}>
              Total: Rp{' '}
              {chartData.reduce((s, d) => s + d.revenue, 0).toLocaleString('id-ID')}
            </Text>
          </Card>

          <Card title="Pesanan 7 Hari Terakhir">
            <BarChart
              data={ordersChartData}
              width={chartWidth}
              height={200}
              chartConfig={{ ...chartConfig, color: () => 'rgba(99, 102, 241, 1)' }}
              style={styles.chart}
              fromZero
              withInnerLines={false}
              showBarTops={false}
              yAxisLabel=""
              yAxisSuffix=""
            />
            <Text style={styles.chartTotal}>
              Total: {chartData.reduce((s, d) => s + d.orders, 0)} pesanan
            </Text>
          </Card>
        </>
      )}

      {/* Summary */}
      <Card title="Ringkasan Hari Ini">
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Rata-rata per Pesanan</Text>
          <Text style={styles.summaryValue}>
            {stats.orders > 0
              ? `Rp ${Math.round(stats.revenue / stats.orders).toLocaleString('id-ID')}`
              : 'Rp 0'}
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
  },
  statSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  statPrimary: {
    backgroundColor: '#eef2ff',
    borderColor: '#4f46e5',
  },
  statDefault: {
    backgroundColor: '#f9fafb',
  },
  statDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  weatherCard: {
    backgroundColor: '#eef2ff',
    borderColor: '#818cf8',
    marginBottom: 20,
  },
  weatherTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f46e5',
    marginBottom: 8,
  },
  weatherLoading: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 8,
  },
  weatherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherMain: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  weatherCondition: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  weatherDetails: {
    flex: 1,
  },
  weatherDetail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  chartTotal: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
});
