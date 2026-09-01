// 运行时配置的默认值,以及设置面板的声明式布局。
// 面板由 buildPanel(PANEL_SCHEMA, ...) 生成,新增控件只需在此追加一项。

export const DEFAULTS = {
  // 飘屏弹幕前缀
  showNick: true,
  showBadge: true,
  showConsume: true,
  dedup: false,
  opacity: 1,
  minBadgeLevel: 0,
  minConsume: 0,
  // 弹幕形态:float=仅飘屏 / fixed=仅固定聊天区 / both=两者
  renderMode: 'float',
  // 固定聊天区
  fixedCorner: 'right-top',
  fixedWidth: 300,
  fixedOpacity: 0.9,
  fixedFontSize: 13,
  fixedMax: 80,
};

const pct = (v) => Math.round(v * 100) + '%';

export const PANEL_SCHEMA = [
  { type: 'title', text: '弹幕昵称增强' },
  { type: 'switch', key: 'showNick', label: '显示昵称' },
  { type: 'switch', key: 'showBadge', label: '粉丝牌' },
  { type: 'switch', key: 'showConsume', label: '消费等级' },
  { type: 'switch', key: 'dedup', label: '合并重复弹幕' },
  { type: 'slider', key: 'opacity', label: '前缀不透明度', min: 0.3, max: 1, step: 0.05, fmt: pct },
  {
    type: 'numbers',
    fields: [
      { key: 'minBadgeLevel', label: '粉丝牌≥' },
      { key: 'minConsume', label: '消费≥' },
    ],
  },
  { type: 'title', text: '固定聊天区' },
  {
    type: 'select',
    key: 'renderMode',
    label: '弹幕模式',
    options: [
      { value: 'float', label: '飘屏' },
      { value: 'fixed', label: '固定区' },
      { value: 'both', label: '两者' },
    ],
  },
  {
    type: 'select',
    key: 'fixedCorner',
    label: '位置',
    options: [
      { value: 'left-top', label: '左上' },
      { value: 'right-top', label: '右上' },
      { value: 'left-bottom', label: '左下' },
      { value: 'right-bottom', label: '右下' },
    ],
  },
  { type: 'slider', key: 'fixedWidth', label: '宽度', min: 220, max: 520, step: 10, fmt: (v) => v + 'px' },
  { type: 'slider', key: 'fixedOpacity', label: '不透明度', min: 0.3, max: 1, step: 0.05, fmt: pct },
  { type: 'slider', key: 'fixedFontSize', label: '字号', min: 11, max: 18, step: 1, fmt: (v) => v + 'px' },
  {
    type: 'numbers',
    fields: [{ key: 'fixedMax', label: '最大条数' }],
  },
];
