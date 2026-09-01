// 虎牙平台适配器。选择器/字段提取/DOM 钩子集中在此,core 负责全部流程。

function pageWin() {
  return typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
}

// 聊天区消息正文:虎牙不同消息类型的 DOM 结构不一,消息元素类名也不固定。
// 采用「克隆行 → 移除已知元数据(昵称/粉丝牌/消费/图标/图片) → 取剩余文本」的方式,
// 对结构变化更稳,不依赖某个具体的消息 class。
function messageText(row) {
  const clone = row.cloneNode(true);
  clone
    .querySelectorAll(
      '.name, .J_CustomFansBadge, .fans-icon, [class*="ConsumeLevelBadge"], [class*="Badge"], [class*="Noble"], [class*="noble"], [class*="icon"], img'
    )
    .forEach((n) => n.remove());
  return clone.textContent.replace(/\s+/g, ' ').replace(/^[：:]\s*/, '').trim();
}

// 虎牙聊天区粉丝牌有两种 DOM 结构:
//  1) .J_CustomFansBadge —— 名称在 <i>,等级在 Lv 图文件名(如 3_27.png)
//  2) .fans-icon         —— 名称是元素的直接文本节点,等级在 fans-icon-N 类名(如 fans-icon-11)
function parseBadge(row) {
  const custom = row.querySelector('.J_CustomFansBadge');
  if (custom) {
    const name = (custom.querySelector('i')?.textContent || '').trim();
    const lv = custom.querySelector('img[class*="Lv"]');
    const m = lv && lv.src.match(/_(\d+)\.png(?:\?|$)/);
    return { badgeName: name, badgeLevel: m ? m[1] : '' };
  }
  const simple = row.querySelector('.fans-icon');
  if (simple) {
    const name = [...simple.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join('')
      .trim();
    const m = simple.className.match(/fans-icon-(\d+)(?:\s|$)/);
    return { badgeName: name, badgeLevel: m ? m[1] : '' };
  }
  return { badgeName: '', badgeLevel: '' };
}

export const huya = {
  id: 'huya',
  legacyKey: 'hy-danmu-nick-cfg',
  match: () => /(^|\.)huya\.com$/.test(location.hostname),

  // 播放器容器(飘屏弹幕层的祖先),固定聊天区叠加于此,随全屏/影院模式生效。
  overlayHost: () => document.querySelector('#player-video'),

  danmu: {
    container: () => document.querySelector('#danmudiv'),
    items: () => document.querySelectorAll('#danmudiv .danmu-item'),
    safePrefixTag: 'i', // 防节点池复用时 <span> 文本被重写覆盖
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
      return { key: nick, nick, msg: data.msg != null ? String(data.msg) : '' };
    },
  },

  chat: {
    container: () => document.querySelector('#chat-room__list'),
    rows: () => document.querySelectorAll('#chat-room__list > div[data-cmid]'),
    rowId: (row) => row.getAttribute('data-cmid'),
    parseRow(row) {
      const nameEl = row.querySelector('.name.J_userMenu') || row.querySelector('.name');
      if (!nameEl) return null; // 系统消息/进场提示等没有 .name
      const nick = nameEl.textContent.trim();
      if (!nick) return null;
      const consumeEl = row.querySelector('[class*="ConsumeLevelBadge"] span');
      const consume = consumeEl ? consumeEl.textContent.trim() : '';
      const { badgeName, badgeLevel } = parseBadge(row);
      return { key: nick, nick, consume, badgeName, badgeLevel, msg: messageText(row) };
    },
  },

  panel: {
    switchClasses: {
      row: 'danmu-switch-set',
      btn: 'danmu-switch-btn',
      quan: 'danmu-switch-quan',
      on: 'danmu-switch-btn-show',
      off: 'danmu-switch-btn-hide',
    },
    // 内嵌到原生弹幕设置弹层。弹层高度写死且原生行绝对定位:把弹层顶开到
    // (原生高度 + 本分区高度),让深色背景覆盖到本分区。
    mount(sec) {
      const pane = document.querySelector('.player-danmu-pane');
      if (!pane) return false;
      if (!pane.contains(sec)) pane.appendChild(sec);
      pane.classList.add('de-has-sec');
      const baseH = parseInt(pane.style.height) || 277;
      pane.style.setProperty('--de-base', baseH + 'px');
      const extra = sec.offsetParent ? sec.offsetHeight + 8 : 340;
      pane.style.setProperty('--de-ph', baseH + extra + 'px');
      return true;
    },
    // 切到浮窗模式时还原原生弹层(分区节点由浮窗接管,此处只需撤掉顶高)。
    unmount() {
      const pane = document.querySelector('.player-danmu-pane');
      if (!pane) return;
      pane.classList.remove('de-has-sec');
      pane.style.removeProperty('--de-ph');
      pane.style.removeProperty('--de-base');
    },
  },

  // 面板挂进原生弹层的定位(通用控件样式在 core styles)。padding 左24/右22 与原生行左右边缘对齐。
  styles:
    '.player-danmu-pane.de-has-sec{height:var(--de-ph,440px)!important;}' +
    '.player-danmu-pane #de-panel{position:absolute;left:0;right:0;top:var(--de-base,277px);padding:2px 22px 10px 24px;}',
};
