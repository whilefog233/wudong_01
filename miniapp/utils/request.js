const { getOriginCandidates, normalizeRemoteData } = require('./runtime');

function buildNetworkErrorMessage(origin, originalMessage) {
  return [
    `接口不可达：${origin}`,
    originalMessage || '网络请求失败',
    '真机调试时请与电脑处于同一 Wi-Fi，或在首页将接口地址切换为可访问的局域网地址。',
  ].join('\n');
}

function request({ url, method = 'GET', data, withToken = false }) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('wudong-app-token');
    const originCandidates = getOriginCandidates();

    const tryRequest = index => {
      const baseOrigin = originCandidates[index];
      const requestUrl = `${baseOrigin}/api${url}`;

      wx.request({
        url: requestUrl,
        method,
        data,
        header: {
          'content-type': 'application/json',
          ...(withToken && token ? { Authorization: token } : {}),
        },
        success: response => {
          const body = response.data || {};

          if (body.code === 1000) {
            resolve(normalizeRemoteData(body.data, baseOrigin));
            return;
          }

          reject(new Error(body.message || '请求失败'));
        },
        fail: error => {
          const networkMessage = error.errMsg || error.message || '网络请求失败';

          if (index < originCandidates.length - 1) {
            tryRequest(index + 1);
            return;
          }

          reject(new Error(buildNetworkErrorMessage(baseOrigin, networkMessage)));
        },
      });
    };

    tryRequest(0);
  });
}

module.exports = {
  request,
};
