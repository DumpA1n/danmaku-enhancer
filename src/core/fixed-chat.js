import { pill, appendBadges } from './pill.js';

// Twitch 式固定聊天区:在播放器一角叠加一条滚动列,消费与飘屏弹幕相同的聊天解析事件流。
// 挂进 platform.overlayHost() 返回的播放器容器内,以便全屏/影院模式下一并生效。
//
// 交互:自动滚到底;hover 暂停自动滚动(便于回看),移出后回到底部;超过上限按 FIFO 出栈。
export function createFixedChat(platform, getCfg, colors) {
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
    wrap = document.createElement('div');
    wrap.className = 'de-fixed';
    list = document.createElement('div');
    list.className = 'de-fixed-list';
    wrap.appendChild(list);
    list.addEventListener('mouseenter', () => {
      paused = true;
    });
    list.addEventListener('mouseleave', () => {
      paused = false;
      scrollBottom();
    });
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(wrap);
    apply();
    return true;
  }

  // 追加一条聊天记录。float 模式下不显示固定聊天区,直接跳过。
  function push(info) {
    const cfg = getCfg();
    if (cfg.renderMode === 'float') return;
    if (!ensure()) return;

    const line = document.createElement('div');
    line.className = 'de-line';
    appendBadges(line, info, cfg, colors, 'span');
    if (cfg.showNick) {
      const nk = document.createElement('span');
      nk.className = 'de-fixed-nick';
      nk.textContent = info.nick || '';
      line.appendChild(nk);
    }
    const msg = document.createElement('span');
    msg.className = 'de-fixed-msg';
    msg.textContent = info.msg || '';
    line.appendChild(msg);

    list.appendChild(line);
    const max = cfg.fixedMax || 80;
    while (list.childElementCount > max) list.removeChild(list.firstChild);
    if (!paused) scrollBottom();
  }

  // 应用外观与显隐(宽度/不透明度/字号/位置/模式),配置变更时由引擎调用。
  function apply() {
    if (!wrap) {
      ensure();
      return;
    }
    const cfg = getCfg();
    wrap.style.setProperty('--de-fx-w', (cfg.fixedWidth || 300) + 'px');
    wrap.style.setProperty('--de-fx-op', cfg.fixedOpacity != null ? cfg.fixedOpacity : 0.9);
    wrap.style.setProperty('--de-fx-fs', (cfg.fixedFontSize || 13) + 'px');
    wrap.className = 'de-fixed de-fx-' + (cfg.fixedCorner || 'right-top');
    wrap.style.display = cfg.renderMode === 'float' ? 'none' : '';
  }

  return { push, apply, ensure };
}
