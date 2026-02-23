import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sibubur_print_settings';

export interface PrintSettings {
  autoPrintKitchen: boolean;
  autoPrintCustomer: boolean;
}

const DEFAULT_SETTINGS: PrintSettings = {
  autoPrintKitchen: true,
  autoPrintCustomer: true,
};

export async function getPrintSettings(): Promise<PrintSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        autoPrintKitchen: parsed.autoPrintKitchen ?? DEFAULT_SETTINGS.autoPrintKitchen,
        autoPrintCustomer: parsed.autoPrintCustomer ?? DEFAULT_SETTINGS.autoPrintCustomer,
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

let _cachedSettings: PrintSettings = DEFAULT_SETTINGS;

export function getPrintSettingsSync(): PrintSettings {
  return _cachedSettings;
}

export async function savePrintSettings(settings: Partial<PrintSettings>): Promise<void> {
  try {
    const current = await getPrintSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    _cachedSettings = updated;
  } catch {
    // ignore
  }
}

export async function loadPrintSettingsCache(): Promise<void> {
  _cachedSettings = await getPrintSettings();
}

export function isAutoPrintKitchenEnabled(): boolean {
  return getPrintSettingsSync().autoPrintKitchen;
}

export function isAutoPrintCustomerEnabled(): boolean {
  return getPrintSettingsSync().autoPrintCustomer;
}

export function shouldShowKitchenPrintButton(): boolean {
  return getPrintSettingsSync().autoPrintKitchen;
}

export function shouldShowCustomerPrintButton(): boolean {
  return getPrintSettingsSync().autoPrintCustomer;
}
