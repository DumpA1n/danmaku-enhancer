// 各平台产出清单:构建脚本按此生成 ==UserScript== 头并把入口打包成单文件 .user.js。
// 版本号统一在此维护(build.mjs 生成头部,dist 输出 danmaku-enhancer.<id>.user.js)。

export const platforms = [
  {
    id: 'huya',
    entry: 'src/entries/huya.js',
    meta: {
      name: '虎牙弹幕增强(昵称+粉丝牌+消费等级 / 固定聊天区)',
      namespace: 'https://github.com/local/danmaku-enhancer',
      version: '2.0.0',
      description:
        '虎牙飘屏弹幕前缀(粉丝牌+消费等级+昵称)与 Twitch 式固定聊天区;设置面板内嵌原生弹幕设置弹层',
      author: 'you',
      match: ['https://www.huya.com/*'],
      grant: ['unsafeWindow'],
      'run-at': 'document-idle',
    },
  },
];
