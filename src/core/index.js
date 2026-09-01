import { DEFAULTS, PANEL_SCHEMA } from './config.js';
import { createStore } from './store.js';
import { createChatMap } from './chat-map.js';
import { renderPrefix } from './prefix.js';
import { createFixedChat } from './fixed-chat.js';
import { buildPanel } from './panel.js';
import { createFloatingPanel } from './floating-panel.js';
import { badgeColor, consumeColor } from './colors.js';
import { CORE_CSS } from './styles.js';

const MAP_MAX = 2000; // 关联键映射上限
const CMID_MAX = 4000; // 已解析聊天行 id 缓存上限,超出清空重来

// 创建一个绑定到具体平台适配器的引擎实例。平台只负责「怎么读 / 往哪挂」,流程全在 core。
export function createEngine(platform) {
  const store = createStore(platform.id, platform.legacyKey, DEFAULTS);
  const cfg = store.load();
  const colors = {
    badge: (platform.colors && platform.colors.badge) || badgeColor,
    consume: (platform.colors && platform.colors.consume) || consumeColor,
  };
  const chatMap = createChatMap(MAP_MAX);
  const seenIds = new Set();
  const fixed = createFixedChat(platform, () => cfg, colors);
  const floating = createFloatingPanel({ getCfg: () => cfg, save: () => store.save(cfg) });
  let cfgVer = 0; // 并入前缀签名,配置一变即触发全部重建

  function onChange() {
    store.save(cfg);
    applyCfg();
  }

  // 只解析新出现的聊天行(按行 id 去重),回填映射并推入固定聊天区。
  function updateChatMap() {
    platform.chat.rows().forEach((row) => {
      const id = platform.chat.rowId(row);
      let isNew = true;
      if (id != null) {
        if (seenIds.has(id)) return;
        seenIds.add(id);
      } else {
        isNew = false; // 无稳定 id,只更新映射,避免重复推入固定聊天区
      }
      const info = platform.chat.parseRow(row);
      if (!info || !info.key) return;
      chatMap.set(info.key, info);
      if (isNew) fixed.push(info);
    });
    if (seenIds.size > CMID_MAX) seenIds.clear();
  }

  function updateDanmu() {
    const tag = platform.danmu.safePrefixTag || 'i';
    const seenMsg = cfg.dedup ? new Set() : null;
    platform.danmu.items().forEach((it) => {
      const r = platform.danmu.readItem(it) || {};
      if (seenMsg) {
        if (r.msg && seenMsg.has(r.msg)) it.classList.add('de-dup'); // 同屏重复弹幕只留第一条
        else {
          if (r.msg) seenMsg.add(r.msg);
          it.classList.remove('de-dup');
        }
      } else if (it.classList.contains('de-dup')) {
        it.classList.remove('de-dup');
      }
      renderPrefix(it, r.nick, r.key ? chatMap.get(r.key) : undefined, cfg, colors, cfgVer, tag);
    });
  }

  let scheduled = false;
  function refresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      updateChatMap();
      updateDanmu();
    });
  }

  function applyMode() {
    const c = platform.danmu.container && platform.danmu.container();
    if (c) c.classList.toggle('de-hide-native', cfg.renderMode === 'fixed');
    fixed.apply();
  }

  function applyCfg() {
    document.documentElement.style.setProperty('--de-op', cfg.opacity);
    cfgVer++;
    applyMode();
    ensurePanel();
    refresh();
  }

  function addStyle(id, css) {
    if (document.getElementById(id)) return;
    const st = document.createElement('style');
    st.id = id;
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }
  function injectStyle() {
    addStyle('de-core-style', CORE_CSS);
    if (platform.styles) addStyle('de-' + platform.id + '-style', platform.styles);
  }

  let panelEl = null;
  function ensurePanel() {
    if (!panelEl) {
      const sc = platform.panel ? platform.panel.switchClasses : null;
      panelEl = buildPanel(PANEL_SCHEMA, cfg, sc, onChange);
    }
    if (cfg.panelMode === 'floating') {
      if (platform.panel && platform.panel.unmount) platform.panel.unmount();
      floating.mount(panelEl);
    } else if (platform.panel && platform.panel.mount) {
      floating.hide();
      platform.panel.mount(panelEl);
    } else {
      floating.mount(panelEl); // 平台未提供内嵌挂载点时退回浮窗
    }
  }

  const danmuObserver = new MutationObserver(refresh);
  const chatObserver = new MutationObserver(refresh);
  let danmuNode = null;
  let chatNode = null;
  function ensureAttached() {
    injectStyle();
    ensurePanel();
    fixed.ensure();
    const d = platform.danmu.container();
    if (d && d !== danmuNode) {
      danmuObserver.disconnect();
      danmuObserver.observe(d, { childList: true, subtree: true, characterData: true });
      danmuNode = d;
      d.classList.toggle('de-hide-native', cfg.renderMode === 'fixed');
    }
    const c = platform.chat.container();
    if (c && c !== chatNode) {
      chatObserver.disconnect();
      chatObserver.observe(c, { childList: true, subtree: true });
      chatNode = c;
    }
  }

  function start() {
    applyCfg();
    ensureAttached();
    setInterval(() => {
      ensureAttached();
      refresh();
    }, 1000);
  }

  return { start };
}
