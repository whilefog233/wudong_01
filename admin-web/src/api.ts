export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
};

type ApiEnvelope<T> = {
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
    throw new Error(json.message || '请求失败');
  }
  return json.data;
}

export type LoginResult = {
  token: string;
  refreshToken: string;
  expire: number;
  refreshExpire: number;
};

export type Category = {
  id: number;
  name: string;
  sortOrder: number;
  status: number;
  remark: string | null;
};

export type ProductSku = {
  id?: number;
  code?: string | null;
  name: string;
  specs?: unknown;
  salePrice: number;
  originalPrice: number;
  stock: number;
  status: number;
  sortOrder?: number;
};

export type ProductImage = {
  id?: number;
  url: string;
  isMain: number;
  sortOrder?: number;
};

export type Product = {
  id: number;
  title: string;
  subtitle: string | null;
  categoryId: number;
  categoryName: string;
  categoryStatus: number;
  status: number;
  minPrice: number;
  maxPrice: number;
  soldOut: boolean;
  totalStock: number;
  skuCount?: number;
  imageCount?: number;
  coverImage: string;
  sortOrder?: number;
  craftIntro: string | null;
  inheritorName: string | null;
  inheritorIntro: string | null;
  description: string | null;
  skus?: ProductSku[];
  images?: ProductImage[];
};

export type PageData<T> = {
  total: number;
  page: number;
  pageSize: number;
  list: T[];
};

export function loginAdmin(payload: {
  username: string;
  password: string;
}) {
  return request<LoginResult>('/admin/wudong/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export function fetchCategoryPage(token: string, payload: Record<string, unknown>) {
  return request<PageData<Category>>('/admin/wudong/product-categories/page', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function saveCategory(token: string, payload: Record<string, unknown>) {
  return request<{ id: number }>('/admin/wudong/product-categories/save', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateCategoryStatus(token: string, id: number, status: number) {
  return request<null>('/admin/wudong/product-categories/status', {
    method: 'POST',
    token,
    body: { id, status },
  });
}

export function deleteCategory(token: string, ids: number[]) {
  return request<null>('/admin/wudong/product-categories/delete', {
    method: 'POST',
    token,
    body: { ids },
  });
}

export function fetchProductPage(token: string, payload: Record<string, unknown>) {
  return request<PageData<Product>>('/admin/wudong/products/page', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function fetchProductInfo(token: string, id: number) {
  return request<Product>(`/admin/wudong/products/info?id=${id}`, {
    token,
  });
}

export function saveProduct(token: string, payload: Record<string, unknown>) {
  return request<{ id: number }>('/admin/wudong/products/save', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateProductStatus(token: string, id: number, status: number) {
  return request<null>('/admin/wudong/products/status', {
    method: 'POST',
    token,
    body: { id, status },
  });
}

export function deleteProduct(token: string, ids: number[]) {
  return request<null>('/admin/wudong/products/delete', {
    method: 'POST',
    token,
    body: { ids },
  });
}
