const LOCAL_ORIGIN = 'http://127.0.0.1:3000';
const LAN_ORIGIN = 'http://10.130.189.96:3000';
const BASE_ORIGIN_STORAGE_KEY = 'wudong-base-origin';

function isDevtools() {
  try {
    const systemInfo = wx.getSystemInfoSync();
    return systemInfo.platform === 'devtools';
  } catch (error) {
    return false;
  }
}

function normalizeOrigin(origin) {
  const value = String(origin || '').trim();
  if (!value) {
    return '';
  }
  const withProtocol = /^https?:\/\//i.test(value)
    ? value
    : `http://${value}`;
  return withProtocol.replace(/\/+$/, '');
}

function getStoredOrigin() {
  try {
    return normalizeOrigin(wx.getStorageSync(BASE_ORIGIN_STORAGE_KEY));
  } catch (error) {
    return '';
  }
}

function setStoredOrigin(origin) {
  const normalized = normalizeOrigin(origin);
  wx.setStorageSync(BASE_ORIGIN_STORAGE_KEY, normalized);
  return normalized;
}

function clearStoredOrigin() {
  wx.removeStorageSync(BASE_ORIGIN_STORAGE_KEY);
}

function getDefaultOrigin() {
  return isDevtools() ? LOCAL_ORIGIN : LAN_ORIGIN;
}

function getOriginCandidates() {
  const storedOrigin = getStoredOrigin();
  const defaults = [getDefaultOrigin(), LOCAL_ORIGIN, LAN_ORIGIN];
  const unique = [];

  [storedOrigin, ...defaults].forEach(item => {
    const normalized = normalizeOrigin(item);
    if (normalized && !unique.includes(normalized)) {
      unique.push(normalized);
    }
  });

  return unique;
}

function getRuntimeConfig() {
  const baseOrigin = getOriginCandidates()[0] || LOCAL_ORIGIN;
  return {
    baseOrigin,
    baseUrl: `${baseOrigin}/api`,
  };
}

function replaceOrigin(value, baseOrigin) {
  return value
    .split('http://127.0.0.1:3000')
    .join(baseOrigin)
    .split('http://localhost:3000')
    .join(baseOrigin);
}

function normalizeRemoteData(value, baseOrigin) {
  if (Array.isArray(value)) {
    return value.map(item => normalizeRemoteData(item, baseOrigin));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((result, key) => {
      result[key] = normalizeRemoteData(value[key], baseOrigin);
      return result;
    }, {});
  }

  if (typeof value === 'string') {
    return replaceOrigin(value, baseOrigin);
  }

  return value;
}

module.exports = {
  LOCAL_ORIGIN,
  LAN_ORIGIN,
  getDefaultOrigin,
  getOriginCandidates,
  getRuntimeConfig,
  getStoredOrigin,
  setStoredOrigin,
  clearStoredOrigin,
  normalizeOrigin,
  normalizeRemoteData,
};
