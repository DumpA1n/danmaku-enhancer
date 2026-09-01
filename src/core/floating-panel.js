// 独立可拖动控制面板(平台无关)。承载与内嵌模式相同的 #de-panel 分区,
// 但挂在页面上而非站点原生弹层,方便多平台复用。
//
// 不遮挡界面:默认收起,只留一条可拖动的小标题条;展开后是定宽浮窗,固定定位、
// 仅占自身区域、可拖到任意角落,位置与展开状态持久化。全屏时自动重挂到全屏元素内。

const DRAG_THRESHOLD = 3;

export function createFloatingPanel({ getCfg, save }) {
  let wrap = null;
  let body = null;
  let toggle = null;

  function setCollapsed(collapsed, persist) {
    wrap.classList.toggle('de-float-collapsed', collapsed);
    toggle.textContent = collapsed ? '▸' : '▾';
    if (persist) {
      getCfg().panelOpen = !collapsed;
      save();
    }
  }

  function clamp(el, x, y) {
    const maxX = Math.max(0, window.innerWidth - el.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - el.offsetHeight);
    return [Math.max(0, Math.min(x, maxX)), Math.max(0, Math.min(y, maxY))];
  }

  function makeDraggable(handle, el) {
    let sx = 0, sy = 0, ox = 0, oy = 0, dragging = false, moved = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.de-float-toggle')) return;
      dragging = true;
      moved = false;
      const r = el.getBoundingClientRect();
      ox = r.left;
      oy = r.top;
      sx = e.clientX;
      sy = e.clientY;
      el.style.right = 'auto';
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) moved = true;
      const [nx, ny] = clamp(el, ox + dx, oy + dy);
      el.style.left = nx + 'px';
      el.style.top = ny + 'px';
    });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch (err) {}
      if (!moved) return;
      const cfg = getCfg();
      cfg.panelX = parseInt(el.style.left, 10) || 0;
      cfg.panelY = parseInt(el.style.top, 10) || 0;
      save();
    };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  function build() {
    wrap = document.createElement('div');
    wrap.className = 'de-float';
    const bar = document.createElement('div');
    bar.className = 'de-float-bar';
    const title = document.createElement('span');
    title.className = 'de-float-title';
    title.textContent = '弹幕增强';
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'de-float-toggle';
    bar.append(title, toggle);
    body = document.createElement('div');
    body.className = 'de-float-body';
    wrap.append(bar, body);
    (document.fullscreenElement || document.body).appendChild(wrap);

    makeDraggable(bar, wrap);
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      setCollapsed(!wrap.classList.contains('de-float-collapsed'), true);
    });
    document.addEventListener('fullscreenchange', () => {
      const target = document.fullscreenElement || document.body;
      if (wrap && wrap.parentElement !== target) target.appendChild(wrap);
    });

    const cfg = getCfg();
    if (typeof cfg.panelX === 'number' && typeof cfg.panelY === 'number') {
      const [nx, ny] = clamp(wrap, cfg.panelX, cfg.panelY);
      wrap.style.left = nx + 'px';
      wrap.style.top = ny + 'px';
      wrap.style.right = 'auto';
    }
    setCollapsed(!cfg.panelOpen, false);
  }

  // 把 #de-panel 分区放进浮窗并显示。
  function mount(sectionEl) {
    if (!wrap) build();
    if (sectionEl.parentElement !== body) body.appendChild(sectionEl);
    wrap.style.display = '';
  }

  function hide() {
    if (wrap) wrap.style.display = 'none';
  }

  return { mount, hide };
}
