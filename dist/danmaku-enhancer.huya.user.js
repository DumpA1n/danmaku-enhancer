// ==UserScript==
// @name         虎牙弹幕增强(昵称+粉丝牌+消费等级 / 固定聊天区)
// @namespace    https://github.com/local/danmaku-enhancer
// @version      2.0.0
// @description  虎牙飘屏弹幕前缀(粉丝牌+消费等级+昵称)与 Twitch 式固定聊天区;设置面板内嵌原生弹幕设置弹层
// @author       you
// @match        https://www.huya.com/*
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(() => {
  // src/core/config.js
  var DEFAULTS = {
    // 飘屏弹幕前缀
    showNick: true,
    showBadge: true,
    showConsume: true,
    dedup: false,
    opacity: 1,
    minBadgeLevel: 0,
    minConsume: 0,
    // 弹幕形态:float=仅飘屏 / fixed=仅固定聊天区 / both=两者
    renderMode: "float",
    // 固定聊天区
    fixedCorner: "right-top",
    fixedWidth: 300,
    fixedOpacity: 0.9,
    fixedFontSize: 13,
    fixedMax: 80
  };
  var pct = (v) => Math.round(v * 100) + "%";
  var PANEL_SCHEMA = [
    { type: "title", text: "弹幕昵称增强" },
    { type: "switch", key: "showNick", label: "显示昵称" },
    { type: "switch", key: "showBadge", label: "粉丝牌" },
    { type: "switch", key: "showConsume", label: "消费等级" },
    { type: "switch", key: "dedup", label: "合并重复弹幕" },
    { type: "slider", key: "opacity", label: "前缀不透明度", min: 0.3, max: 1, step: 0.05, fmt: pct },
    {
      type: "numbers",
      fields: [
        { key: "minBadgeLevel", label: "粉丝牌≥" },
        { key: "minConsume", label: "消费≥" }
      ]
    },
    { type: "title", text: "固定聊天区" },
    {
      type: "select",
      key: "renderMode",
      label: "弹幕模式",
      options: [
        { value: "float", label: "飘屏" },
        { value: "fixed", label: "固定区" },
        { value: "both", label: "两者" }
      ]
    },
    {
      type: "select",
      key: "fixedCorner",
      label: "位置",
      options: [
        { value: "left-top", label: "左上" },
        { value: "right-top", label: "右上" },
        { value: "left-bottom", label: "左下" },
        { value: "right-bottom", label: "右下" }
      ]
    },
    { type: "slider", key: "fixedWidth", label: "宽度", min: 220, max: 520, step: 10, fmt: (v) => v + "px" },
    { type: "slider", key: "fixedOpacity", label: "不透明度", min: 0.3, max: 1, step: 0.05, fmt: pct },
    { type: "slider", key: "fixedFontSize", label: "字号", min: 11, max: 18, step: 1, fmt: (v) => v + "px" },
    {
      type: "numbers",
      fields: [{ key: "fixedMax", label: "最大条数" }]
    }
  ];

  // src/core/store.js
  function createStore(platformId, legacyKey, defaults) {
    const KEY = `danmaku-enhancer:${platformId}`;
    function load() {
      let raw = null;
      try {
        raw = localStorage.getItem(KEY);
      } catch (e) {
      }
      if (raw == null && legacyKey) {
        try {
          const old = localStorage.getItem(legacyKey);
          if (old != null) {
            raw = old;
            localStorage.setItem(KEY, old);
          }
        } catch (e) {
        }
      }
      const cfg = Object.assign({}, defaults);
      try {
        Object.assign(cfg, JSON.parse(raw || "{}"));
      } catch (e) {
      }
      return cfg;
    }
    function save(cfg) {
      try {
        localStorage.setItem(KEY, JSON.stringify(cfg));
      } catch (e) {
      }
    }
    return { load, save };
  }

  // src/core/chat-map.js
  function createChatMap(max = 2e3) {
    const map = /* @__PURE__ */ new Map();
    return {
      set(key, info) {
        if (map.has(key)) map.delete(key);
        map.set(key, info);
        if (map.size > max) map.delete(map.keys().next().value);
      },
      get(key) {
        return map.get(key);
      }
    };
  }

  // src/core/pill.js
  function pill(bg, text, { tag = "span", cls = "" } = {}) {
    const el = document.createElement(tag);
    el.className = "de-pill" + (cls ? " " + cls : "");
    el.style.backgroundColor = bg;
    el.textContent = text;
    return el;
  }
  function level(v) {
    return v ? parseInt(v, 10) || 0 : 0;
  }
  function appendBadges(container, info, cfg, colors, tag) {
    let any = false;
    if (info) {
      const bl = level(info.badgeLevel);
      if (cfg.showBadge && info.badgeName && bl >= cfg.minBadgeLevel) {
        container.appendChild(
          pill(colors.badge(bl), info.badgeName + (info.badgeLevel ? " " + info.badgeLevel : ""), {
            tag,
            cls: "de-b"
          })
        );
        any = true;
      }
      const cl = level(info.consume);
      if (cfg.showConsume && info.consume && cl >= cfg.minConsume) {
        container.appendChild(pill(colors.consume(cl), info.consume, { tag, cls: "de-c" }));
        any = true;
      }
    }
    return any;
  }

  // src/core/prefix.js
  var SEPARATOR = "：";
  function renderPrefix(host, nick, info, cfg, colors, cfgVer, tag) {
    let pre = host.querySelector(".de-pre");
    if (!nick) {
      if (pre) pre.remove();
      return;
    }
    const bl = info && info.badgeLevel ? parseInt(info.badgeLevel, 10) || 0 : 0;
    const cl = info && info.consume ? parseInt(info.consume, 10) || 0 : 0;
    const showB = cfg.showBadge && info && info.badgeName && bl >= cfg.minBadgeLevel;
    const showC = cfg.showConsume && info && info.consume && cl >= cfg.minConsume;
    const showN = !!cfg.showNick;
    const sig = [cfgVer, nick, showB ? info.badgeName + bl : "", showC ? cl : "", showN ? 1 : 0].join("|");
    if (!pre) {
      pre = document.createElement(tag);
      pre.className = "de-pre";
      host.insertBefore(pre, host.firstChild);
    } else if (pre.__sig === sig) {
      return;
    }
    pre.__sig = sig;
    pre.textContent = "";
    appendBadges(pre, info, cfg, colors, tag);
    if (showN) {
      const n = document.createElement(tag);
      n.className = "de-nick";
      n.textContent = nick + SEPARATOR;
      pre.appendChild(n);
    }
    if (!pre.childNodes.length) pre.remove();
  }

  // src/core/fixed-chat.js
  function createFixedChat(platform, getCfg, colors) {
    let host = null;
    let wrap = null;
    let list = null;
    let paused = false;
    function scrollBottom() {
      if (list) list.scrollTop = list.scrollHeight;
    }
    function ensure() {
      const h = platform.overlayHost && platform.overlayHost();
      if (!h) return false;
      if (wrap && host === h && h.contains(wrap)) return true;
      host = h;
      wrap = document.createElement("div");
      wrap.className = "de-fixed";
      list = document.createElement("div");
      list.className = "de-fixed-list";
      wrap.appendChild(list);
      list.addEventListener("mouseenter", () => {
        paused = true;
      });
      list.addEventListener("mouseleave", () => {
        paused = false;
        scrollBottom();
      });
      if (getComputedStyle(host).position === "static") host.style.position = "relative";
      host.appendChild(wrap);
      apply();
      return true;
    }
    function push(info) {
      const cfg = getCfg();
      if (cfg.renderMode === "float") return;
      if (!ensure()) return;
      const line = document.createElement("div");
      line.className = "de-line";
      appendBadges(line, info, cfg, colors, "span");
      if (cfg.showNick) {
        const nk = document.createElement("span");
        nk.className = "de-fixed-nick";
        nk.textContent = (info.nick || "") + "：";
        line.appendChild(nk);
      }
      const msg = document.createElement("span");
      msg.className = "de-fixed-msg";
      msg.textContent = info.msg || "";
      line.appendChild(msg);
      list.appendChild(line);
      const max = cfg.fixedMax || 80;
      while (list.childElementCount > max) list.removeChild(list.firstChild);
      if (!paused) scrollBottom();
    }
    function apply() {
      if (!wrap) {
        ensure();
        return;
      }
      const cfg = getCfg();
      wrap.style.setProperty("--de-fx-w", (cfg.fixedWidth || 300) + "px");
      wrap.style.setProperty("--de-fx-op", cfg.fixedOpacity != null ? cfg.fixedOpacity : 0.9);
      wrap.style.setProperty("--de-fx-fs", (cfg.fixedFontSize || 13) + "px");
      wrap.className = "de-fixed de-fx-" + (cfg.fixedCorner || "right-top");
      wrap.style.display = cfg.renderMode === "float" ? "none" : "";
    }
    return { push, apply, ensure };
  }

  // src/core/panel.js
  function stop(e) {
    e.stopPropagation();
  }
  function switchRow(item, cfg, sc, onChange) {
    const row = document.createElement("div");
    row.className = (sc.row || "") + " de-sw";
    const i = document.createElement("i");
    i.textContent = item.label;
    const btn = document.createElement("div");
    btn.className = sc.btn || "de-btn";
    const quan = document.createElement("div");
    quan.className = sc.quan || "de-quan";
    btn.appendChild(quan);
    const sync = () => {
      const on = !!cfg[item.key];
      if (sc.on) btn.classList.toggle(sc.on, on);
      if (sc.off) btn.classList.toggle(sc.off, !on);
      btn.classList.toggle("de-on", on);
    };
    sync();
    row.append(i, btn);
    row.addEventListener("click", () => {
      cfg[item.key] = !cfg[item.key];
      sync();
      onChange();
    });
    return row;
  }
  function sliderRow(item, cfg, onChange) {
    const row = document.createElement("div");
    row.className = "de-slider";
    const label = document.createElement("span");
    label.textContent = item.label;
    const range = document.createElement("input");
    range.type = "range";
    range.min = String(item.min);
    range.max = String(item.max);
    range.step = String(item.step);
    range.value = String(cfg[item.key]);
    const val = document.createElement("span");
    val.className = "de-slider-val";
    const fmt = item.fmt || ((v) => String(v));
    val.textContent = fmt(cfg[item.key]);
    range.addEventListener("input", () => {
      cfg[item.key] = Number(range.value);
      val.textContent = fmt(cfg[item.key]);
      onChange();
    });
    range.addEventListener("click", stop);
    row.append(label, range, val);
    return row;
  }
  function numbersRow(item, cfg, onChange) {
    const row = document.createElement("div");
    row.className = "de-nums";
    for (const f of item.fields) {
      const span = document.createElement("span");
      span.textContent = f.label;
      const inp = document.createElement("input");
      inp.type = "number";
      inp.min = "0";
      inp.value = String(cfg[f.key]);
      inp.addEventListener("change", () => {
        cfg[f.key] = Number(inp.value) || 0;
        onChange();
      });
      inp.addEventListener("click", stop);
      row.append(span, inp);
    }
    return row;
  }
  function selectRow(item, cfg, onChange) {
    const row = document.createElement("div");
    row.className = "de-select";
    const label = document.createElement("span");
    label.textContent = item.label;
    const sel = document.createElement("select");
    for (const o of item.options) {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      sel.appendChild(opt);
    }
    sel.value = cfg[item.key];
    sel.addEventListener("change", () => {
      cfg[item.key] = sel.value;
      onChange();
    });
    sel.addEventListener("click", stop);
    row.append(label, sel);
    return row;
  }
  function buildPanel(schema, cfg, switchClasses, onChange) {
    const sec = document.createElement("div");
    sec.id = "de-panel";
    const sc = switchClasses || {};
    for (const item of schema) {
      if (item.type === "title") {
        const div = document.createElement("div");
        div.className = "de-divider";
        const t = document.createElement("div");
        t.className = "de-ptitle";
        t.textContent = item.text;
        sec.append(div, t);
      } else if (item.type === "switch") {
        sec.appendChild(switchRow(item, cfg, sc, onChange));
      } else if (item.type === "slider") {
        sec.appendChild(sliderRow(item, cfg, onChange));
      } else if (item.type === "numbers") {
        sec.appendChild(numbersRow(item, cfg, onChange));
      } else if (item.type === "select") {
        sec.appendChild(selectRow(item, cfg, onChange));
      }
    }
    return sec;
  }

  // src/core/colors.js
  function badgeColor(level2) {
    const lv = parseInt(level2, 10) || 0;
    if (lv >= 36) return "#ffbf3a";
    if (lv >= 31) return "#ff2a1a";
    if (lv >= 30) return "#ff4f04";
    if (lv >= 27) return "#f77d04";
    if (lv >= 24) return "#8b44ff";
    if (lv >= 21) return "#c34aff";
    if (lv >= 18) return "#c02d5d";
    if (lv >= 14) return "#5d6be5";
    if (lv >= 6) return "#0078c1";
    return "#008c76";
  }
  function consumeColor(level2) {
    const lv = parseInt(level2, 10) || 0;
    if (lv >= 40) return "#f5a623";
    if (lv >= 30) return "#e0559b";
    if (lv >= 20) return "#9b59e6";
    return "#7c4dff";
  }

  // src/core/styles.js
  var NICK_STROKE = "1px 0 1px #222,0 1px 1px #222,0 -1px 1px #222,-1px 0 1px #222";
  var CORE_CSS = `
.de-dup{display:none!important;}
.de-hide-native{display:none!important;}

/* 飘屏弹幕前缀。胶囊底色由 JS 按等级设在元素上,此处只叠一层顶部高光模拟原生光泽。 */
.de-pre{vertical-align:middle;font-style:normal;opacity:var(--de-op,1);}
.de-pill{display:inline-block;vertical-align:middle;font-size:14px;font-weight:700;font-style:normal;line-height:20px;height:20px;padding:0 6px;border-radius:4px;color:#fff;margin-right:4px;text-shadow:none;background-image:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 55%);}
.de-nick{font-style:normal;font-weight:700;vertical-align:middle;text-shadow:${NICK_STROKE};}

/* Twitch 式固定聊天区(叠加在播放器内)。 */
.de-fixed{position:absolute;z-index:9999;width:var(--de-fx-w,300px);max-height:46%;display:flex;flex-direction:column;pointer-events:none;opacity:var(--de-fx-op,.9);}
.de-fixed-list{overflow-y:auto;overflow-x:hidden;pointer-events:auto;background:rgba(0,0,0,.42);border-radius:6px;padding:6px 8px;font-size:var(--de-fx-fs,13px);line-height:1.55;color:#fff;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.35) transparent;}
.de-fixed-list::-webkit-scrollbar{width:6px;}
.de-fixed-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,.35);border-radius:3px;}
.de-fixed .de-pill{font-size:calc(var(--de-fx-fs,13px) - 1px);height:auto;line-height:1.4;padding:0 5px;margin-right:3px;}
.de-line{margin:3px 0;word-break:break-word;text-shadow:0 1px 1px rgba(0,0,0,.6);}
.de-fixed-nick{font-weight:700;color:#ffd36b;}
.de-fixed-msg{color:#fff;}
.de-fx-left-top{left:12px;top:12px;}
.de-fx-right-top{right:12px;top:12px;}
.de-fx-left-bottom{left:12px;bottom:64px;}
.de-fx-right-bottom{right:12px;bottom:64px;}

/* 设置面板通用控件(平台负责定位与背景)。 */
#de-panel{--de-accent:#ff9600;box-sizing:border-box;color:#fff;font-size:12px;}
#de-panel .de-divider{height:1px;background:rgba(255,255,255,.12);margin:2px 0 6px;}
#de-panel .de-ptitle{font-weight:700;margin:0 0 2px;}
#de-panel .de-sw{position:static!important;display:flex!important;align-items:center;justify-content:space-between;height:auto!important;margin:6px 0!important;cursor:pointer;}
#de-panel .de-slider,#de-panel .de-select{display:flex;align-items:center;gap:8px;margin-top:10px;white-space:nowrap;}
#de-panel .de-slider input[type=range]{flex:1;min-width:0;height:3px;accent-color:var(--de-accent);cursor:pointer;}
#de-panel .de-slider-val{width:40px;text-align:right;color:var(--de-accent);}
#de-panel .de-select select{flex:1;min-width:0;background:#333;border:1px solid #555;color:#fff;border-radius:3px;padding:1px 3px;cursor:pointer;}
#de-panel .de-nums{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:8px;white-space:nowrap;}
#de-panel .de-nums input{width:44px;background:#333;border:1px solid #555;color:#fff;border-radius:3px;padding:1px 3px;}
/* 平台无原生开关类时的兜底样式。 */
#de-panel .de-btn{position:relative;width:36px;height:18px;border-radius:9px;background:#555;transition:background .15s;flex:none;}
#de-panel .de-btn.de-on{background:var(--de-accent);}
#de-panel .de-btn .de-quan{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .15s;}
#de-panel .de-btn.de-on .de-quan{left:20px;}
`;

  // src/core/index.js
  var MAP_MAX = 2e3;
  var CMID_MAX = 4e3;
  function createEngine(platform) {
    const store = createStore(platform.id, platform.legacyKey, DEFAULTS);
    const cfg = store.load();
    const colors = {
      badge: platform.colors && platform.colors.badge || badgeColor,
      consume: platform.colors && platform.colors.consume || consumeColor
    };
    const chatMap = createChatMap(MAP_MAX);
    const seenIds = /* @__PURE__ */ new Set();
    const fixed = createFixedChat(platform, () => cfg, colors);
    let cfgVer = 0;
    function onChange() {
      store.save(cfg);
      applyCfg();
    }
    function updateChatMap() {
      platform.chat.rows().forEach((row) => {
        const id = platform.chat.rowId(row);
        let isNew = true;
        if (id != null) {
          if (seenIds.has(id)) return;
          seenIds.add(id);
        } else {
          isNew = false;
        }
        const info = platform.chat.parseRow(row);
        if (!info || !info.key) return;
        chatMap.set(info.key, info);
        if (isNew) fixed.push(info);
      });
      if (seenIds.size > CMID_MAX) seenIds.clear();
    }
    function updateDanmu() {
      const tag = platform.danmu.safePrefixTag || "i";
      const seenMsg = cfg.dedup ? /* @__PURE__ */ new Set() : null;
      platform.danmu.items().forEach((it) => {
        const r = platform.danmu.readItem(it) || {};
        if (seenMsg) {
          if (r.msg && seenMsg.has(r.msg)) it.classList.add("de-dup");
          else {
            if (r.msg) seenMsg.add(r.msg);
            it.classList.remove("de-dup");
          }
        } else if (it.classList.contains("de-dup")) {
          it.classList.remove("de-dup");
        }
        renderPrefix(it, r.nick, r.key ? chatMap.get(r.key) : void 0, cfg, colors, cfgVer, tag);
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
      if (c) c.classList.toggle("de-hide-native", cfg.renderMode === "fixed");
      fixed.apply();
    }
    function applyCfg() {
      document.documentElement.style.setProperty("--de-op", cfg.opacity);
      cfgVer++;
      applyMode();
      refresh();
    }
    function addStyle(id, css) {
      if (document.getElementById(id)) return;
      const st = document.createElement("style");
      st.id = id;
      st.textContent = css;
      (document.head || document.documentElement).appendChild(st);
    }
    function injectStyle() {
      addStyle("de-core-style", CORE_CSS);
      if (platform.styles) addStyle("de-" + platform.id + "-style", platform.styles);
    }
    let panelEl = null;
    function ensurePanel() {
      if (!platform.panel || !platform.panel.mount) return;
      if (!panelEl) {
        panelEl = buildPanel(PANEL_SCHEMA, cfg, platform.panel.switchClasses, onChange);
      }
      platform.panel.mount(panelEl);
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
        d.classList.toggle("de-hide-native", cfg.renderMode === "fixed");
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
      }, 1e3);
    }
    return { start };
  }

  // src/platforms/huya.js
  function pageWin() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }
  function messageText(row) {
    const clone = row.cloneNode(true);
    clone.querySelectorAll(
      '.name, .J_CustomFansBadge, .fans-icon, [class*="ConsumeLevelBadge"], [class*="Badge"], [class*="Noble"], [class*="noble"], [class*="icon"], img'
    ).forEach((n) => n.remove());
    return clone.textContent.replace(/\s+/g, " ").replace(/^[：:]\s*/, "").trim();
  }
  function parseBadge(row) {
    var _a;
    const custom = row.querySelector(".J_CustomFansBadge");
    if (custom) {
      const name = (((_a = custom.querySelector("i")) == null ? void 0 : _a.textContent) || "").trim();
      const lv = custom.querySelector('img[class*="Lv"]');
      const m = lv && lv.src.match(/_(\d+)\.png(?:\?|$)/);
      return { badgeName: name, badgeLevel: m ? m[1] : "" };
    }
    const simple = row.querySelector(".fans-icon");
    if (simple) {
      const name = [...simple.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
      const m = simple.className.match(/fans-icon-(\d+)(?:\s|$)/);
      return { badgeName: name, badgeLevel: m ? m[1] : "" };
    }
    return { badgeName: "", badgeLevel: "" };
  }
  var huya = {
    id: "huya",
    legacyKey: "hy-danmu-nick-cfg",
    match: () => /(^|\.)huya\.com$/.test(location.hostname),
    // 播放器容器(飘屏弹幕层的祖先),固定聊天区叠加于此,随全屏/影院模式生效。
    overlayHost: () => document.querySelector("#player-video"),
    danmu: {
      container: () => document.querySelector("#danmudiv"),
      items: () => document.querySelectorAll("#danmudiv .danmu-item"),
      safePrefixTag: "i",
      // 防节点池复用时 <span> 文本被重写覆盖
      // 飘屏弹幕的 $(item).data() = {msg, uid, nick};虎牙聊天行不暴露 uid,故关联键用 nick。
      readItem(el) {
        const $ = pageWin().jQuery;
        if (!$) return {};
        let data;
        try {
          data = $(el).data();
        } catch (e) {
          return {};
        }
        if (!data || !data.nick) return {};
        const nick = String(data.nick);
        return { key: nick, nick, msg: data.msg != null ? String(data.msg) : "" };
      }
    },
    chat: {
      container: () => document.querySelector("#chat-room__list"),
      rows: () => document.querySelectorAll("#chat-room__list > div[data-cmid]"),
      rowId: (row) => row.getAttribute("data-cmid"),
      parseRow(row) {
        const nameEl = row.querySelector(".name.J_userMenu") || row.querySelector(".name");
        if (!nameEl) return null;
        const nick = nameEl.textContent.trim();
        if (!nick) return null;
        const consumeEl = row.querySelector('[class*="ConsumeLevelBadge"] span');
        const consume = consumeEl ? consumeEl.textContent.trim() : "";
        const { badgeName, badgeLevel } = parseBadge(row);
        return { key: nick, nick, consume, badgeName, badgeLevel, msg: messageText(row) };
      }
    },
    panel: {
      switchClasses: {
        row: "danmu-switch-set",
        btn: "danmu-switch-btn",
        quan: "danmu-switch-quan",
        on: "danmu-switch-btn-show",
        off: "danmu-switch-btn-hide"
      },
      // 内嵌到原生弹幕设置弹层。弹层高度写死且原生行绝对定位:把弹层顶开到
      // (原生高度 + 本分区高度),让深色背景覆盖到本分区。
      mount(sec) {
        const pane = document.querySelector(".player-danmu-pane");
        if (!pane) return false;
        if (!pane.contains(sec)) pane.appendChild(sec);
        pane.classList.add("de-has-sec");
        const baseH = parseInt(pane.style.height) || 277;
        pane.style.setProperty("--de-base", baseH + "px");
        const extra = sec.offsetParent ? sec.offsetHeight + 8 : 340;
        pane.style.setProperty("--de-ph", baseH + extra + "px");
        return true;
      }
    },
    // 面板挂进原生弹层的定位(通用控件样式在 core styles)。padding 左24/右22 与原生行左右边缘对齐。
    styles: ".player-danmu-pane.de-has-sec{height:var(--de-ph,440px)!important;}.player-danmu-pane #de-panel{position:absolute;left:0;right:0;top:var(--de-base,277px);padding:2px 22px 10px 24px;}"
  };

  // src/entries/huya.js
  if (huya.match()) {
    createEngine(huya).start();
  }
})();
