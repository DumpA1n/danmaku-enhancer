# danmaku-enhancer

多平台直播弹幕增强用户脚本(Tampermonkey)合集。平台无关的渲染逻辑集中在 `src/core`,
每个平台只写一层薄适配(选择器 / 字段提取 / DOM 挂载点),用 esbuild 打包成每平台一个
单文件 `.user.js`。

## 支持平台

| 平台 | 状态 | 产出 |
|------|------|------|
| 虎牙 huya | 可用 | `dist/danmaku-enhancer.huya.user.js` |
| 斗鱼 / B站直播 | 规划中 | 新增 `src/platforms/<id>.js` + `src/entries/<id>.js` 即可 |

## 两种弹幕形态

- **飘屏弹幕增强**:在视频飘屏弹幕前拼「粉丝牌(名称+等级)+ 消费等级 + 发送者昵称」。
  粉丝牌/消费按等级分色,昵称带描边保证在画面上清晰。
- **Twitch 式固定聊天区**:把聊天消息聚合到播放器一角的独立滚动列(而非飘在画面上),
  自动滚动、hover 暂停、限制最大条数。可在设置里切换「飘屏 / 固定区 / 两者」。

两种形态与设置面板都内嵌在站点原生弹幕设置弹层里,无独立浮窗。

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/)。
2. 构建(见下)或直接取用 `dist/` 下对应平台的 `.user.js`。
3. 把该 `.user.js` 拖入 Tampermonkey,或新建脚本粘贴其内容。
4. 打开对应直播间,在原生「弹幕设置」弹层底部即可看到增强设置分区。

## 开发

```bash
npm install
npm run build      # 打包所有平台到 dist/
npm run watch      # 监听源码变更增量构建
```

`watch` 期间可让 Tampermonkey 指向 `dist/*.user.js`(本地文件),改代码即时生效。

## 目录结构

```
src/
├─ core/            # 平台无关
│  ├─ index.js      # createEngine(platform):观察器 + rAF 刷新 + 编排
│  ├─ config.js     # 配置默认值 + 设置面板声明式布局
│  ├─ store.js      # localStorage(带平台前缀 key + 旧 key 迁移)
│  ├─ chat-map.js   # 关联键 -> 用户信息 的 LRU 映射
│  ├─ prefix.js     # 飘屏弹幕前缀(粉丝牌/消费/昵称)
│  ├─ fixed-chat.js # Twitch 式固定聊天区
│  ├─ panel.js      # 由 schema 生成设置面板
│  ├─ pill.js       # 粉丝牌/消费胶囊
│  ├─ colors.js     # 默认调色板
│  └─ styles.js     # 通用样式
├─ platforms/<id>.js  # 平台适配器
└─ entries/<id>.js    # 入口:createEngine(平台).start()
platforms.config.js    # 各平台产出清单(名称/版本/@match/@grant)
build.mjs              # esbuild 构建 + 生成 ==UserScript== 头
```

## 新增一个平台

在 `src/platforms/<id>.js` 实现下述适配器,并在 `src/entries/<id>.js` 里
`createEngine(平台).start()`,最后到 `platforms.config.js` 补一条产出清单。core 负责全部流程。

```js
export const platform = {
  id: '<id>',
  legacyKey: '<迁移前的旧 localStorage key,可选>',
  match: () => /* 当前站点是否为本平台 */,
  overlayHost: () => /* 固定聊天区叠加到的播放器容器 */,
  colors: { /* 可选:覆盖 core 默认调色板 badge(level)/consume(level) */ },
  danmu: {
    container: () => /* 要 observe 的飘屏弹幕容器 */,
    items: () => /* 飘屏弹幕节点集合 */,
    safePrefixTag: 'i',          // 防节点池复用重写 <span> 的安全标签
    readItem: (el) => ({ key, nick, msg }),  // key 是与聊天区关联的键
  },
  chat: {
    container: () => /* 要 observe 的聊天区列表 */,
    rows: () => /* 聊天行集合 */,
    rowId: (row) => /* 去重用的稳定 id */,
    parseRow: (row) => ({ key, nick, consume, badgeName, badgeLevel, msg }) /* 或 null */,
  },
  panel: {
    switchClasses: { row, btn, quan, on, off },  // 复用站点原生开关类名
    mount: (sectionEl) => /* 把设置分区挂进站点原生弹层 */,
  },
  styles: '/* 平台专属 CSS(如面板定位),可选 */',
};
```

关联键 `key` 由平台在 `chat.parseRow` 与 `danmu.readItem` 两端各自返回,core 只做
`chatMap.get(item.key)`。若平台聊天行不暴露 uid(如虎牙),用昵称作 key;两端都有 uid 时用 uid。

## 配置

持久化在 `localStorage`,key 为 `danmaku-enhancer:<platformId>`。若存在平台迁移前的旧 key,
首次加载会一次性导入,之后以新 key 为准。
