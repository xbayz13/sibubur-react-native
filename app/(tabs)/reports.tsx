import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { reportsService, storesService } from '@/lib/services';
import { getLocalDateString } from '@/lib/date-utils';
import type { DailyReport, MonthlyReport, YearlyReport } from '@/types';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';

type ReportType = 'daily' | 'monthly' | 'yearly';

export default function ReportsScreen() {
  const { user } = useAuth();

  const [reportType, setReportType] = useState<ReportType>('daily');
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [dailyDate, setDailyDate] = useState(getLocalDateString);
  const [monthlyYear, setMonthlyYear] = useState(new Date().getFullYear());
  const [monthlyMonth, setMonthlyMonth] = useState(new Date().getMonth() + 1);
  const [yearlyYear, setYearlyYear] = useState(new Date().getFullYear());

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesService.getAll({ limit: 100 }),
  });

  const stores = storesData?.data ?? [];

  const { data: dailyReport, isLoading: dailyLoading } = useQuery({
    queryKey: ['report-daily', dailyDate, selectedStoreId],
    queryFn: () => reportsService.getDailyReport(dailyDate, selectedStoreId),
    enabled: reportType === 'daily',
  });

  const { data: monthlyReport, isLoading: monthlyLoading } = useQuery({
    queryKey: ['report-monthly', monthlyYear, monthlyMonth, selectedStoreId],
    queryFn: () =>
      reportsService.getMonthlyReport(monthlyYear, monthlyMonth, selectedStoreId),
    enabled: reportType === 'monthly',
  });

  const { data: yearlyReport, isLoading: yearlyLoading } = useQuery({
    queryKey: ['report-yearly', yearlyYear, selectedStoreId],
    queryFn: () => reportsService.getYearlyReport(yearlyYear, selectedStoreId),
    enabled: reportType === 'yearly',
  });

  useEffect(() => {
    if (user?.storeId) setSelectedStoreId(user.storeId);
  }, [user?.storeId]);

  const isLoading = dailyLoading || monthlyLoading || yearlyLoading;

  const renderDailyReport = () => {
    if (!dailyReport) return null;
    const r = dailyReport;
    return (
      <View style={styles.reportSection}>
        <Text style={styles.reportTitle}>
          Laporan Harian - {new Date(r.date).toLocaleDateString('id-ID')}
        </Text>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Pendapatan</Text>
            <Text style={styles.statValue}>
              Rp {Number(r.revenue?.total ?? 0).toLocaleString('id-ID')}
            </Text>
            <Text style={styles.statSub}>{r.revenue?.transactions ?? 0} transaksi</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Pengeluaran</Text>
            <Text style={styles.statValue}>
              Rp {Number(r.expenses?.total ?? 0).toLocaleString('id-ID')}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Laba Bersih</Text>
            <Text
              style={[
                styles.statValue,
                (r.netProfit ?? 0) < 0 && styles.statValueNegative,
              ]}
            >
              Rp {Number(r.netProfit ?? 0).toLocaleString('id-ID')}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Pesanan</Text>
            <Text style={styles.statValue}>{r.orders?.total ?? 0}</Text>
            <Text style={styles.statSub}>{r.orders?.items ?? 0} item</Text>
          </Card>
        </View>
      </View>
    );
  };

  const renderMonthlyReport = () => {
    if (!monthlyReport) return null;
    const r = monthlyReport;
    const monthName = new Date(r.year, r.month - 1).toLocaleString('id-ID', {
      month: 'long',
    });
    return (
      <View style={styles.reportSection}>
        <Text style={styles.reportTitle}>
          Laporan Bulanan - {monthName} {r.year}
        </Text>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Pendapatan</Text>
            <Text style={styles.statValue}>
              Rp {Number(r.revenue?.total ?? 0).toLocaleString('id-ID')}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Pengeluaran</Text>
            <Text style={styles.statValue}>
              Rp {Number(r.expenses?.total ?? 0).toLocaleString('id-ID')}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Laba Bersih</Text>
            <Text style={styles.statValue}>
              Rp {Number(r.netProfit ?? 0).toLocaleString('id-ID')}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Pesanan</Text>
            <Text style={styles.statValue}>{r.orders?.total ?? 0}</Text>
          </Card>
        </View>
      </View>
    );
  };

  const renderYearlyReport = () => {
    if (!yearlyReport) return null;
    const r = yearlyReport;
    return (
      <View style={styles.reportSection}>
        <Text style={styles.reportTitle}>Laporan Tahunan - {r.year}</Text>
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Pendapatan</Text>
            <Text style={styles.statValue}>
              Rp {Number(r.revenue?.total ?? 0).toLocaleString('id-ID')}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Pengeluaran</Text>
            <Text style={styles.statValue}>
              Rp {Number(r.expenses?.total ?? 0).toLocaleString('id-ID')}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Laba Bersih</Text>
            <Text style={styles.statValue}>
              Rp {Number(r.netProfit ?? 0).toLocaleString('id-ID')}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Pesanan</Text>
            <Text style={styles.statValue}>{r.orders?.total ?? 0}</Text>
          </Card>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Laporan</Text>

      {/* Type tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, reportType === 'daily' && styles.tabActive]}
          onPress={() => setReportType('daily')}
        >
          <Text style={[styles.tabText, reportType === 'daily' && styles.tabTextActive]}>
            Harian
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, reportType === 'monthly' && styles.tabActive]}
          onPress={() => setReportType('monthly')}
        >
          <Text style={[styles.tabText, reportType === 'monthly' && styles.tabTextActive]}>
            Bulanan
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, reportType === 'yearly' && styles.tabActive]}
          onPress={() => setReportType('yearly')}
        >
          <Text style={[styles.tabText, reportType === 'yearly' && styles.tabTextActive]}>
            Tahunan
          </Text>
        </Pressable>
      </View>

      {/* Store filter */}
      <ScrollView horizontal style={styles.storeScroll}>
        <Pressable
          style={[styles.chip, !selectedStoreId && styles.chipActive]}
          onPress={() => setSelectedStoreId(undefined)}
        >
          <Text style={[styles.chipText, !selectedStoreId && styles.chipTextActive]}>
            Semua
          </Text>
        </Pressable>
        {stores.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.chip, selectedStoreId === s.id && styles.chipActive]}
            onPress={() => setSelectedStoreId(s.id)}
          >
            <Text
              style={[
                styles.chipText,
                selectedStoreId === s.id && styles.chipTextActive,
              ]}
            >
              {s.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Date params */}
      {reportType === 'daily' && (
        <Input
          label="Tanggal"
          value={dailyDate}
          onChangeText={setDailyDate}
        />
      )}
      {reportType === 'monthly' && (
        <View style={styles.dateRow}>
          <Input
            label="Tahun"
            value={String(monthlyYear)}
            onChangeText={(v) => setMonthlyYear(parseInt(v, 10) || new Date().getFullYear())}
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
          <Input
            label="Bulan"
            value={String(monthlyMonth)}
            onChangeText={(v) =>
              setMonthlyMonth(Math.min(12, Math.max(1, parseInt(v, 10) || 1)))
            }
            keyboardType="numeric"
            containerStyle={styles.halfInput}
          />
        </View>
      )}
      {reportType === 'yearly' && (
        <Input
          label="Tahun"
          value={String(yearlyYear)}
          onChangeText={(v) => setYearlyYear(parseInt(v, 10) || new Date().getFullYear())}
          keyboardType="numeric"
        />
      )}

      {/* Report content */}
      <ScrollView style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
        ) : reportType === 'daily' ? (
          renderDailyReport()
        ) : reportType === 'monthly' ? (
          renderMonthlyReport()
        ) : (
          renderYearlyReport()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
    padding: 16,
  },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  tabActive: { backgroundColor: '#4f46e5' },
  tabText: { fontSize: 14, textAlign: 'center' },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  storeScroll: { paddingVertical: 12, paddingHorizontal: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  chipActive: { backgroundColor: '#4f46e5' },
  chipText: { fontSize: 14, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  halfInput: { flex: 1 },
  content: { flex: 1, padding: 16 },
  loader: { marginTop: 24 },
  reportSection: {},
  reportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
  },
  statLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  statValueNegative: { color: '#ef4444' },
  statSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});
