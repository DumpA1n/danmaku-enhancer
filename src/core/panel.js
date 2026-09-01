// 由 PANEL_SCHEMA 生成设置面板 DOM。开关复用平台提供的原生类名(switchClasses),
// 从而与站点弹层观感一致;平台负责把返回的 section 挂到合适的位置。

function stop(e) {
  e.stopPropagation();
}

function switchRow(item, cfg, sc, onChange) {
  const row = document.createElement('div');
  row.className = (sc.row || '') + ' de-sw';
  const i = document.createElement('i');
  i.textContent = item.label;
  const btn = document.createElement('div');
  btn.className = sc.btn || 'de-btn';
  const quan = document.createElement('div');
  quan.className = sc.quan || 'de-quan';
  btn.appendChild(quan);
  // 复用原生两态类:开启态/关闭态都要切,否则关闭态无底色不可见。de-on 兜底(平台无原生类时)。
  const sync = () => {
    const on = !!cfg[item.key];
    if (sc.on) btn.classList.toggle(sc.on, on);
    if (sc.off) btn.classList.toggle(sc.off, !on);
    btn.classList.toggle('de-on', on);
  };
  sync();
  row.append(i, btn);
  row.addEventListener('click', () => {
    cfg[item.key] = !cfg[item.key];
    sync();
    onChange();
  });
  return row;
}

function sliderRow(item, cfg, onChange) {
  const row = document.createElement('div');
  row.className = 'de-slider';
  const label = document.createElement('span');
  label.textContent = item.label;
  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(item.min);
  range.max = String(item.max);
  range.step = String(item.step);
  range.value = String(cfg[item.key]);
  const val = document.createElement('span');
  val.className = 'de-slider-val';
  const fmt = item.fmt || ((v) => String(v));
  val.textContent = fmt(cfg[item.key]);
  range.addEventListener('input', () => {
    cfg[item.key] = Number(range.value);
    val.textContent = fmt(cfg[item.key]);
    onChange();
  });
  range.addEventListener('click', stop);
  row.append(label, range, val);
  return row;
}

function numbersRow(item, cfg, onChange) {
  const row = document.createElement('div');
  row.className = 'de-nums';
  for (const f of item.fields) {
    const span = document.createElement('span');
    span.textContent = f.label;
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.min = '0';
    inp.value = String(cfg[f.key]);
    inp.addEventListener('change', () => {
      cfg[f.key] = Number(inp.value) || 0;
      onChange();
    });
    inp.addEventListener('click', stop);
    row.append(span, inp);
  }
  return row;
}

function selectRow(item, cfg, onChange) {
  const row = document.createElement('div');
  row.className = 'de-select';
  const label = document.createElement('span');
  label.textContent = item.label;
  const sel = document.createElement('select');
  for (const o of item.options) {
    const opt = document.createElement('option');
    opt.value = o.value;
    opt.textContent = o.label;
    sel.appendChild(opt);
  }
  sel.value = cfg[item.key];
  sel.addEventListener('change', () => {
    cfg[item.key] = sel.value;
    onChange();
  });
  sel.addEventListener('click', stop);
  row.append(label, sel);
  return row;
}

export function buildPanel(schema, cfg, switchClasses, onChange) {
  const sec = document.createElement('div');
  sec.id = 'de-panel';
  const sc = switchClasses || {};
  for (const item of schema) {
    if (item.type === 'title') {
      const div = document.createElement('div');
      div.className = 'de-divider';
      const t = document.createElement('div');
      t.className = 'de-ptitle';
      t.textContent = item.text;
      sec.append(div, t);
    } else if (item.type === 'switch') {
      sec.appendChild(switchRow(item, cfg, sc, onChange));
    } else if (item.type === 'slider') {
      sec.appendChild(sliderRow(item, cfg, onChange));
    } else if (item.type === 'numbers') {
      sec.appendChild(numbersRow(item, cfg, onChange));
    } else if (item.type === 'select') {
      sec.appendChild(selectRow(item, cfg, onChange));
    }
  }
  return sec;
}
