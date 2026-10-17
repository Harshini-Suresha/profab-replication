/* ---------- tiny DOM / SVG helpers ---------- */
const SVGNS = "http://www.w3.org/2000/svg";
function applyProps(node, props) {
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") node.setAttribute("class", v);
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? "" : v);
  }
}
function addKids(node, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
function h(tag, props, ...kids) { const n = document.createElement(tag); applyProps(n, props); addKids(n, kids); return n; }
function s(tag, props, ...kids) { const n = document.createElementNS(SVGNS, tag); applyProps(n, props); addKids(n, kids); return n; }
const f1 = (x) => (x == null || isNaN(x) ? "–" : x.toFixed(1));
const f2 = (x) => (x == null || isNaN(x) ? "–" : x.toFixed(2));
const f3 = (x) => (x == null || isNaN(x) ? "–" : x.toFixed(3));
const pct = (x, d = 0) => (x == null || isNaN(x) ? "–" : (100 * x).toFixed(d) + "%");
const sgn = (x, d = 3) => { if (x == null || isNaN(x)) return "–"; const t = Math.abs(x).toFixed(d); return (+t === 0 ? "" : x >= 0 ? "+" : "−") + t; };
const mean = (a) => a.reduce((p, c) => p + c, 0) / a.length;
const median = (a) => { const b = [...a].sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
const quantile = (a, q) => { const b = [...a].sort((x, y) => x - y), p = (b.length - 1) * q, i = Math.floor(p); return b[i] + (b[Math.min(i + 1, b.length - 1)] - b[i]) * (p - i); };
const uniq = (a) => [...new Set(a)];

/* ---------- labels ---------- */
const SPLIT_LABEL = { random: "Random", target: "Similarity-aware", temporal: "Temporal" };
const SPLIT_COLOR = { random: "var(--s1)", target: "var(--s2)", temporal: "var(--s3)" };
const SPLITS = ["random", "target", "temporal"];
const FEATS = ["aac", "paac", "gaac", "ctdt", "socnumber", "ctriad", "kpssm"];
const MODELS = ["logreg", "svm", "knn", "rf", "hgb", "nb", "mlp"];
const FEAT_LABEL = { aac: "AAC", paac: "PAAC", gaac: "GAAC", ctdt: "CTD-T", socnumber: "SOC number", ctriad: "Conjoint triad", kpssm: "k-sep. bigram PSSM" };
const FEAT_SHORT = { aac: "AAC", paac: "PAAC", gaac: "GAAC", ctdt: "CTD-T", socnumber: "SOCN", ctriad: "C-triad", kpssm: "kPSSM" };
const MODEL_LABEL = { logreg: "Logistic regression", svm: "SVM (RBF)", knn: "k-NN", rf: "Random forest", hgb: "Gradient boosting", nb: "Gaussian NB", mlp: "MLP", nn1: "1-NN lookup" };
const MODEL_SHORT = { logreg: "LogReg", svm: "SVM", knn: "k-NN", rf: "RF", hgb: "HGB", nb: "NB", mlp: "MLP", nn1: "1-NN" };
const METRIC_LABEL = { mcc: "MCC", auroc: "AUROC", auprc: "AUPRC", accuracy: "Accuracy" };
const TASK_ORDER = ["GO_0000018", "GO_1905523", "ecNo_1-2-4", "ecNo_1-2-7"];
const taskShort = (t) => (D.tasks[t] ? D.tasks[t].id : t);
const FEAT_COLOR = { aac: "var(--s1)", paac: "var(--s2)", ctriad: "var(--s3)", kpssm: "var(--s4)" };

/* ---------- theme ---------- */
const isDark = () => getComputedStyle(document.documentElement).getPropertyValue("--is-dark").trim() === "1";
const RAMP_LIGHT = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const RAMP_DARK = ["#18253a", "#184f95", "#256abf", "#3987e5", "#6da7ec", "#9ec5f4", "#cde2fb"];
function hex2rgb(x) { return [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)); }
function rampColor(t, dark = isDark()) {
  const st = (dark ? RAMP_DARK : RAMP_LIGHT).map(hex2rgb);
  t = Math.max(0, Math.min(1, t)); const p = t * (st.length - 1), i = Math.min(Math.floor(p), st.length - 2), u = p - i;
  const c = st[i].map((v, k) => Math.round(v + (st[i + 1][k] - v) * u));
  return { css: `rgb(${c[0]},${c[1]},${c[2]})`, lum: (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 };
}

/* ---------- scales ---------- */
function linear(d0, d1, r0, r1) {
  const f = (x) => r0 + ((x - d0) / (d1 - d0 || 1)) * (r1 - r0);
  f.domain = [d0, d1]; f.range = [r0, r1];
  f.invert = (y) => d0 + ((y - r0) / (r1 - r0 || 1)) * (d1 - d0);
  return f;
}
function niceStep(range, n) {
  const raw = range / Math.max(n, 1), mag = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / mag;
  return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
}
function ticks(a, b, n = 5) {
  const step = niceStep(b - a, n), out = []; let v = Math.ceil(a / step - 1e-9) * step;
  for (; v <= b + step * 1e-6; v += step) out.push(+v.toFixed(10));
  return out;
}
function band(keys, r0, r1, pad = 0.2) {
  const step = (r1 - r0) / keys.length, bw = step * (1 - pad);
  const f = (k) => r0 + keys.indexOf(k) * step + (step - bw) / 2;
  f.bw = bw; f.step = step; f.mid = (k) => f(k) + bw / 2; return f;
}

/* ---------- tooltip ---------- */
let tipEl;
function tipShow(html, ev) {
  if (!tipEl) { tipEl = h("div", { id: "tip", role: "tooltip" }); document.body.appendChild(tipEl); }
  tipEl.innerHTML = html; tipEl.classList.add("on");
  const pad = 14, w = tipEl.offsetWidth, hh = tipEl.offsetHeight;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + w > window.innerWidth - 8) x = ev.clientX - w - pad;
  if (y + hh > window.innerHeight - 8) y = ev.clientY - hh - pad;
  tipEl.style.left = Math.max(8, x) + "px"; tipEl.style.top = Math.max(8, y) + "px";
}
function tipHide() { if (tipEl) tipEl.classList.remove("on"); }
function tipOn(node, htmlFn) {
  const show = (e) => tipShow(htmlFn(), e);
  node.addEventListener("pointerenter", show); node.addEventListener("pointermove", show);
  node.addEventListener("pointerleave", tipHide); node.addEventListener("pointerdown", show);
  return node;
}
document.addEventListener("pointerdown", (e) => { if (!e.target.closest || !e.target.closest("svg")) tipHide(); });
const trow = (a, b) => `<div class="row"><span>${a}</span><span>${b}</span></div>`;

/* ---------- axes ---------- */
function axisX(g, sc, y, o = {}) {
  const tk = o.ticks || ticks(...sc.domain, 6), fmt = o.fmt || ((v) => v);
  const ax = s("g", { class: "axis" }); ax.appendChild(s("line", { x1: sc.range[0], x2: sc.range[1], y1: y, y2: y }));
  if (o.grid) { const gg = s("g", { class: "grid" }); tk.forEach((t) => gg.appendChild(s("line", { x1: sc(t), x2: sc(t), y1: o.grid[0], y2: o.grid[1] }))); g.appendChild(gg); }
  tk.forEach((t) => {
    ax.appendChild(s("line", { x1: sc(t), x2: sc(t), y1: y, y2: y + 4 }));
    ax.appendChild(s("text", { x: sc(t), y: y + 16, "text-anchor": "middle", text: fmt(t) }));
  });
  if (o.title) ax.appendChild(s("text", { class: "axis-title", x: (sc.range[0] + sc.range[1]) / 2, y: y + (o.titleDy || 34), "text-anchor": "middle", text: o.title }));
  g.appendChild(ax);
}
function axisY(g, sc, x, o = {}) {
  const tk = o.ticks || ticks(...sc.domain, 5), fmt = o.fmt || ((v) => v);
  const ax = s("g", { class: "axis" }); ax.appendChild(s("line", { x1: x, x2: x, y1: sc.range[0], y2: sc.range[1] }));
  if (o.grid) { const gg = s("g", { class: "grid" }); tk.forEach((t) => gg.appendChild(s("line", { x1: o.grid[0], x2: o.grid[1], y1: sc(t), y2: sc(t) }))); g.appendChild(gg); }
  tk.forEach((t) => {
    ax.appendChild(s("line", { x1: x - 4, x2: x, y1: sc(t), y2: sc(t) }));
    ax.appendChild(s("text", { x: x - 8, y: sc(t) + 3.5, "text-anchor": "end", text: fmt(t) }));
  });
  if (o.title) ax.appendChild(s("text", { class: "axis-title", transform: `translate(${x - (o.titleDx || 38)},${(sc.range[0] + sc.range[1]) / 2}) rotate(-90)`, "text-anchor": "middle", text: o.title }));
  g.appendChild(ax);
}

/* ---------- controls ---------- */
function selectCtl(label, options, value, onChange) {
  const id = "sel" + Math.random().toString(36).slice(2, 8);
  const sel = h("select", { id }, options.map((o) => h("option", { value: o.value, selected: o.value === value }, o.label)));
  sel.addEventListener("change", () => onChange(sel.value));
  return h("label", { for: id }, label, sel);
}
function segCtl(label, options, value, onChange) {
  const wrap = h("span", { class: "seg", role: "group", "aria-label": label });
  const btns = options.map((o) => {
    const b = h("button", { type: "button", "aria-pressed": String(o.value === value) }, o.label);
    b.addEventListener("click", () => { btns.forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); onChange(o.value); });
    wrap.appendChild(b); return b;
  });
  return h("label", { style: "gap:8px" }, label, wrap);
}
function legendEl(items) {
  return h("div", { class: "legend" }, items.map((it) => h("span", {}, h("i", { class: it.line ? "line" : "", style: `background:${it.color}` }), it.label)));
}

/* ---------- figure wrapper ---------- */
const REDRAW = new Set();
function makeFigure(o) {
  const fig = { view: "chart" };
  const chartHost = h("div", { class: "chart" });
  const tableHost = h("div", { hidden: true });
  const legendHost = h("div");
  const ctl = o.controls && o.controls.length ? h("div", { class: "controls" }, o.controls) : null;
  const btnC = h("button", { type: "button", "aria-pressed": "true" }, "Chart");
  const btnT = h("button", { type: "button", "aria-pressed": "false" }, "Table");
  const setView = (v) => { fig.view = v; btnC.setAttribute("aria-pressed", String(v === "chart")); btnT.setAttribute("aria-pressed", String(v === "table")); chartHost.hidden = v !== "chart"; legendHost.hidden = v !== "chart"; tableHost.hidden = v !== "table"; fig.refresh(); };
  btnC.addEventListener("click", () => setView("chart")); btnT.addEventListener("click", () => setView("table"));
  fig.el = h("figure", { class: "fig", id: o.id },
    h("div", { class: "fig-head" }, h("p", { class: "fig-title" }, h("span", { class: "fn" }, o.num), o.title), h("span", { class: "tabs" }, btnC, btnT)),
    ctl, legendHost, chartHost, tableHost, h("figcaption", { html: o.caption }));
  let lastW = 0;
  const draw = () => {
    const W = Math.round(chartHost.getBoundingClientRect().width);
    if (W < 40) return; lastW = W;
    const svg = s("svg", { role: "img", "aria-label": o.title + ". Use the Table view for the underlying numbers." });
    const H = o.draw(svg, W);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("height", H);
    chartHost.replaceChildren(svg);
  };
  fig.refresh = () => {
    if (o.legend) { const l = o.legend(); legendHost.replaceChildren(...(l ? [l] : [])); }
    if (fig.view === "chart") draw();
    else { const t = o.table(); tableHost.replaceChildren(buildTable(t.cols, t.rows, { scroll: true })); }
  };
  REDRAW.add(() => { if (fig.view === "chart") draw(); });
  new ResizeObserver(() => { const W = Math.round(chartHost.getBoundingClientRect().width); if (fig.view === "chart" && Math.abs(W - lastW) > 2) draw(); }).observe(chartHost);
  requestAnimationFrame(fig.refresh);
  return fig;
}
function buildTable(cols, rows, opt = {}) {
  const tbl = h("table", {}, h("thead", {}, h("tr", {}, cols.map((c) => h("th", { class: c.left ? "l" : "" }, c.label)))),
    h("tbody", {}, rows.map((r) => h("tr", {}, cols.map((c) => h("td", { class: c.left ? "l" : "" }, c.fmt ? c.fmt(r[c.k], r) : r[c.k] ?? "–"))))));
  return h("div", { class: "table-wrap", style: opt.scroll ? "max-height:420px;overflow:auto" : "" }, tbl);
}
const redrawAll = () => REDRAW.forEach((f) => f());
