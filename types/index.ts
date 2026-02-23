// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface User {
  id: number;
  username: string;
  name: string;
  roleId: number;
  role?: Role;
  storeId?: number | null;
  store?: Store | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Role {
  id: number;
  name: string;
  permissions?: Permission[];
  rolePermissions?: Array<{
    permission: Permission;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permission {
  id: number;
  module: string;
  action: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

// Store Types
export interface Store {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Product Types
export interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  category?: ProductCategory;
  addons?: ProductAddon[];
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
}

export interface ProductAddon {
  id: number;
  name: string;
  price: number;
  description?: string;
}

// Order Types
export interface Order {
  id: number;
  orderNumber: string;
  customerName?: string;
  store: Store;
  orderItems: OrderItem[];
  status: OrderStatus;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  orderItemAddons?: OrderItemAddon[];
}

export interface OrderItemAddon {
  orderItemId: number;
  addonId: number;
  addon: ProductAddon;
  quantity: number;
  addonPrice: number;
}

export type OrderStatus = 'open' | 'canceled' | 'paid';

export interface CreateOrderDto {
  storeId: number;
  customerName?: string;
  items: Array<{
    productId: number;
    quantity: number;
    addons?: Array<{
      addonId: number;
      price: number;
      quantity: number;
    }>;
  }>;
}

export interface UpdateOrderDto {
  customerName?: string;
  status?: OrderStatus;
  items?: Array<{
    productId: number;
    quantity: number;
    addons?: Array<{
      addonId: number;
      price: number;
      quantity: number;
    }>;
  }>;
}

// Transaction Types
export interface Transaction {
  id: number;
  transactionNumber: string;
  order: Order;
  paymentMethod: PaymentMethod;
  amount: number;
  change?: number;
  status: 'paid' | 'canceled';
  store?: Store;
  createdAt: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  type: 'cash' | 'card' | 'digital';
}

// Employee Types
export interface Employee {
  id: number;
  name: string;
  storeId?: number;
  store?: Store;
  status: 'active' | 'inactive';
  dailySalary?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendance {
  id: number;
  employee: Employee;
  employeeId: number;
  date: string;
  status: 'present' | 'absent';
}

// Supply Types
export interface Supply {
  id: number;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Production Types
export interface Production {
  id: number;
  store: Store;
  date: string;
  porridgeAmount?: number;
  weather?: Weather;
  author?: {
    id: number;
    username: string;
  };
  productionSupplies?: Array<{
    id: number;
    supply: Supply;
    quantity: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Weather {
  id: number;
  date: string;
  locationName?: string;
  locationCode?: string;
  weatherJson?: {
    condition?: WeatherCondition;
    temperature?: number;
    description?: string;
    [key: string]: unknown;
  };
  condition?: WeatherCondition;
  temperature?: number;
  description?: string;
}

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'stormy';

// Expense Types
export interface Expense {
  id: number;
  expenseCategoryId: number;
  category: ExpenseCategory;
  storeId: number;
  store?: Store;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
}

// Report Types
export interface DailyReport {
  date: string;
  revenue: {
    total: number;
    transactions: number;
    transactionsDetail?: Transaction[];
  };
  orders: {
    total: number;
    items: number;
    ordersDetail?: unknown[];
  };
  expenses: {
    total: number;
    expensesDetail?: Expense[];
  };
  production?: Production | null;
  weather?: Weather | null;
  attendance: {
    present: number;
    absent: number;
    total: number;
    attendancesDetail?: unknown[];
  };
  netProfit: number;
  recommendations?: unknown;
}

export interface MonthlyReport {
  year: number;
  month: number;
  revenue: {
    total: number;
    transactions: number;
  };
  expenses: {
    total: number;
    count: number;
  };
  orders: {
    total: number;
  };
  productions: {
    total: number;
  };
  netProfit: number;
  averageDailyRevenue?: number;
  averageDailyExpenses?: number;
  daysWithData?: number;
}

export interface YearlyReport {
  year: number;
  revenue: {
    total: number;
    transactions: number;
  };
  expenses: {
    total: number;
    count: number;
  };
  orders: {
    total: number;
  };
  netProfit: number;
  averageMonthlyRevenue?: number;
  averageMonthlyExpenses?: number;
  monthsWithData?: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
