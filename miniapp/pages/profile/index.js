const { login, logout, getToken } = require('../../utils/auth');
const { getAddresses, getOrders, getProfile } = require('../../utils/local-state');

Page({
  data: {
    phone: '',
    password: '',
    hasToken: false,
    profile: null,
    addresses: [],
    orders: [],
  },

  onLoad() {
    const app = getApp();
    this.setData({
      phone: app.globalData.demoPhone,
      password: app.globalData.demoPassword,
    });
  },

  onShow() {
    this.syncPage();
  },

  syncPage() {
    this.setData({
      hasToken: !!getToken(),
      profile: getProfile(),
      addresses: getAddresses(),
      orders: getOrders(),
    });
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
      this.syncPage();
    } catch (error) {
      wx.showToast({ title: error.message || '登录失败', icon: 'none' });
    }
  },

  onLogout() {
    logout();
    this.syncPage();
  },

  goFavorites() {
    wx.navigateTo({
      url: '/pages/favorites/index',
    });
  },
});
