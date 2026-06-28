const { getToken } = require('../../utils/auth');
const {
  getAddresses,
  getCart,
  clearCartItems,
  prependOrder,
  removeCartItem,
  updateCartQuantity,
} = require('../../utils/local-state');

Page({
  data: {
    items: [],
    totalAmount: 0,
    totalAmountText: '0.00',
    message: '',
    address: null,
  },

  onShow() {
    this.syncCart();
  },

  syncCart() {
    const items = getCart();
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const address = getAddresses()[0] || null;
    this.setData({
      items,
      totalAmount,
      totalAmountText: totalAmount.toFixed(2),
      address,
      message: items.length ? '' : '购物车还是空的，先去首页挑一件作品吧。',
    });
  },

  changeQuantity(event) {
    const skuId = event.currentTarget.dataset.id;
    const delta = event.currentTarget.dataset.delta;
    const target = this.data.items.find(item => item.skuId === skuId);
    if (!target) {
      return;
    }
    const nextQuantity = Math.max(0, Math.min(target.quantity + delta, target.stock));
    updateCartQuantity(skuId, nextQuantity);
    this.syncCart();
  },

  removeItem(event) {
    removeCartItem(event.currentTarget.dataset.id);
    this.syncCart();
  },

  submitOrder() {
    const token = getToken();
    if (!token) {
      wx.showToast({
        title: '请先登录后再提交订单',
        icon: 'none',
      });
      return;
    }

    if (!this.data.items.length) {
      wx.showToast({
        title: '购物车为空',
        icon: 'none',
      });
      return;
    }

    prependOrder({
      id: `WD-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'pending',
      totalQuantity: this.data.items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: this.data.totalAmount,
      items: this.data.items,
    });
    clearCartItems(this.data.items.map(item => item.skuId));
    this.syncCart();
    this.setData({
      message: '订单已提交为待支付状态，支付模块暂未开放。',
    });
    wx.showToast({
      title: '订单已创建',
      icon: 'none',
    });
  },

  goProfile() {
    wx.navigateTo({
      url: '/pages/profile/index',
    });
  },
});
