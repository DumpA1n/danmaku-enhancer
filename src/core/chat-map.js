// 关联键 -> 用户信息 的累积映射(超上限按最久未更新淘汰,LRU)。
// 关联键由平台给出:虎牙飘屏弹幕不带 uid,只能按昵称匹配,故 key=nick;
// 其它平台若两端都暴露 uid,可用 key=uid。

export function createChatMap(max = 2000) {
  const map = new Map();
  return {
    set(key, info) {
      if (map.has(key)) map.delete(key);
      map.set(key, info);
      if (map.size > max) map.delete(map.keys().next().value);
    },
    get(key) {
      return map.get(key);
    },
  };
}
