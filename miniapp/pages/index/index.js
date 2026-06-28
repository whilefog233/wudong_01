const { request } = require('../../utils/request');
const {
  getRuntimeConfig,
  setStoredOrigin,
  clearStoredOrigin,
} = require('../../utils/runtime');

Page({
  data: {
    categories: [],
    products: [],
    activeCategoryId: '',
    keyWord: '',
    loading: false,
    message: '',
    debugText: '页面已加载（调试版）',
    debugCategoriesCount: 0,
    debugProductsCount: 0,
    debugError: '',
    debugStep: '1-Page已创建',
    apiOrigin: '',
    apiOriginInput: '',
  },

  onLoad() {
    this.syncApiOrigin();
    this.setData({ debugStep: '2-onLoad已触发' });
    this.loadData();
  },

  onShow() {
    this.syncApiOrigin();
    this.setData({ debugStep: `${this.data.debugStep} -> 3-onShow` });
    if (this._hasLoaded) {
      this.loadProducts();
    }
  },

  syncApiOrigin() {
    const runtimeConfig = getRuntimeConfig();
    const app = getApp();

    app.globalData.baseOrigin = runtimeConfig.baseOrigin;
    app.globalData.baseUrl = runtimeConfig.baseUrl;

    this.setData({
      apiOrigin: runtimeConfig.baseOrigin,
      apiOriginInput: runtimeConfig.baseOrigin,
    });
  },

  async loadData() {
    this.setData({ debugStep: `${this.data.debugStep} -> 4-loadData` });

    try {
      await Promise.all([this.loadCategories(), this.loadProducts()]);
      this.setData({
        debugStep: `${this.data.debugStep} -> 5-完成`,
        debugText: `加载成功：分类 ${this.data.categories.length} 个，商品 ${this.data.products.length} 个`,
        debugError: '',
      });
      this._hasLoaded = true;
    } catch (error) {
      this.setData({
        debugText: '失败',
        debugError: error.message || '加载失败',
      });
    }
  },

  async loadCategories() {
    this.setData({ debugStep: `${this.data.debugStep} -> 6-请求分类` });

    try {
      const list = await request({
        url: '/app/wudong/product-categories/list',
      });

      this.setData({
        categories: list,
        debugCategoriesCount: list.length,
        debugStep: `${this.data.debugStep} -> 7-分类OK(${list.length})`,
      });
      return list;
    } catch (error) {
      this.setData({
        debugError: `分类请求失败：${error.message || '未知错误'}`,
        debugText: '失败',
      });
      throw error;
    }
  },

  async loadProducts() {
    this.setData({
      loading: true,
      message: '',
      debugStep: `${this.data.debugStep} -> 8-请求商品`,
    });

    const query = [
      'page=1',
      'pageSize=20',
      this.data.activeCategoryId
        ? `categoryId=${this.data.activeCategoryId}`
        : '',
      this.data.keyWord
        ? `keyWord=${encodeURIComponent(this.data.keyWord)}`
        : '',
    ]
      .filter(Boolean)
      .join('&');

    try {
      const page = await request({
        url: `/app/wudong/products/page?${query}`,
      });
      const list = page.list || [];
      const catCount = this.data.debugCategoriesCount;

      this.setData({
        products: list,
        loading: false,
        debugProductsCount: list.length,
        debugText: `加载成功：分类 ${catCount} 个，商品 ${list.length} 个`,
        debugStep: `${this.data.debugStep} -> 9-商品OK(${list.length})`,
      });
      return page;
    } catch (error) {
      this.setData({
        loading: false,
        debugError: `商品请求失败：${error.message || '未知错误'}`,
        debugText: '失败',
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

  onSelectCategory(event) {
    this.setData({ activeCategoryId: event.currentTarget.dataset.id || '' });
    this.loadProducts();
  },

  onApiOriginInput(event) {
    this.setData({ apiOriginInput: event.detail.value });
  },

  onSaveApiOrigin() {
    const nextOrigin = setStoredOrigin(this.data.apiOriginInput);
    const app = getApp();

    app.globalData.baseOrigin = nextOrigin;
    app.globalData.baseUrl = `${nextOrigin}/api`;

    this.setData({
      apiOrigin: nextOrigin,
      apiOriginInput: nextOrigin,
      debugError: '',
      debugText: '接口地址已保存，正在重试请求',
    });

    this.loadData();
  },

  onResetApiOrigin() {
    clearStoredOrigin();
    this.syncApiOrigin();
    this.setData({
      debugError: '',
      debugText: '已恢复默认接口地址，正在重试请求',
    });
    this.loadData();
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
});
