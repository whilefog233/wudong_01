export type CartItem = {
  productId: number;
  skuId: number;
  title: string;
  subtitle: string | null;
  categoryName: string;
  coverImage: string;
  skuName: string;
  skuSpecs: string;
  unitPrice: number;
  quantity: number;
  stock: number;
};

export type OrderItem = CartItem;

export type OrderRecord = {
  id: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'finished';
  items: OrderItem[];
  totalQuantity: number;
  totalAmount: number;
};

export type AddressRecord = {
  id: string;
  receiver: string;
  phone: string;
  region: string;
  detail: string;
  isDefault: boolean;
};

export type ProfileRecord = {
  nickname: string;
  city: string;
  bio: string;
};

const CART_KEY = 'wudong-pc-cart';
const ORDER_KEY = 'wudong-pc-orders';
const ADDRESS_KEY = 'wudong-pc-addresses';
const PROFILE_KEY = 'wudong-pc-profile';

const DEFAULT_ADDRESSES: AddressRecord[] = [
  {
    id: 'addr-1',
    receiver: '阿苗',
    phone: '13800000000',
    region: '贵州省 黔东南州 雷山县',
    detail: '乌东村鼓楼旁 18 号',
    isDefault: true,
  },
  {
    id: 'addr-2',
    receiver: '小银',
    phone: '13900000000',
    region: '贵州省 贵阳市 观山湖区',
    detail: '会展城非遗生活馆 2 栋 301',
    isDefault: false,
  },
];

const DEFAULT_PROFILE: ProfileRecord = {
  nickname: '乌东访客',
  city: '贵阳',
  bio: '偏爱银饰、蜡染与带着手作温度的生活器物。',
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (!value) {
      return fallback;
    }
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readCart() {
  return readJson<CartItem[]>(CART_KEY, []);
}

export function writeCart(items: CartItem[]) {
  writeJson(CART_KEY, items);
}

export function upsertCartItem(nextItem: CartItem) {
  const cart = readCart();
  const existing = cart.find(item => item.skuId === nextItem.skuId);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + nextItem.quantity, existing.stock);
  } else {
    cart.unshift(nextItem);
  }

  writeCart(cart);
  return cart;
}

export function updateCartQuantity(skuId: number, quantity: number) {
  const next = readCart()
    .map(item => (item.skuId === skuId ? { ...item, quantity } : item))
    .filter(item => item.quantity > 0);
  writeCart(next);
  return next;
}

export function removeCartItem(skuId: number) {
  const next = readCart().filter(item => item.skuId !== skuId);
  writeCart(next);
  return next;
}

export function clearCartItems(skuIds: number[]) {
  const next = readCart().filter(item => !skuIds.includes(item.skuId));
  writeCart(next);
  return next;
}

export function readOrders() {
  return readJson<OrderRecord[]>(ORDER_KEY, []);
}

export function prependOrder(order: OrderRecord) {
  const orders = readOrders();
  orders.unshift(order);
  writeJson(ORDER_KEY, orders);
  return orders;
}

export function readAddresses() {
  const addresses = readJson<AddressRecord[]>(ADDRESS_KEY, []);
  if (addresses.length) {
    return addresses;
  }
  writeJson(ADDRESS_KEY, DEFAULT_ADDRESSES);
  return DEFAULT_ADDRESSES;
}

export function readProfile() {
  const profile = readJson<ProfileRecord | null>(PROFILE_KEY, null);
  if (profile) {
    return profile;
  }
  writeJson(PROFILE_KEY, DEFAULT_PROFILE);
  return DEFAULT_PROFILE;
}
