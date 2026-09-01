// 配置持久化:统一 key 为 danmaku-enhancer:<platformId>。
// 若新 key 缺失而旧 key(平台迁移前的历史命名)存在,则一次性导入,之后以新 key 为准。

export function createStore(platformId, legacyKey, defaults) {
  const KEY = `danmaku-enhancer:${platformId}`;

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {}
    if (raw == null && legacyKey) {
      try {
        const old = localStorage.getItem(legacyKey);
        if (old != null) {
          raw = old;
          localStorage.setItem(KEY, old);
        }
      } catch (e) {}
    }
    const cfg = Object.assign({}, defaults);
    try {
      Object.assign(cfg, JSON.parse(raw || '{}'));
    } catch (e) {}
    return cfg;
  }

  function save(cfg) {
    try {
      localStorage.setItem(KEY, JSON.stringify(cfg));
    } catch (e) {}
  }

  return { load, save };
}
