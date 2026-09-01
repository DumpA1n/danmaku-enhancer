import { pill, appendBadges } from './pill.js';

const SEPARATOR = '：';

// 在飘屏弹幕节点前插入「粉丝牌+消费+昵称」前缀。
//
// 关键约束:前缀元素必须用平台声明的安全标签(虎牙用 <i>),不能用 <span>——虎牙用节点池
// 复用 .danmu-item,复用时会把节点内所有 <span> 的文本重写成新消息,前缀若用 span 会被
// 覆盖成消息本身(显示成「消息 消息」)。
//
// 用签名做去抖:配置版本 + 昵称 + 展示中的粉丝牌/消费/昵称组合不变时,不重建 DOM。
export function renderPrefix(host, nick, info, cfg, colors, cfgVer, tag) {
  let pre = host.querySelector('.de-pre');
  if (!nick) {
    if (pre) pre.remove();
    return;
  }

  const bl = info && info.badgeLevel ? parseInt(info.badgeLevel, 10) || 0 : 0;
  const cl = info && info.consume ? parseInt(info.consume, 10) || 0 : 0;
  const showB = cfg.showBadge && info && info.badgeName && bl >= cfg.minBadgeLevel;
  const showC = cfg.showConsume && info && info.consume && cl >= cfg.minConsume;
  const showN = !!cfg.showNick;
  const sig = [cfgVer, nick, showB ? info.badgeName + bl : '', showC ? cl : '', showN ? 1 : 0].join('|');

  if (!pre) {
    pre = document.createElement(tag);
    pre.className = 'de-pre';
    host.insertBefore(pre, host.firstChild);
  } else if (pre.__sig === sig) {
    return;
  }
  pre.__sig = sig;
  pre.textContent = '';

  appendBadges(pre, info, cfg, colors, tag);
  if (showN) {
    const n = document.createElement(tag);
    n.className = 'de-nick';
    n.textContent = nick + SEPARATOR;
    pre.appendChild(n);
  }
  if (!pre.childNodes.length) pre.remove(); // 全被过滤则不留空节点
}
