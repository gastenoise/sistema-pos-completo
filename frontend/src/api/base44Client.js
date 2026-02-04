import { clearToken, fetchMe, getToken, updateMe } from './auth';

const isNode = typeof window === 'undefined';
const windowObj = isNode ? { localStorage: new Map() } : window;
const storage = windowObj.localStorage;

const createId = (prefix) => {
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${randomPart}`;
};

const ensureArray = (value) => Array.isArray(value) ? value : [];

const saveToStorage = (key, value) => {
  if (storage instanceof Map) {
    storage.set(key, JSON.stringify(value));
  } else {
    storage.setItem(key, JSON.stringify(value));
  }
};

const loadFromStorage = (key) => {
  const raw = storage instanceof Map ? storage.get(key) : storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const seedData = {
  Business: [
    {
      id: 'biz_demo',
      name: 'Demo POS',
      owner_email: 'demo@pos.local',
      is_active: true,
      currency: 'ARS',
      address: 'Av. Siempre Viva 123'
    }
  ],
  Category: [
    { id: 'cat_food', business_id: 'biz_demo', name: 'Comidas', is_active: true },
    { id: 'cat_drinks', business_id: 'biz_demo', name: 'Bebidas', is_active: true },
    { id: 'cat_merch', business_id: 'biz_demo', name: 'Merch', is_active: true }
  ],
  Item: [
    {
      id: 'item_empanada',
      business_id: 'biz_demo',
      name: 'Empanada de carne',
      sku: 'EMP-001',
      price: 1200,
      category_id: 'cat_food',
      is_active: true,
      stock: 42
    },
    {
      id: 'item_cafe',
      business_id: 'biz_demo',
      name: 'Café doble',
      sku: 'CAF-002',
      price: 1500,
      category_id: 'cat_drinks',
      is_active: true,
      stock: 80
    },
    {
      id: 'item_rem',
      business_id: 'biz_demo',
      name: 'Remera POS',
      sku: 'MER-010',
      price: 9000,
      category_id: 'cat_merch',
      is_active: true,
      stock: 12
    }
  ],
  PaymentMethod: [
    { id: 'pm_cash', business_id: 'biz_demo', name: 'Efectivo', type: 'cash', is_active: true, is_default: true },
    { id: 'pm_debit', business_id: 'biz_demo', name: 'Débito', type: 'debit', is_active: true },
    { id: 'pm_mp', business_id: 'biz_demo', name: 'Mercado Pago', type: 'mercado_pago', is_active: true }
  ],
  BankAccount: [
    {
      id: 'bank_demo',
      business_id: 'biz_demo',
      bank_name: 'Banco Demo',
      account_number: '123-456-789',
      cbu: '0000000000000000000000',
      holder_name: 'Demo POS'
    }
  ],
  CashRegisterSession: [],
  Sale: [],
  SalePayment: [],
  SmtpConfig: []
};

const userStorageKey = 'pos_auth_user';

const getStoredUser = () => {
  const stored = loadFromStorage(userStorageKey);
  if (stored) return stored;
  const defaultUser = {
    id: 'user_demo',
    full_name: 'Usuario Demo',
    email: 'demo@pos.local',
    phone: ''
  };
  saveToStorage(userStorageKey, defaultUser);
  return defaultUser;
};

const setStoredUser = (user) => {
  saveToStorage(userStorageKey, user);
  return user;
};

const clearStoredUser = () => {
  if (storage instanceof Map) {
    storage.delete(userStorageKey);
  } else {
    storage.removeItem(userStorageKey);
  }
};

const getEntityKey = (entityName) => `pos_entity_${entityName}`;

const loadEntity = (entityName) => {
  const key = getEntityKey(entityName);
  const stored = loadFromStorage(key);
  if (stored) return ensureArray(stored);
  const seeded = seedData[entityName] ? [...seedData[entityName]] : [];
  saveToStorage(key, seeded);
  return seeded;
};

const saveEntity = (entityName, data) => {
  saveToStorage(getEntityKey(entityName), data);
};

const matchesFilter = (item, filter) => {
  if (!filter) return true;
  return Object.entries(filter).every(([key, value]) => {
    if (value === undefined) return true;
    if (Array.isArray(value)) return value.includes(item[key]);
    if (value === null) return item[key] === null || item[key] === undefined;
    return item[key] === value;
  });
};

const createEntityApi = (entityName) => ({
  filter: async (filter = {}) => {
    const data = loadEntity(entityName);
    return data.filter((item) => matchesFilter(item, filter));
  },
  create: async (payload) => {
    const data = loadEntity(entityName);
    const newItem = {
      id: payload?.id ?? createId(entityName.toLowerCase()),
      created_at: new Date().toISOString(),
      ...payload
    };
    data.push(newItem);
    saveEntity(entityName, data);
    return newItem;
  },
  update: async (id, updates) => {
    const data = loadEntity(entityName);
    const index = data.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`${entityName} not found`);
    }
    data[index] = {
      ...data[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveEntity(entityName, data);
    return data[index];
  },
  delete: async (id) => {
    const data = loadEntity(entityName);
    const nextData = data.filter((item) => item.id !== id);
    saveEntity(entityName, nextData);
    return { id };
  },
  bulkCreate: async (items) => {
    const data = loadEntity(entityName);
    const createdItems = (items || []).map((item) => ({
      id: item?.id ?? createId(entityName.toLowerCase()),
      created_at: new Date().toISOString(),
      ...item
    }));
    data.push(...createdItems);
    saveEntity(entityName, data);
    return createdItems;
  }
});

export const base44 = {
  auth: {
    isAuthenticated: async () => !!getToken(),
    me: async () => fetchMe(),
    updateMe: async (updates) => updateMe(updates),
    logout: (redirectUrl) => {
      clearToken();
      clearStoredUser();
      if (typeof window !== 'undefined') {
        window.location.href = redirectUrl || '/login';
      }
    },
    redirectToLogin: (redirectUrl) => {
      if (typeof window !== 'undefined') {
        const target = redirectUrl
          ? `/login?redirect=${encodeURIComponent(redirectUrl)}`
          : '/login';
        window.location.href = target;
      }
    }
  },
  entities: {
    Business: createEntityApi('Business'),
    Category: createEntityApi('Category'),
    Item: createEntityApi('Item'),
    PaymentMethod: createEntityApi('PaymentMethod'),
    BankAccount: createEntityApi('BankAccount'),
    CashRegisterSession: createEntityApi('CashRegisterSession'),
    Sale: createEntityApi('Sale'),
    SalePayment: createEntityApi('SalePayment'),
    SmtpConfig: createEntityApi('SmtpConfig')
  },
  appLogs: {
    logUserInApp: async () => ({ ok: true })
  }
};
