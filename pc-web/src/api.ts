export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
};

export type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: options.token } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await response.json()) as ApiEnvelope<T>;
  if (json.code !== 1000) {
    throw new Error(json.message || 'Request failed');
  }
  return json.data;
}

export type Category = {
  id: number;
  name: string;
  status: number;
  remark: string | null;
};

export type ProductCard = {
  id: number;
  title: string;
  subtitle: string | null;
  categoryId: number;
  categoryName: string;
  coverImage: string;
  minPrice: number;
  maxPrice: number;
  soldOut: boolean;
  isFavorite: boolean;
  status: number;
  statusText: string;
  totalStock?: number;
};

export type ProductSku = {
  id: number;
  name: string;
  code: string | null;
  specs: unknown;
  salePrice: number;
  originalPrice: number;
  stock: number;
  status: number;
};

export type ProductImage = {
  id: number;
  url: string;
  isMain: number;
  sortOrder: number;
};

export type ProductDetail = ProductCard & {
  description: string | null;
  craftIntro: string | null;
  inheritorName: string | null;
  inheritorIntro: string | null;
  images: ProductImage[];
  skus: ProductSku[];
};

export type FavoriteItem = {
  favoriteId: number;
  productId: number;
  title: string;
  subtitle: string | null;
  minPrice: number;
  maxPrice: number;
  coverImage: string;
  soldOut: boolean;
  categoryName: string;
  createTime: string;
};

export type PageData<T> = {
  total: number;
  page: number;
  pageSize: number;
  list: T[];
};

export type LoginResult = {
  token: string;
  refreshToken: string;
  expire: number;
  refreshExpire: number;
};

export function loginWithPassword(phone: string, password: string) {
  return request<LoginResult>('/app/user/login/password', {
    method: 'POST',
    body: { phone, password },
  });
}

export function fetchCategories() {
  return request<Category[]>('/app/wudong/product-categories/list');
}

export function fetchProducts(params: {
  page: number;
  pageSize: number;
  categoryId?: number;
  keyWord?: string;
}, token?: string | null) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    ...(params.categoryId ? { categoryId: String(params.categoryId) } : {}),
    ...(params.keyWord ? { keyWord: params.keyWord } : {}),
  });
  return request<PageData<ProductCard>>(`/app/wudong/products/page?${query.toString()}`, {
    token,
  });
}

export function fetchProductDetail(id: number, token?: string | null) {
  return request<ProductDetail>(`/app/wudong/products/detail?id=${id}`, {
    token,
  });
}

export function fetchFavoritePage(token: string, page = 1, pageSize = 20) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return request<PageData<FavoriteItem>>(`/app/wudong/favorites/page?${query.toString()}`, {
    token,
  });
}

export function addFavorite(token: string, productId: number) {
  return request<null>('/app/wudong/favorites/add', {
    method: 'POST',
    token,
    body: { productId },
  });
}

export function removeFavorite(token: string, productId: number) {
  return request<null>('/app/wudong/favorites/delete', {
    method: 'POST',
    token,
    body: { productId },
  });
}
