const { request } = require('../../utils/request');
const { getToken } = require('../../utils/auth');
const { prependOrder, upsertCartItem } = require('../../utils/local-state');

function resolveSkuSpecs(specs) {
  if (Array.isArray(specs)) {
    const values = specs.map(item => String(item).trim()).filter(Boolean);
    return values.length ? values.join(' / ') : '标准规格';
  }
  if (typeof specs === 'string' && specs.trim()) {
    return specs.trim();
  }
  return '标准规格';
}

Page({
  data: {
    detail: null,
    selectedSkuId: null,
    message: '',
  },

  onLoad(options) {
    this.productId = Number(options.id);
    this.loadDetail();
  },

  onShow() {
    this.loadDetail();
  },

  async loadDetail() {
    try {
      const detail = await request({
        url: `/app/wudong/products/detail?id=${this.productId}`,
        withToken: !!getToken(),
      });
      const selectedSku = (detail.skus || []).find(item => item.status === 1 && Number(item.stock) > 0) || detail.skus[0];
      this.setData({
        detail,
        selectedSkuId: selectedSku ? selectedSku.id : null,
        message: '',
      });
    } catch (error) {
      this.setData({
        detail: null,
        message: error.message || '详情加载失败',
      });
    }
  },

  getSelectedSku() {
    if (!this.data.detail) {
      return null;
    }
    return this.data.detail.skus.find(item => item.id === this.data.selectedSkuId) || null;
  },

  onSelectSku(event) {
    this.setData({
      selectedSkuId: event.currentTarget.dataset.id,
    });
  },

  async onToggleFavorite() {
    const token = getToken();
    if (!token) {
      wx.showToast({
        title: '请先登录后再收藏',
        icon: 'none',
      });
      return;
    }

    if (!this.data.detail) {
      return;
    }

    const path = this.data.detail.isFavorite
      ? '/app/wudong/favorites/delete'
      : '/app/wudong/favorites/add';

    try {
      await request({
        url: path,
        method: 'POST',
        data: { productId: this.productId },
        withToken: true,
      });
      wx.showToast({
        title: this.data.detail.isFavorite ? '已取消收藏' : '收藏成功',
        icon: 'none',
      });
      this.loadDetail();
    } catch (error) {
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none',
      });
    }
  },

  onAddToCart() {
    const token = getToken();
    if (!token) {
      wx.showToast({
        title: '请先登录后再加入购物车',
        icon: 'none',
      });
      return;
    }

    const detail = this.data.detail;
    const sku = this.getSelectedSku();
    if (!detail || !sku || Number(sku.stock) <= 0) {
      wx.showToast({
        title: '当前规格暂无库存',
        icon: 'none',
      });
      return;
    }

    upsertCartItem({
      productId: detail.id,
      skuId: sku.id,
      title: detail.title,
      subtitle: detail.subtitle,
      categoryName: detail.categoryName,
      coverImage: detail.coverImage,
      skuName: sku.name,
      skuSpecs: resolveSkuSpecs(sku.specs),
      unitPrice: Number(sku.salePrice),
      quantity: 1,
      stock: Number(sku.stock),
    });

    wx.showToast({
      title: '已加入购物车',
      icon: 'none',
    });
  },

  onCreateOrder() {
    const token = getToken();
    if (!token) {
      wx.showToast({
        title: '请先登录后再下单',
        icon: 'none',
      });
      return;
    }

    const detail = this.data.detail;
    const sku = this.getSelectedSku();
    if (!detail || !sku || Number(sku.stock) <= 0) {
      wx.showToast({
        title: '当前规格暂无库存',
        icon: 'none',
      });
      return;
    }

    prependOrder({
      id: `WD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      totalQuantity: 1,
      totalAmount: Number(sku.salePrice),
      items: [
        {
          productId: detail.id,
          skuId: sku.id,
          title: detail.title,
          subtitle: detail.subtitle,
          categoryName: detail.categoryName,
          coverImage: detail.coverImage,
          skuName: sku.name,
          skuSpecs: resolveSkuSpecs(sku.specs),
          unitPrice: Number(sku.salePrice),
          quantity: 1,
          stock: Number(sku.stock),
        },
      ],
    });

    wx.showToast({
      title: '订单已创建，支付暂未开放',
      icon: 'none',
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
});
