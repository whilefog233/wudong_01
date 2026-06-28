const HOME_PATH = '/pages/index/index';
const { getRuntimeConfig } = require('./utils/runtime');

const runtimeConfig = getRuntimeConfig();

App({
  globalData: {
    baseOrigin: runtimeConfig.baseOrigin,
    baseUrl: runtimeConfig.baseUrl,
    demoPhone: '13800000000',
    demoPassword: '123456',
    homePath: HOME_PATH,
  },

  onPageNotFound(res) {
    const target = res && res.path ? `/${res.path}` : '';

    if (target === HOME_PATH) {
      return;
    }

    wx.reLaunch({
      url: HOME_PATH,
    });
  },
});
