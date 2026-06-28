const { request } = require('../../utils/request');
const { getRuntimeConfig } = require('../../utils/runtime');
const { getCart, getOrders } = require('../../utils/local-state');

Page({
  data: {
    categories: [],
    products: [],
    activeCategoryId: '',
    keyWord: '',
    loading: false,
    message: '',
    apiOrigin: '',
    cartCount: 0,
    orderCount: 0,
  },

  onLoad() {
    this.syncRuntime();
    this.loadData();
  },

  onShow() {
    this.syncRuntime();
    this.syncQuickStats();
  },

  syncRuntime() {
    const runtimeConfig = getRuntimeConfig();
    this.setData({
      apiOrigin: runtimeConfig.baseOrigin,
    });
    this.syncQuickStats();
  },

  syncQuickStats() {
    const cartCount = getCart().reduce((sum, item) => sum + item.quantity, 0);
    const orderCount = getOrders().length;
    this.setData({ cartCount, orderCount });
  },

  async loadData() {
    try {
      await Promise.all([this.loadCategories(), this.loadProducts()]);
    } catch (error) {
      this.setData({
        message: error.message || '加载失败，请稍后重试',
      });
    }
  },

  async loadCategories() {
    const list = await request({
      url: '/app/wudong/product-categories/list',
    });
    this.setData({ categories: list });
    return list;
  },

  async loadProducts() {
    this.setData({ loading: true, message: '' });

    const query = [
      'page=1',
      'pageSize=12',
      this.data.activeCategoryId ? `categoryId=${this.data.activeCategoryId}` : '',
      this.data.keyWord ? `keyWord=${encodeURIComponent(this.data.keyWord)}` : '',
    ]
      .filter(Boolean)
      .join('&');

    try {
      const page = await request({
        url: `/app/wudong/products/page?${query}`,
      });
      this.setData({
        products: page.list || [],
        loading: false,
      });
      return page;
    } catch (error) {
      this.setData({
        loading: false,
        message: error.message || '商品加载失败',
      });
      throw error;
    }
  },

  onKeywordInput(event) {
    this.setData({ keyWord: event.detail.value });
  },

  onSearch() {
    this.loadProducts();
  },

  onHotSearch(event) {
    this.setData({ keyWord: event.currentTarget.dataset.keyword });
    this.loadProducts();
  },

  onSelectCategory(event) {
    this.setData({ activeCategoryId: event.currentTarget.dataset.id || '' });
    this.loadProducts();
  },

  goDetail(event) {
    wx.navigateTo({
      url: `/pages/detail/index?id=${event.currentTarget.dataset.id}`,
    });
  },

  goFavorites() {
    wx.navigateTo({
      url: '/pages/favorites/index',
    });
  },

  goCart() {
    wx.navigateTo({
      url: '/pages/cart/index',
    });
  },

  goProfile() {
    wx.navigateTo({
      url: '/pages/profile/index',
    });
  },
});
