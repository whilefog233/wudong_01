const { request } = require('../../utils/request');
const { login, logout, getToken } = require('../../utils/auth');

Page({
  data: {
    phone: '',
    password: '',
    hasToken: false,
    favorites: [],
    message: '',
  },

  onLoad() {
    const app = getApp();
    this.setData({
      phone: app.globalData.demoPhone,
      password: app.globalData.demoPassword,
    });
  },

  onShow() {
    this.syncStatus();
  },

  syncStatus() {
    const hasToken = !!getToken();
    this.setData({ hasToken });
    if (hasToken) {
      this.loadFavorites();
    } else {
      this.setData({
        favorites: [],
        message: '登录后才能同步你的非遗收藏清单。',
      });
    }
  },

  onPhoneInput(event) {
    this.setData({ phone: event.detail.value });
  },

  onPasswordInput(event) {
    this.setData({ password: event.detail.value });
  },

  async onLogin() {
    try {
      await login(this.data.phone, this.data.password);
      wx.showToast({ title: '登录成功', icon: 'none' });
      this.syncStatus();
    } catch (error) {
      wx.showToast({ title: error.message || '登录失败', icon: 'none' });
    }
  },

  onLogout() {
    logout();
    this.syncStatus();
  },

  async loadFavorites() {
    try {
      const page = await request({
        url: '/app/wudong/favorites/page?page=1&pageSize=20',
        withToken: true,
      });
      this.setData({
        favorites: page.list,
        message: page.list.length ? '' : '还没有收藏单品，去首页挑一件喜欢的作品吧。',
      });
    } catch (error) {
      this.setData({ message: error.message || '收藏加载失败' });
    }
  },

  async onRemoveFavorite(event) {
    try {
      await request({
        url: '/app/wudong/favorites/delete',
        method: 'POST',
        data: { productId: event.currentTarget.dataset.id },
        withToken: true,
      });
      wx.showToast({ title: '已取消收藏', icon: 'none' });
      this.loadFavorites();
    } catch (error) {
      wx.showToast({ title: error.message || '取消失败', icon: 'none' });
    }
  },

  goDetail(event) {
    wx.navigateTo({
      url: `/pages/detail/index?id=${event.currentTarget.dataset.id}`,
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
