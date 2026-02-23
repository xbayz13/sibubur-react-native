import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  employeesService,
  attendancesService,
  storesService,
} from '@/lib/services';
import { getLocalDateString } from '@/lib/date-utils';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { Employee, Attendance, Store } from '@/types';

type AttendanceStatus = 'present' | 'absent' | null;

export default function EmployeesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceMap, setAttendanceMap] = useState<Map<number, AttendanceStatus>>(new Map());

  const { data: storesData } = useQuery({
    queryKey: ['stores'],
    queryFn: () => storesService.getAll({ limit: 100 }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesService.getAll({ limit: 100 }),
  });

  const {
    data: attendancesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['attendances', selectedDate],
    queryFn: () =>
      attendancesService.getAll({
        date: selectedDate,
        limit: 100,
      }),
  });

  const stores: Store[] = storesData?.data ?? [];
  const employees: Employee[] = employeesData?.data ?? [];
  const attendances: Attendance[] = attendancesData?.data ?? [];

  useEffect(() => {
    if (user?.storeId) {
      setSelectedStoreId(user.storeId);
    } else if (stores.length > 0) {
      setSelectedStoreId((prev) => (prev === undefined ? stores[0].id : prev));
    }
  }, [user?.storeId, stores]);

  const filteredEmployees = selectedStoreId
    ? employees.filter((e) => e.store?.id === selectedStoreId)
    : employees;

  const normDate = (d: string) => (d || '').split('T')[0];

  const getEmployeeAttendance = (employeeId: number): Attendance | undefined =>
    attendances.find(
      (a) =>
        a.employeeId === employeeId && normDate(a.date) === selectedDate
    );

  const saveAttendanceMutation = useMutation({
    mutationFn: async (
      data: Array<{ employeeId: number; status: 'present' | 'absent'; existingId?: number }>
    ) => {
      let success = 0;
      let lastError: unknown = null;
      for (const d of data) {
        try {
          if (d.existingId) {
            await attendancesService.update(d.existingId, {
              date: selectedDate,
              employeeId: d.employeeId,
              status: d.status,
            });
          } else {
            await attendancesService.create({
              date: selectedDate,
              employeeId: d.employeeId,
              status: d.status,
            });
          }
          success++;
        } catch (err) {
          lastError = err;
        }
      }
      if (data.length > 0 && success === 0) {
        throw lastError ?? new Error('Gagal menyimpan absensi');
      }
      return success;
    },
    onSuccess: (count) => {
      showToast(`${count} absensi berhasil direkam`, 'success');
      setShowAttendanceForm(false);
      setAttendanceMap(new Map());
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Gagal menyimpan absensi', 'error');
    },
  });

  const handleOpenAttendanceForm = () => {
    const newMap = new Map<number, AttendanceStatus>();
    filteredEmployees.forEach((emp) => {
      const existing = attendances.find(
        (a) =>
          a.employeeId === emp.id && normDate(a.date) === selectedDate
      );
      newMap.set(emp.id, existing ? existing.status : null);
    });
    setAttendanceMap(newMap);
    setShowAttendanceForm(true);
  };

  const handleToggleEmployee = (employeeId: number) => {
    setAttendanceMap((prev) => {
      const next = new Map(prev);
      const current = next.get(employeeId);
      if (current === null || current === undefined) next.set(employeeId, 'present');
      else if (current === 'present') next.set(employeeId, 'absent');
      else next.set(employeeId, null);
      return next;
    });
  };

  const handleSelectAll = (status: 'present' | 'absent') => {
    setAttendanceMap((prev) => {
      const next = new Map(prev);
      filteredEmployees.forEach((e) => next.set(e.id, status));
      return next;
    });
  };

  const handleClearAll = () => {
    setAttendanceMap((prev) => {
      const next = new Map(prev);
      filteredEmployees.forEach((e) => next.set(e.id, null));
      return next;
    });
  };

  const handleSaveAttendance = () => {
    const data: Array<{ employeeId: number; status: 'present' | 'absent'; existingId?: number }> = [];
    attendanceMap.forEach((status, employeeId) => {
      if (status !== null) {
        const existing = attendances.find(
          (a) =>
            a.employeeId === employeeId && normDate(a.date) === selectedDate
        );
        data.push({ employeeId, status, existingId: existing?.id });
      }
    });
    if (data.length === 0) {
      showToast('Pilih setidaknya satu karyawan', 'error');
      return;
    }
    saveAttendanceMutation.mutate(data);
  };

  const selectedCount = Array.from(attendanceMap.values()).filter((s) => s !== null).length;

  const renderEmployeeRow = ({ item }: { item: Employee }) => {
    const att = getEmployeeAttendance(item.id);
    return (
      <View style={styles.employeeRow}>
        <View style={styles.employeeInfo}>
          <Text style={styles.empName}>{item.name}</Text>
          <Text style={styles.empStore}>{item.store?.name ?? '-'}</Text>
        </View>
        <View style={styles.empStatus}>
          {item.status === 'active' ? (
            <View style={styles.badgeActive}>
              <Text style={styles.badgeActiveText}>Aktif</Text>
            </View>
          ) : (
            <View style={styles.badgeInactive}>
              <Text style={styles.badgeInactiveText}>Tidak Aktif</Text>
            </View>
          )}
        </View>
        <View style={styles.empAttendance}>
          {att ? (
            <View
              style={
                att.status === 'present'
                  ? styles.badgePresent
                  : styles.badgeAbsent
              }
            >
              <Text
                style={
                  att.status === 'present'
                    ? styles.badgePresentText
                    : styles.badgeAbsentText
                }
              >
                {att.status === 'present' ? 'Hadir' : 'Tidak Hadir'}
              </Text>
            </View>
          ) : (
            <Text style={styles.attUnknown}>Belum direkam</Text>
          )}
        </View>
      </View>
    );
  };

  const renderAttendanceItem = ({ item }: { item: Employee }) => {
    const status = attendanceMap.get(item.id);
    return (
      <Pressable
        style={[
          styles.attItem,
          status === 'present' && styles.attItemPresent,
          status === 'absent' && styles.attItemAbsent,
        ]}
        onPress={() => handleToggleEmployee(item.id)}
      >
        <View style={styles.attItemContent}>
          <Text style={styles.attItemName}>{item.name}</Text>
          <Text style={styles.attItemStore}>{item.store?.name ?? '-'}</Text>
        </View>
        <Text style={styles.attItemStatus}>
          {status === 'present' ? 'Hadir' : status === 'absent' ? 'Tidak Hadir' : '-'}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Karyawan & Absensi</Text>
      </View>

      <View style={styles.filters}>
        <Input
          label="Tanggal"
          value={selectedDate}
          onChangeText={setSelectedDate}
        />
        <Text style={styles.filterLabel}>Toko</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            style={[styles.chip, selectedStoreId === undefined && styles.chipActive]}
            onPress={() => setSelectedStoreId(undefined)}
          >
            <Text
              style={[
                styles.chipText,
                selectedStoreId === undefined && styles.chipTextActive,
              ]}
            >
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
      </View>

      <View style={styles.headerActions}>
        <Button
          title="Rekam Absensi"
          size="sm"
          onPress={handleOpenAttendanceForm}
        />
      </View>

      <Text style={styles.sectionTitle}>Daftar Karyawan</Text>
      <FlatList
        data={filteredEmployees}
        keyExtractor={(e) => String(e.id)}
        renderItem={renderEmployeeRow}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#4f46e5" style={styles.loader} />
          ) : (
            <Text style={styles.empty}>Tidak ada karyawan</Text>
          )
        }
        ListFooterComponent={
          attendances.length > 0 ? (
            <View style={styles.attSection}>
              <Text style={styles.sectionTitle}>
                Rekaman Absensi - {new Date(selectedDate).toLocaleDateString('id-ID')}
              </Text>
              {attendances.map((a) => (
                <View key={a.id} style={styles.attCard}>
                  <Text style={styles.attCardName}>{a.employee?.name ?? '-'}</Text>
                  <Text style={styles.attCardStore}>{a.employee?.store?.name ?? '-'}</Text>
                  <View
                    style={
                      a.status === 'present'
                        ? styles.badgePresent
                        : styles.badgeAbsent
                    }
                  >
                    <Text
                      style={
                        a.status === 'present'
                          ? styles.badgePresentText
                          : styles.badgeAbsentText
                      }
                    >
                      {a.status === 'present' ? 'Hadir' : 'Tidak Hadir'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
      />

      {showAttendanceForm && (
        <Modal
          visible
          onClose={() => setShowAttendanceForm(false)}
          title={`Rekam Absensi - ${new Date(selectedDate).toLocaleDateString('id-ID')}`}
        >
          <View style={styles.modalActions}>
            <Button
              title="Semua Hadir"
              size="sm"
              variant="secondary"
              onPress={() => handleSelectAll('present')}
              style={styles.modalBtnSm}
            />
            <Button
              title="Semua Absen"
              size="sm"
              variant="danger"
              onPress={() => handleSelectAll('absent')}
              style={styles.modalBtnSm}
            />
            <Button
              title="Hapus"
              size="sm"
              variant="outline"
              onPress={handleClearAll}
              style={styles.modalBtnSm}
            />
          </View>
          <Text style={styles.selectedHint}>Terpilih: {selectedCount}</Text>
          <ScrollView style={styles.attList} nestedScrollEnabled>
            {filteredEmployees.map((emp) => renderAttendanceItem({ item: emp }))}
          </ScrollView>
          <View style={styles.modalActions}>
            <Button
              title="Batal"
              variant="outline"
              onPress={() => setShowAttendanceForm(false)}
              style={styles.modalBtn}
            />
            <Button
              title={`Simpan (${selectedCount})`}
              onPress={handleSaveAttendance}
              loading={saveAttendanceMutation.isPending}
              style={styles.modalBtn}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  back: { fontSize: 16, color: '#4f46e5', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '600', color: '#111827' },
  filters: { padding: 16 },
  filterLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 8 },
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
  headerActions: { paddingHorizontal: 16, paddingBottom: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  list: { padding: 16 },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  employeeInfo: { flex: 2 },
  empName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  empStore: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empStatus: { flex: 1 },
  empAttendance: { flex: 1 },
  badgeActive: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#d1fae5',
    alignSelf: 'flex-start',
  },
  badgeActiveText: { fontSize: 12, color: '#065f46', fontWeight: '500' },
  badgeInactive: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
  },
  badgeInactiveText: { fontSize: 12, color: '#6b7280' },
  badgePresent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#d1fae5',
    alignSelf: 'flex-start',
  },
  badgePresentText: { fontSize: 12, color: '#065f46', fontWeight: '500' },
  badgeAbsent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
    alignSelf: 'flex-start',
  },
  badgeAbsentText: { fontSize: 12, color: '#991b1b', fontWeight: '500' },
  attUnknown: { fontSize: 12, color: '#9ca3af' },
  attSection: { padding: 16 },
  attCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  attCardName: { flex: 2, fontSize: 14, fontWeight: '500', color: '#111827' },
  attCardStore: { flex: 1, fontSize: 12, color: '#6b7280' },
  attItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  attItemPresent: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  attItemAbsent: { backgroundColor: '#fef2f2', borderColor: '#ef4444' },
  attItemContent: { flex: 1 },
  attItemName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  attItemStore: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  attItemStatus: { fontSize: 12, color: '#6b7280' },
  attList: { maxHeight: 280, marginVertical: 12 },
  selectedHint: { fontSize: 12, color: '#6b7280' },
  modalActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  modalBtn: { flex: 1 },
  modalBtnSm: { flex: 1 },
  loader: { marginTop: 24 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 24 },
});
