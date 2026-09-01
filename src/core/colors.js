// 默认调色板,平台可通过 platform.colors 覆盖。

// 粉丝牌按等级分色:≤30 取自虎牙原生粉丝牌底图像素采样;>30 为近似延伸(原生高档为渐变/彩色)。
export function badgeColor(level) {
  const lv = parseInt(level, 10) || 0;
  if (lv >= 36) return '#ffbf3a'; // 近似金
  if (lv >= 31) return '#ff2a1a'; // 近似亮红
  if (lv >= 30) return '#ff4f04'; // 红
  if (lv >= 27) return '#f77d04'; // 橙
  if (lv >= 24) return '#8b44ff'; // 紫
  if (lv >= 21) return '#c34aff'; // 品红
  if (lv >= 18) return '#c02d5d'; // 玫红
  if (lv >= 14) return '#5d6be5'; // 靛蓝
  if (lv >= 6) return '#0078c1'; // 蓝
  return '#008c76'; // 墨绿(1-5)
}

// 消费等级配色:原生用运行时生成的 blob 图无法采样,此处按档位近似(紫→洋红→金)。
export function consumeColor(level) {
  const lv = parseInt(level, 10) || 0;
  if (lv >= 40) return '#f5a623';
  if (lv >= 30) return '#e0559b';
  if (lv >= 20) return '#9b59e6';
  return '#7c4dff';
}
