/* ---------- hand-built SVG diagrams ---------- */
function dgWrap(id, title, caption, svg, minW) {
  return h("figure", { class: "fig dg", id }, h("figcaption", { class: "fig-title" }, title), h("div", { class: "dg-scroll" }, h("div", { style: `min-width:${minW || 760}px` }, svg)), h("p", { class: "fig-cap", html: caption }));
}
function dgSvg(w, hgt, ...kids) {
  const defs = s("defs", {}, s("marker", { id: "ar", viewBox: "0 0 10 10", refX: 8.5, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0,1 L9,5 L0,9 z", fill: "var(--ink2)" })),
    s("marker", { id: "arh", viewBox: "0 0 10 10", refX: 8.5, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0,1 L9,5 L0,9 z", fill: "var(--hot)" })));
  return s("svg", { viewBox: `0 0 ${w} ${hgt}`, width: "100%", role: "img", class: "dgsvg" }, defs, ...kids);
}
const dgBox = (x, y, w, hh, t, sub, c = "var(--s1)", o = {}) => s("g", {},
  s("rect", { x, y, width: w, height: hh, rx: 8, fill: o.solid ? c : "var(--surface)", stroke: c, "stroke-width": o.thick || 1.6, "stroke-dasharray": o.dash || null }),
  s("text", { x: x + w / 2, y: y + (sub ? hh / 2 - 3 : hh / 2 + 4), "text-anchor": "middle", class: "dgt", fill: o.solid ? "#fff" : "var(--ink)" }, t),
  sub ? s("text", { x: x + w / 2, y: y + hh / 2 + 13, "text-anchor": "middle", class: "dgs", fill: o.solid ? "#fff" : "var(--muted)" }, sub) : null);
const dgArrow = (d, hot) => s("path", { d, fill: "none", stroke: hot ? "var(--hot)" : "var(--ink2)", "stroke-width": 1.5, "marker-end": hot ? "url(#arh)" : "url(#ar)" });
const dgText = (x, y, t, o = {}) => s("text", { x, y, "text-anchor": o.a || "start", class: o.c || "dgs", fill: o.f || "var(--muted)" }, t);
const dgLane = (x, y, w, hh, label) => s("g", {}, s("rect", { x, y, width: w, height: hh, rx: 10, fill: "var(--wash)", opacity: 0.75 }), dgText(x + 12, y + 18, label.toUpperCase(), { c: "dgl" }));

function diagPipeline() {
  const svg = dgSvg(1040, 520,
    dgLane(10, 10, 1020, 112, "1 · Data"), dgLane(10, 134, 1020, 112, "2 · Benchmark"), dgLane(10, 258, 1020, 250, "3 · Controlled experiments on the pooled proteins"),
    dgBox(30, 44, 170, 62, "ProFAB files", "descriptors, labels, indices", "var(--s1)"),
    dgBox(250, 44, 170, 62, "Audit", "index partition, duplicates", "var(--s4)"),
    dgBox(470, 44, 190, 62, "Accession-keyed loader", "join by UniProt ID", "var(--s3)", { solid: false, thick: 2.4 }),
    dgBox(710, 44, 150, 62, "8 task × split", "random · target · temporal", "var(--s2)"),
    dgBox(900, 44, 110, 62, "kPSSM shift", "found in 18 files", "var(--hot)", { dash: "5 4" }),
    dgBox(30, 168, 190, 62, "7 descriptors", "AAC … kPSSM", "var(--s1)"),
    dgBox(270, 168, 190, 62, "7 classifiers", "LogReg … MLP, 3-fold tuned", "var(--s1)"),
    dgBox(510, 168, 200, 62, "49 configs × 8 splits", "392 runs, test scored once", "var(--s2)"),
    dgBox(760, 168, 250, 62, "MCC · AUROC · AUPRC", "bootstrap 95% intervals (500)", "var(--s3)"),
    dgBox(30, 292, 190, 62, "Pooled proteins", "aligned across descriptors", "var(--s3)"),
    dgBox(270, 292, 200, 62, "Proxy similarity", "mean-centred cosine", "var(--s4)"),
    dgBox(520, 292, 150, 52, "Stratified bins", "Fig. 7", "var(--s2)"), dgBox(520, 352, 150, 52, "Grouped CV", "Fig. 8", "var(--s2)"), dgBox(520, 412, 150, 52, "Pruning + control", "Fig. 9", "var(--s2)"),
    dgBox(730, 300, 270, 56, "Proxy cross-matrix", "grouping space × model descriptor (Fig. 10)", "var(--s1)"),
    dgBox(730, 400, 270, 62, "Inflation = random − grouped", "bootstrapped over task × classifier", "var(--hot)", { thick: 2.4 }),
    dgArrow("M200,75 H250"), dgArrow("M420,75 H470"), dgArrow("M660,75 H710"), dgArrow("M860,75 H900"),
    dgArrow("M585,106 V125 H125 V168"), dgArrow("M220,199 H270"), dgArrow("M460,199 H510"), dgArrow("M710,199 H760"),
    dgArrow("M220,323 H270"), dgArrow("M470,323 H495 V318 H520"), dgArrow("M470,323 H495 V378 H520"), dgArrow("M470,323 H495 V438 H520"),
    dgArrow("M670,368 H700 V340 H730"), dgArrow("M670,378 H700 V428 H730", true), dgArrow("M670,438 H700 V440 H730", true),
    dgArrow("M585,125 H18 V323 H30"));
  return dgWrap("dg-pipeline", "Diagram A · End-to-end study design", "Boxes with a thick border mark the step that fixed the data problem; red arrows are the paths that produce the inflation estimate. The benchmark lane uses only the files ProFAB ships; the controlled lane re-splits the pooled proteins so similarity can be varied on purpose.", svg, 900);
}

function diagAlignment() {
  const rowsA = ["P1", "P2", "P3", "P4", "P5", "P6"], rowsK = ["P2", "P3", "P4", "P5", "P6"];
  const g = [];
  g.push(dgText(40, 28, "AAC file (defines indices)", { c: "dgt", f: "var(--ink)" }), dgText(430, 28, "kPSSM file (first protein missing)", { c: "dgt", f: "var(--ink)" }), dgText(770, 28, "Test index = row 3 (P3)", { c: "dgt", f: "var(--ink)" }));
  rowsA.forEach((r, i) => g.push(dgBox(40, 44 + i * 46, 170, 36, `row ${i} · ${r}`, null, i === 2 ? "var(--s2)" : "var(--s1)", { solid: i === 2 })));
  rowsK.forEach((r, i) => g.push(dgBox(430, 44 + i * 46, 170, 36, `row ${i} · ${r}`, null, i === 3 ? "var(--hot)" : i === 1 ? "var(--s3)" : "var(--s1)", { solid: i === 1 || i === 3 })));
  g.push(dgArrow("M210,153 C300,153 340,153 430,129", false), dgArrow("M210,153 C320,153 340,153 430,199", true));
  g.push(dgText(318, 118, "keyed: P3", { c: "dgs", f: "var(--s3)", a: "middle" }), dgText(318, 190, "positional: P5", { c: "dgs", f: "var(--hot)", a: "middle" }));
  g.push(dgBox(700, 70, 280, 60, "Accession-keyed read", "P3 in both files · features match label", "var(--s3)", { thick: 2.4 }),
    dgBox(700, 160, 280, 60, "Positional read", "row 3 of kPSSM is P5 · neighbour's features", "var(--hot)", { dash: "5 4" }),
    dgBox(700, 250, 280, 52, "Effect on GO:0000018 temporal", "kPSSM MCC 0.37 positional vs 0.63 keyed", "var(--s2)"));
  g.push(dgArrow("M600,129 H700"), dgArrow("M600,199 H700", true), dgArrow("M840,220 V250", true));
  g.push(dgText(40, 330, "Offsets found: −1 in 16 of 18 class-wise files, −2 and −3 in two. Schematic uses one missing row for clarity.", { c: "dgs" }));
  return dgWrap("dg-align", "Diagram B · How a missing first row shifts the labels", "Applying ProFAB’s index lists by position to a descriptor file that lacks the first protein selects each row’s neighbour. The loader resolves indices against the AAC file and joins every other descriptor by accession.", dgSvg(1020, 350, ...g), 820);
}

function diagLeak() {
  const P = (x, y, c, k) => s("circle", { cx: x, cy: y, r: 9, fill: c, stroke: "var(--surface)", "stroke-width": 1.5 });
  const clusters = [[90, 120], [210, 90], [150, 210]];
  function panel(ox, title, sub, assign, edges) {
    const g = [dgBox(ox, 20, 440, 36, title, null, "var(--ink2)"), dgText(ox + 220, 78, sub, { a: "middle" })];
    g.push(s("rect", { x: ox, y: 90, width: 440, height: 250, rx: 10, fill: "var(--surface)", stroke: "var(--rule)" }));
    const pts = [];
    clusters.forEach(([cx, cy], ci) => { for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.283 + ci, r = 26 + (k % 2) * 8; pts.push([cx + ox + 50 + r * Math.cos(a), cy + 20 + r * Math.sin(a), ci, k]); } });
    pts.push([ox + 360, 160, 3, 0], [ox + 390, 230, 3, 1], [ox + 330, 290, 3, 2]);
    edges(pts, g);
    pts.forEach((p) => g.push(P(p[0], p[1], assign(p) ? "var(--s2)" : "var(--s1)")));
    return g;
  }
  const rnd = (p) => (p[3] * 7 + p[2] * 3) % 5 === 0 ;
  const grp = (p) => p[2] === 1 || p[2] === 3 && p[3] === 0;
  const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 46;
  const g1 = panel(10, "Random split", "Relatives land on both sides", rnd, (pts, g) => pts.forEach((a, i) => pts.forEach((b, j) => { if (i < j && near(a, b)) g.push(s("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: rnd(a) !== rnd(b) ? "var(--hot)" : "var(--axis)", "stroke-width": rnd(a) !== rnd(b) ? 1.8 : 0.9 })); })));
  const g2 = panel(500, "Group-aware split", "Single-linkage groups stay on one side", (p) => p[2] === 1 || (p[2] === 3 && p[3] < 2), (pts, g) => pts.forEach((a, i) => pts.forEach((b, j) => { if (i < j && near(a, b)) g.push(s("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: "var(--axis)", "stroke-width": 0.9 })); })));
  const leg = [P(40, 372, "var(--s1)"), dgText(56, 376, "training protein"), P(200, 372, "var(--s2)"), dgText(216, 376, "test protein"), s("line", { x1: 340, y1: 372, x2: 372, y2: 372, stroke: "var(--hot)", "stroke-width": 2 }), dgText(380, 376, "edge: similarity ≥ τ across the split (leakage path)")];
  const note = [dgBox(250, 395, 520, 46, "Score = generalisation + memorised relatives", "grouped folds remove the red edges; pruning removes training ends of them", "var(--hot)", { thick: 2 })];
  return dgWrap("dg-leak", "Diagram C · Where the inflation comes from", "Schematic, not data. Nodes are proteins; an edge joins two proteins whose proxy similarity is at least τ. Random splits cut edges, so test proteins have close training relatives; grouped splits keep each connected component on one side.", dgSvg(960, 455, ...g1, ...g2, ...leg, ...note), 780);
}

function diagMap() {
  const rows = [
    ["Does the split type matter?", "Official splits", "8 task/split sets", "≈ −0.12 MCC similarity-aware", "temporal −0.39 (one task)", "var(--s1)"],
    ["Is it the relatives?", "Stratified bins", "by nearest-neighbour similarity", "SVM error 0.2% → 37%", "top vs bottom similarity bin", "var(--s2)"],
    ["How much is inflation?", "Grouped 5-fold", "τ = 0.95 … 0.70", "AUROC lost up to 0.132", "conjoint triad, τ = 0.70", "var(--hot)"],
    ["Fewer samples or relatives?", "Pruning vs control", "size-matched random removal", "0.059 AUROC gap", "at τ = 0.85", "var(--s3)"],
    ["Is it the proxy?", "Proxy cross-matrix", "two grouping spaces", "−0.075 AUROC under PSSM groups", "PSSM models ignore triad groups", "var(--s4)"],
    ["Can the data be trusted?", "Index audit", "kPSSM alignment", "kPSSM MCC 0.37 → 0.63", "positional vs keyed, temporal", "var(--hot)"],
  ];
  const g = [dgText(30, 24, "QUESTION", { c: "dgl" }), dgText(330, 24, "EXPERIMENT", { c: "dgl" }), dgText(650, 24, "HEADLINE RESULT", { c: "dgl" })];
  rows.forEach((r, i) => { const y = 38 + i * 62; g.push(dgBox(20, y, 270, 48, r[0], null, r[5], { solid: true }), dgBox(320, y, 290, 48, r[1], r[2], r[5]), dgBox(640, y, 380, 48, r[3], r[4], r[5]), dgArrow(`M290,${y + 24} H320`), dgArrow(`M610,${y + 24} H640`)); });
  return dgWrap("dg-map", "Diagram D · Question → experiment → result map", "Each row links a question to the experiment built to answer it and the number it produced. Values are from the runs reported above; the proxy-similarity caveat applies to every row except the first and last.", dgSvg(1040, 420, ...g), 940);
}

function diagrams() {
  return col(P("Twelve diagrams: four schematics of how the study fits together (pipeline, the data fault the audit found, the mechanism of leakage, a question-to-result map) and eight data-driven views (two Sankeys, a chord plot, radar, treemap, parallel coordinates, ridgeline and a similarity network)."), diagPipeline(), diagAlignment(), diagLeak(), diagMap(), diagSankeySplits(), diagSankeyOutcome(), diagChord(), diagRadar(), diagTreemap(), diagParallel(), diagRidge(), diagNetwork());
}

/* ---------- Sankey and chord diagrams (data-driven) ---------- */
function sankey(W, H, cols, links, o = {}) {
  const padY = 26, gap = 14, nodeW = 14, colX = cols.map((_, i) => 20 + i * ((W - 40 - nodeW - (o.right || 120)) / (cols.length - 1)));
  const val = {}; links.forEach((l) => { val[l.s] = (val[l.s] || 0); val[l.t] = (val[l.t] || 0); });
  const out = {}, inn = {}; links.forEach((l) => { out[l.s] = (out[l.s] || 0) + l.v; inn[l.t] = (inn[l.t] || 0) + l.v; });
  const nv = (n) => Math.max(out[n] || 0, inn[n] || 0);
  const kmax = Math.max(...cols.map((c) => c.reduce((a, n) => a + nv(n), 0) + gap * (c.length - 1)));
  const k = (H - padY - 10 - gap * 0) / Math.max(...cols.map((c) => c.reduce((a, n) => a + nv(n), 0))) ; 
  const scale = Math.min(k, (H - padY - 10 - gap * (Math.max(...cols.map((c) => c.length)) - 1)) / Math.max(...cols.map((c) => c.reduce((a, n) => a + nv(n), 0))));
  const pos = {};
  cols.forEach((c, ci) => { const tot = c.reduce((a, n) => a + nv(n) * scale, 0) + gap * (c.length - 1); let y = padY + (H - padY - 10 - tot) / 2; c.forEach((n) => { pos[n] = { x: colX[ci], y, h: nv(n) * scale, so: 0, si: 0 }; y += nv(n) * scale + gap; }); });
  const g = [];
  links.forEach((l) => { const a = pos[l.s], b = pos[l.t], w = l.v * scale, y0 = a.y + a.so, y1 = b.y + b.si; a.so += w; b.si += w; const x0 = a.x + nodeW, x1 = b.x, mx = (x0 + x1) / 2;
    g.push(s("path", { d: `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1} L${x1},${y1 + w} C${mx},${y1 + w} ${mx},${y0 + w} ${x0},${y0 + w} Z`, fill: l.c, opacity: 0.55, class: "sk-link" }, s("title", {}, `${l.s} → ${l.t}: ${l.v.toLocaleString()}`))); });
  cols.forEach((c, ci) => c.forEach((n) => { const p = pos[n]; g.push(s("rect", { x: p.x, y: p.y, width: nodeW, height: Math.max(p.h, 1.5), rx: 2, fill: (o.nodeC && o.nodeC[n]) || "var(--ink2)" }));
    const right = ci === cols.length - 1; g.push(s("text", { x: right ? p.x + nodeW + 8 : (ci === 0 ? p.x + nodeW + 8 : p.x + nodeW + 8), y: p.y + p.h / 2 + 4, class: "dgs", fill: "var(--ink)" }, `${n}  ·  ${nv(n).toLocaleString()}`)); }));
  (o.heads || []).forEach((t, i) => g.push(dgText(colX[i], 16, t.toUpperCase(), { c: "dgl" })));
  return g;
}

function diagSankeySplits() {
  const SP = DG.splits, spC = { random: "var(--s1)", target: "var(--s2)", temporal: "var(--s3)" }, lab = (r) => `${r.task} · ${({ random: "Random", target: "Similarity-aware", temporal: "Temporal" })[r.split]}`;
  const names = SP.map(lab), links = [], nodeC = { Training: "var(--ink2)", Test: "var(--ink2)", Annotated: "var(--s2)", "Not annotated": "var(--s1)" };
  SP.forEach((r, i) => { nodeC[names[i]] = spC[r.split]; links.push({ s: names[i], t: "Training", v: r.train_pos + r.train_neg, c: spC[r.split] }, { s: names[i], t: "Test", v: r.test_pos + r.test_neg, c: spC[r.split] }); });
  const tp = SP.reduce((a, r) => a + r.train_pos, 0), tn = SP.reduce((a, r) => a + r.train_neg, 0), ep = SP.reduce((a, r) => a + r.test_pos, 0), en = SP.reduce((a, r) => a + r.test_neg, 0);
  links.push({ s: "Training", t: "Annotated", v: tp, c: "var(--s2)" }, { s: "Training", t: "Not annotated", v: tn, c: "var(--s1)" }, { s: "Test", t: "Annotated", v: ep, c: "var(--s2)" }, { s: "Test", t: "Not annotated", v: en, c: "var(--s1)" });
  const svg = dgSvg(1000, 470, ...sankey(1000, 470, [names, ["Training", "Test"], ["Annotated", "Not annotated"]], links, { nodeC, right: 170, heads: ["Official split", "Partition", "Class label"] }));
  return dgWrap("dg-sk1", "Diagram E · Sankey of the eight official splits", "Each official task/split sends its proteins into training or test and then into the two classes. Widths are protein counts, so the large GO:0000018 temporal test set stands out against the small similarity-aware test sets. Hover a ribbon for its count.", svg, 820);
}

function diagSankeyOutcome() {
  const O = DG.outcome, spL = { random: "Random", target: "Similarity-aware", temporal: "Temporal" }, spC = { random: "var(--s1)", target: "var(--s2)", temporal: "var(--s3)" };
  const bins = ["< 0.5", "0.5–0.7", "0.7–0.9", "≥ 0.9"], links = [], nodeC = { Correct: "var(--good)", Error: "var(--hot)" };
  const bn = (sp, b) => `${spL[sp]} · ${b}`;
  Object.keys(spL).forEach((sp) => { nodeC[spL[sp]] = spC[sp]; bins.forEach((b) => { const r = O.find((x) => x.split === sp && x.bin === b); if (!r) return; const n = bn(sp, b); nodeC[n] = spC[sp];
    links.push({ s: spL[sp], t: n, v: r.ok + r.err, c: spC[sp] }, { s: n, t: "Correct", v: r.ok, c: "var(--good)" }, { s: n, t: "Error", v: r.err, c: "var(--hot)" }); }); });
  const mid = []; Object.keys(spL).forEach((sp) => bins.forEach((b) => { if (O.find((x) => x.split === sp && x.bin === b)) mid.push(bn(sp, b)); }));
  const svg = dgSvg(1000, 560, ...sankey(1000, 560, [Object.values(spL), mid, ["Correct", "Error"]], links, { nodeC, right: 150, heads: ["Split type", "Nearest training neighbour similarity", "SVM · C-triad outcome"] }));
  return dgWrap("dg-sk2", "Diagram F · Sankey of test proteins by similarity to training and outcome", "All test proteins from every official split are routed by their nearest-training-neighbour similarity (conjoint-triad proxy) and by whether the SVM on conjoint triad classified them correctly. Errors concentrate in the low-similarity bins; in the temporal split, errors stay high even at 0.5–0.9, which this proxy does not explain. Proxy similarity, not sequence identity.", svg, 860);
}

function chordPanel(c, tau) {
  const n = 5, R = 118, r0 = 104, cx = 175, cy = 165, gapA = 0.12, pal = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "#6250d6"];
  const u = c.M.map((row, i) => row.map((v, j) => (i === j ? v / 2 : v)));
  const tot = u.map((row, i) => row.reduce((a, v, j) => a + v, 0) + u[i][i]);
  const T = tot.reduce((a, b) => a + b, 0), avail = 2 * Math.PI - n * gapA;
  const g = [], start = [], end = []; let a = -Math.PI / 2;
  for (let i = 0; i < n; i++) { const span = T ? (tot[i] / T) * avail : avail / n; start[i] = a; end[i] = a + span; a += span + gapA; }
  const P = (r, t) => [cx + r * Math.cos(t), cy + r * Math.sin(t)];
  const cross = c.M.reduce((acc, row, i) => acc + row.reduce((b, v, j) => b + (i < j ? v : 0), 0), 0), within = c.M.reduce((acc, row, i) => acc + row[i] / 2, 0);
  const off = start.slice();
  const seg = (i, w) => { const k = T ? (w / tot[i]) * (end[i] - start[i]) : 0, s0 = off[i]; off[i] += k; return [s0, s0 + k]; };
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { const w = u[i][j]; if (!w) continue; const A = seg(i, w), B = i === j ? seg(i, w) : seg(j, w);
    const [a0, a1] = A, [b0, b1] = B, p = (r, t) => P(r, t).join(",");
    const d = `M${p(r0, a0)} A${r0},${r0} 0 0 1 ${p(r0, a1)} Q${cx},${cy} ${p(r0, b0)} A${r0},${r0} 0 0 1 ${p(r0, b1)} Q${cx},${cy} ${p(r0, a0)} Z`;
    g.push(s("path", { d, fill: i === j ? pal[i] : "var(--hot)", opacity: i === j ? 0.45 : 0.6 }, s("title", {}, i === j ? `Fold ${i + 1} within: ${Math.round(w).toLocaleString()} pairs` : `Folds ${i + 1}–${j + 1}: ${Math.round(w).toLocaleString()} pairs ≥ τ`))); }
  for (let i = 0; i < n; i++) { const [x0, y0] = P(R, start[i]), [x1, y1] = P(R, end[i]), [x2, y2] = P(r0, end[i]), [x3, y3] = P(r0, start[i]), big = end[i] - start[i] > Math.PI ? 1 : 0;
    g.push(s("path", { d: `M${x0},${y0} A${R},${R} 0 ${big} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${big} 0 ${x3},${y3} Z`, fill: pal[i] }), (() => { const m = (start[i] + end[i]) / 2, [tx, ty] = P(R + 14, m); return s("text", { x: tx, y: ty + 4, "text-anchor": "middle", class: "dgs", fill: "var(--ink2)" }, `F${i + 1}`); })()); }
  g.push(s("text", { x: cx, y: cy - 2, "text-anchor": "middle", class: "dgt halo", fill: cross ? "var(--hot)" : "var(--good)" }, `${Math.round(cross).toLocaleString()} cross-fold`), s("text", { x: cx, y: cy + 14, "text-anchor": "middle", class: "dgs halo", fill: "var(--ink2)" }, `${Math.round(within).toLocaleString()} within-fold`));
  return h("div", { class: "chord-cell" }, h("div", { class: "chord-t" }, `${c.task} · ${c.mode === "random" ? "stratified folds" : "group folds"}`), s("svg", { viewBox: "0 0 350 330", width: "100%", role: "img" }, ...g));
}

function diagChord() {
  const cells = DG.chord.map((c) => chordPanel(c, DG.tau));
  return h("figure", { class: "fig dg", id: "dg-chord" }, h("figcaption", { class: "fig-title" }, "Diagram G · Chord diagrams of near-relative pairs between cross-validation folds"),
    h("div", { class: "chord-grid" }, cells),
    h("p", { class: "fig-cap", html: `Each segment is one of five folds; ribbons join folds that contain protein pairs with conjoint-triad proxy similarity ≥ ${DG.tau} (unordered pairs). Under random stratified folds, relatives are scattered, so many red ribbons cross folds, and each one is a route by which a test protein can lean on a close training relative. Single-linkage group folds at the same threshold have none by construction, so only within-fold loops remain. This is a sanity picture of the grouping rule, not a performance result.` }));
}

/* ---------- radar, treemap, parallel coordinates, ridgeline, network ---------- */
const SPC = { random: "var(--s1)", target: "var(--s2)", temporal: "var(--s3)" }, SPN = { random: "Random", target: "Similarity-aware", temporal: "Temporal" };

function diagRadar() {
  const cx = 250, cy = 215, R = 150, F = DG.radar_feats, n = F.length, lo = 0.5, hi = 1.0;
  const ang = (i) => -Math.PI / 2 + (i / n) * 2 * Math.PI, pt = (i, v) => { const r = ((v - lo) / (hi - lo)) * R; return [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))]; };
  const g = [];
  [0.6, 0.7, 0.8, 0.9, 1.0].forEach((t) => { g.push(s("polygon", { points: F.map((_, i) => pt(i, t).join(",")).join(" "), fill: "none", stroke: "var(--grid)", "stroke-width": 1 }), dgText(cx + 4, pt(0, t)[1] - 3, t.toFixed(1))); });
  F.forEach((f, i) => { const [x, y] = pt(i, hi); g.push(s("line", { x1: cx, y1: cy, x2: x, y2: y, stroke: "var(--axis)" }), s("text", { x: cx + (R + 22) * Math.cos(ang(i)), y: cy + (R + 22) * Math.sin(ang(i)) + 4, "text-anchor": "middle", class: "dgs", fill: "var(--ink)" }, f)); });
  Object.keys(SPN).forEach((sp) => { const v = F.map((_, i) => DG.radar[sp][["aac", "paac", "gaac", "ctdt", "socnumber", "ctriad", "kpssm"][i]][0]); g.push(s("polygon", { points: v.map((t, i) => pt(i, t).join(",")).join(" "), fill: SPC[sp], "fill-opacity": 0.14, stroke: SPC[sp], "stroke-width": 2.2 }, s("title", {}, SPN[sp])), ...v.map((t, i) => s("circle", { cx: pt(i, t)[0], cy: pt(i, t)[1], r: 3.4, fill: SPC[sp] }, s("title", {}, `${SPN[sp]} · ${F[i]}: AUROC ${t.toFixed(3)}`)))); });
  Object.keys(SPN).forEach((sp, i) => { g.push(s("rect", { x: 450, y: 150 + i * 24, width: 14, height: 4, fill: SPC[sp] }), dgText(472, 156 + i * 24, SPN[sp], { f: "var(--ink)" })); });
  return dgWrap("dg-radar", "Diagram H · Radar of descriptor performance by split type", "Mean test AUROC of each descriptor, averaged over seven classifiers and all tasks that have that split type. Shapes that shrink between random and similarity-aware show which descriptors lean on relatives. The three split types cover different task sets (temporal is a single task), so the polygons are descriptive rather than a paired comparison.", dgSvg(640, 440, ...g), 560);
}

function diagTreemap() {
  const SP = DG.splits, W = 1000, H = 420, g = [];
  const tree = Object.keys(SPN).map((sp) => ({ n: SPN[sp], c: SPC[sp], kids: SP.filter((r) => r.split === sp).map((r) => ({ n: r.task, kids: [{ n: "Train", kids: [{ n: "Annotated", v: r.train_pos }, { n: "Not", v: r.train_neg }] }, { n: "Test", kids: [{ n: "Annotated", v: r.test_pos }, { n: "Not", v: r.test_neg }] }] })) }));
  const sum = (t) => (t.v != null ? t.v : t.kids.reduce((a, k) => a + sum(k), 0));
  const lay = (items, x, y, w, hh, horiz, depth, col, out) => { const tot = items.reduce((a, t) => a + sum(t), 0); let o = 0;
    items.forEach((t) => { const f = sum(t) / tot, bw = horiz ? w * f : w, bh = horiz ? hh : hh * f, bx = horiz ? x + o : x, by = horiz ? y : y + o; o += horiz ? bw : bh; const c = t.c || col;
      out.push({ t, x: bx, y: by, w: bw, h: bh, depth, c }); if (t.kids) { const pad = depth === 0 ? 20 : depth === 1 ? 17 : 14; lay(t.kids, bx + 2, by + pad, bw - 4, bh - pad - 2, !horiz, depth + 1, c, out); } }); };
  const cells = []; lay(tree, 0, 0, W, H, true, 0, "var(--ink2)", cells);
  cells.forEach((c) => { const leaf = c.t.v != null, ann = c.t.n === "Annotated"; const fill = leaf ? (ann ? "var(--s2)" : "var(--s1)") : "var(--surface)";
    g.push(s("rect", { x: c.x + 1, y: c.y + 1, width: Math.max(c.w - 2, 0), height: Math.max(c.h - 2, 0), rx: leaf ? 2 : 6, fill, "fill-opacity": leaf ? 0.55 : 1, stroke: leaf ? "var(--surface)" : c.c, "stroke-width": leaf ? 1 : c.depth === 0 ? 2 : 1 }, s("title", {}, `${c.t.n}: ${sum(c.t).toLocaleString()} proteins`)));
    if (!leaf && c.w > 74 && c.h > 30 && c.depth < 3) g.push(s("text", { x: c.x + 7, y: c.y + 14, class: "dgs", fill: c.depth === 0 ? c.c : "var(--ink)", style: c.depth === 0 ? "font-weight:600" : "" }, `${c.t.n} · ${sum(c.t).toLocaleString()}`)); });
  return dgWrap("dg-tree", "Diagram I · Treemap of every protein in every official split", "Area is protein count. Nesting: split type → task → training or test → class label. It shows at a glance how little data some official test sets contain (the small cells under Similarity-aware) and how class balance differs between training and test.", dgSvg(W, H, ...g), 860);
}

function diagParallel() {
  const L = DG.parallel, W = 760, H = 380, xs = [110, 380, 650], y0 = 50, y1 = 320, lo = 0.4, hi = 1.0, Y = (v) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0), fc = { AAC: "var(--s1)", PAAC: "var(--s2)", GAAC: "var(--s3)", "CTD-T": "var(--s4)", SOCN: "#e87ba4", "C-triad": "#008300", kPSSM: "#6250d6" };
  const g = [];
  ["Random", "Similarity-aware", "Temporal"].forEach((t, i) => { g.push(s("line", { x1: xs[i], y1: y0, x2: xs[i], y2: y1, stroke: "var(--axis)", "stroke-width": 1.5 }), dgText(xs[i], 30, t, { a: "middle", c: "dgt", f: "var(--ink)" })); });
  [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach((t) => g.push(dgText(xs[0] - 10, Y(t) + 4, t.toFixed(1), { a: "end" })));
  L.forEach((d) => g.push(s("polyline", { points: d.v.map((v, i) => `${xs[i]},${Y(v)}`).join(" "), fill: "none", stroke: fc[d.f], "stroke-width": d.f === "kPSSM" ? 2 : 1.3, opacity: d.f === "kPSSM" ? 0.85 : 0.55 }, s("title", {}, `${d.f} · ${d.m}: ${d.v.map((x) => x.toFixed(2)).join(" → ")}`))));
  Object.keys(fc).forEach((f, i) => { g.push(s("rect", { x: 690, y: 80 + i * 22, width: 14, height: 4, fill: fc[f] }), dgText(710, 86 + i * 22, f, { f: "var(--ink)" })); });
  return dgWrap("dg-par", "Diagram J · Parallel coordinates for GO:0000018, 49 configurations across three splits", "Each line is one descriptor × classifier configuration on the one task that has all three official splits. Most lines slope downward from random to similarity-aware, composition descriptors bunch around 0.8 there, and on the temporal split they fan out between about 0.4 and 0.75 while k-sep. PSSM configurations hold the top. Hover a line for its values.", dgSvg(W + 80, H, ...g), 700);
}

function diagRidge() {
  const R = DG.ridge, W = 900, rowH = 118, H = 40 + R.rows.length * rowH, x0 = 120, x1 = 840, X = (v) => x0 + ((v - 0.2) / 0.8) * (x1 - x0), g = [];
  [0.2, 0.4, 0.6, 0.8, 1.0].forEach((t) => g.push(s("line", { x1: X(t), y1: 20, x2: X(t), y2: H - 26, stroke: "var(--grid)" }), dgText(X(t), H - 8, t.toFixed(1), { a: "middle" })));
  R.rows.forEach((r, k) => { const base = 40 + k * rowH + 92; const pts = r.d.map((d, i) => `${X(R.x[i])},${base - d * 86}`); const area = `M${X(R.x[0])},${base} L${pts.join(" L")} L${X(R.x[R.x.length - 1])},${base} Z`;
    g.push(s("path", { d: area, fill: SPC[r.split], "fill-opacity": 0.45, stroke: SPC[r.split], "stroke-width": 2 }), s("line", { x1: x0, y1: base, x2: x1, y2: base, stroke: "var(--axis)" }),
      s("line", { x1: X(r.median), y1: base, x2: X(r.median), y2: base - 90, stroke: "var(--ink)", "stroke-dasharray": "3 3" }), dgText(8, base - 30, SPN[r.split], { c: "dgt", f: "var(--ink)" }), dgText(8, base - 14, `n = ${r.n}`), dgText(X(r.median) + 6, base - 76, `median ${r.median.toFixed(2)}`, { f: "var(--ink)" })); });
  g.push(dgText((x0 + x1) / 2, H + 12, "Similarity to nearest training protein (conjoint-triad proxy)", { a: "middle" }));
  return dgWrap("dg-ridge", "Diagram K · Ridgeline of test-to-train similarity by split type", "Kernel density of the nearest-training-neighbour proxy similarity for every test protein, pooled over tasks within each split type, each scaled to the same peak height. Similarity-aware and temporal test sets sit left of random ones; the dashed line is the median.", dgSvg(W, H + 20, ...g), 700);
}

function diagNetwork() {
  const N = DG.network, W = 900, H = 560, pal = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "#6250d6"], X = (v) => 30 + v * (W - 60), Y = (v) => 24 + v * (H - 48), g = [];
  N.edges.forEach(([a, b]) => { const A = N.nodes[a], B = N.nodes[b], cross = A.fold !== B.fold; g.push(s("line", { x1: X(A.x), y1: Y(A.y), x2: X(B.x), y2: Y(B.y), stroke: cross ? "var(--hot)" : "var(--axis)", "stroke-width": cross ? 1.1 : 0.8, opacity: cross ? 0.55 : 0.8 })); });
  N.nodes.forEach((d) => g.push(s("circle", { cx: X(d.x), cy: Y(d.y), r: 3.6, fill: pal[d.fold], stroke: d.cls ? "var(--ink)" : "var(--surface)", "stroke-width": d.cls ? 1.2 : 0.8 }, s("title", {}, `fold ${d.fold + 1} · ${d.cls ? "annotated" : "not annotated"}`))));
  g.push(dgText(30, H - 4, `${N.n} of ${N.pool} proteins shown (those with at least one relative at similarity ≥ ${DG.tau}); ${N.edges.length} edges, ${N.cross} cross-fold (red)`, { f: "var(--ink2)" }));
  return dgWrap("dg-net", "Diagram L · Similarity network of GO:0000018 proteins under random folds", "Nodes are proteins coloured by their random-split fold; dark outline marks annotated proteins; edges join proteins with proxy similarity ≥ the threshold, laid out with a force-directed algorithm so relatives cluster. Most edges run between different colours, which is the leakage path. Proxy similarity, not sequence identity.", dgSvg(W, H + 8, ...g), 760);
}
