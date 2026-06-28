const CART_KEY = 'wudong-miniapp-cart';
const ORDER_KEY = 'wudong-miniapp-orders';
const ADDRESS_KEY = 'wudong-miniapp-addresses';
const PROFILE_KEY = 'wudong-miniapp-profile';

const DEFAULT_ADDRESSES = [
  {
    id: 'addr-1',
    receiver: '阿苗',
    phone: '13800000000',
    region: '贵州省黔东南州雷山县',
    detail: '乌东村鼓楼旁 18 号',
    isDefault: true,
  },
];

const DEFAULT_PROFILE = {
  nickname: '乌东访客',
  city: '贵阳',
  bio: '偏爱银饰、蜡染与刺绣，把喜欢的手作慢慢收进生活里。',
};

function read(key, fallback) {
  try {
    const value = wx.getStorageSync(key);
    return value || fallback;
  } catch (error) {
    return fallback;
  }
}

function write(key, value) {
  wx.setStorageSync(key, value);
}

function getCart() {
  return read(CART_KEY, []);
}

function setCart(items) {
  write(CART_KEY, items);
  return items;
}

function upsertCartItem(nextItem) {
  const cart = getCart();
  const existing = cart.find(item => item.skuId === nextItem.skuId);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + nextItem.quantity, existing.stock);
  } else {
    cart.unshift(nextItem);
  }

  return setCart(cart);
}

function updateCartQuantity(skuId, quantity) {
  const next = getCart()
    .map(item => (item.skuId === skuId ? { ...item, quantity } : item))
    .filter(item => item.quantity > 0);
  return setCart(next);
}

function removeCartItem(skuId) {
  return setCart(getCart().filter(item => item.skuId !== skuId));
}

function clearCartItems(skuIds) {
  return setCart(getCart().filter(item => !skuIds.includes(item.skuId)));
}

function getOrders() {
  return read(ORDER_KEY, []);
}

function prependOrder(order) {
  const orders = getOrders();
  orders.unshift(order);
  write(ORDER_KEY, orders);
  return orders;
}

function getAddresses() {
  const addresses = read(ADDRESS_KEY, []);
  if (addresses.length) {
    return addresses;
  }
  write(ADDRESS_KEY, DEFAULT_ADDRESSES);
  return DEFAULT_ADDRESSES;
}

function getProfile() {
  const profile = read(PROFILE_KEY, null);
  if (profile) {
    return profile;
  }
  write(PROFILE_KEY, DEFAULT_PROFILE);
  return DEFAULT_PROFILE;
}

module.exports = {
  getAddresses,
  getCart,
  getOrders,
  getProfile,
  clearCartItems,
  prependOrder,
  removeCartItem,
  updateCartQuantity,
  upsertCartItem,
};
