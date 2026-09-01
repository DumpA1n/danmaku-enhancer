// 平台无关的样式:飘屏前缀胶囊、固定聊天区、设置面板控件。
// 平台专属样式(如把面板挂进站点弹层的定位 hack)由平台自带的 styles 追加。

// 与弹幕正文相同的四向深色描边,保证昵称在视频上清晰可读。
const NICK_STROKE = '1px 0 1px #222,0 1px 1px #222,0 -1px 1px #222,-1px 0 1px #222';

export const CORE_CSS = `
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
