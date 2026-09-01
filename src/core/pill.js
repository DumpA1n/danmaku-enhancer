// 粉丝牌/消费等级胶囊。飘屏弹幕注入时 tag 用平台声明的安全标签(见 prefix.js),
// 固定聊天区是我们自己的 DOM,用默认 span 即可。底色由调用方按等级传入。

export function pill(bg, text, { tag = 'span', cls = '' } = {}) {
  const el = document.createElement(tag);
  el.className = 'de-pill' + (cls ? ' ' + cls : '');
  el.style.backgroundColor = bg;
  el.textContent = text;
  return el;
}

function level(v) {
  return v ? parseInt(v, 10) || 0 : 0;
}

// 依配置和阈值,把粉丝牌/消费胶囊追加进 container。返回是否追加了任何内容。
export function appendBadges(container, info, cfg, colors, tag) {
  let any = false;
  if (info) {
    const bl = level(info.badgeLevel);
    if (cfg.showBadge && info.badgeName && bl >= cfg.minBadgeLevel) {
      container.appendChild(
        pill(colors.badge(bl), info.badgeName + (info.badgeLevel ? ' ' + info.badgeLevel : ''), {
          tag,
          cls: 'de-b',
        })
      );
      any = true;
    }
    const cl = level(info.consume);
    if (cfg.showConsume && info.consume && cl >= cfg.minConsume) {
      container.appendChild(pill(colors.consume(cl), info.consume, { tag, cls: 'de-c' }));
      any = true;
    }
  }
  return any;
}
