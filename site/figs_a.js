/* ===== Fig 1: dataset and split composition ===== */
function figSplits() {
  const rows = [];
  TASK_ORDER.forEach((t) => SPLITS.forEach((sp) => { const r = D.audit_splits.find((a) => a.task === t && a.split === sp); if (r) rows.push(r); }));
  const fig = makeFigure({
    id: "f-splits", num: "Fig. 1", title: "Composition of the official ProFAB train/test splits",
    caption: "<b>Each bar is one benchmark split.</b> Light segment: training proteins (the temporal split also contributes its validation members, which are merged into training here). Solid segment: held-out test proteins. Labels give test-set size and positive rate. Test sets range from 24 to 543 proteins, so most task-level metrics carry wide intervals. EC 1.2.7 has no usable temporal split (see Section 7).",
    legend: () => legendEl(SPLITS.map((sp) => ({ color: SPLIT_COLOR[sp], label: SPLIT_LABEL[sp] }))),
    draw(svg, W) {
      const narrow = W < 620, m = { l: narrow ? 92 : 168, r: narrow ? 8 : 190, t: 6, b: 28 }, rh = 26, gg = 14;
      const maxn = Math.max(...rows.map((r) => r.n_train + r.n_test));
      const x = linear(0, maxn, m.l, W - m.r);
      let y = m.t, prev = null; const g = s("g");
      rows.forEach((r) => {
        if (prev && prev !== r.task) y += gg; prev = r.task;
        const nt = r.n_train, ne = r.n_test, col = SPLIT_COLOR[r.split];
        g.appendChild(s("text", { class: "strong", x: m.l - 10, y: y + 11, "text-anchor": "end", text: taskShort(r.task) }));
        g.appendChild(s("text", { x: m.l - 10, y: y + 22, "text-anchor": "end", text: SPLIT_LABEL[r.split] }));
        const a = s("rect", { x: x(0), y: y + 3, width: Math.max(1, x(nt) - x(0) - 1), height: 17, rx: 3, style: `fill:${col};opacity:.32` });
        const b = s("rect", { x: x(nt) + 1, y: y + 3, width: Math.max(2, x(nt + ne) - x(nt) - 1), height: 17, rx: 3, style: `fill:${col}` });
        const tip = () => `<b>${taskShort(r.task)} · ${SPLIT_LABEL[r.split]}</b>${trow("Train", r.n_train)}${trow("Test", r.n_test)}${trow("Test positives", r.n_test_pos)}${trow("Positive rate (train)", pct(r.pos_rate_train, 1))}${trow("Positive rate (test)", pct(r.pos_rate_test, 1))}${trow("Pool size", r.pool)}`;
        tipOn(a, tip); tipOn(b, tip); g.appendChild(a); g.appendChild(b);
        if (!narrow) g.appendChild(s("text", { x: x(nt + ne) + 8, y: y + 15.5, text: `test ${r.n_test} · ${pct(r.pos_rate_test)} positive` }));
        y += rh;
      });
      axisX(g, x, y + 2, { ticks: ticks(0, maxn, 5), title: "Proteins (positives + negatives)" });
      svg.appendChild(g); return y + 2 + 40;
    },
    table: () => ({ cols: [{ k: "task", label: "Task", left: 1, fmt: taskShort }, { k: "split", label: "Split", left: 1, fmt: (v) => SPLIT_LABEL[v] }, { k: "n_train", label: "Train" }, { k: "n_test", label: "Test" }, { k: "n_test_pos", label: "Test pos." }, { k: "pos_rate_train", label: "Pos. rate train", fmt: (v) => pct(v, 1) }, { k: "pos_rate_test", label: "Pos. rate test", fmt: (v) => pct(v, 1) }, { k: "acc_overlap", label: "Train∩test accessions" }, { k: "exact_dup_test_in_train", label: "Identical AAC vectors in train" }], rows }),
  });
  return fig.el;
}

/* ===== Fig 2: test-to-train nearest-neighbour similarity ===== */
function figNN() {
  let space = "ctriad";
  const G = D.nn_ecdf.grid;
  const meanCurve = (sp) => { const cs = TASK_ORDER.map((t) => D.nn_ecdf.curves[`${t}|${sp}`]).filter(Boolean); return G.map((_, i) => mean(cs.map((c) => c[i]))); };
  const curveFor = (sp) => (space === "ctriad" ? meanCurve(sp) : D.nn_ecdf_kpssm[sp]);
  const med = (c) => { const i = c.findIndex((v) => v >= 0.5); return i < 0 ? 1 : G[i]; };
  const fig = makeFigure({
    id: "f-nn", num: "Fig. 2", title: "How close is each test protein to its nearest training protein?",
    controls: [segCtl("Similarity space", [{ value: "ctriad", label: "Conjoint triad" }, { value: "kpssm", label: "k-sep. bigram PSSM" }], space, (v) => { space = v; fig.refresh(); })],
    caption: "<b>Empirical CDF of the largest similarity between a test protein and any training protein.</b> Similarity is mean-centred cosine in the chosen descriptor space, a proxy for sequence similarity (Section 3). A curve further right means test proteins have closer relatives in training. Thick lines average the per-task curves (thin lines, conjoint-triad view); the vertical line marks 0.9. In conjoint-triad space, " + pct(D.nn_summary.random.frac_ge_09) + " of random-split test proteins have a training neighbour at or above 0.9, against " + pct(D.nn_summary.target.frac_ge_09) + " for the similarity-aware split and " + pct(D.nn_summary.temporal.frac_ge_09) + " for the temporal split (pooled over tasks).",
    legend: () => legendEl(SPLITS.map((sp) => ({ color: SPLIT_COLOR[sp], label: `${SPLIT_LABEL[sp]} (median ${f2(med(curveFor(sp)))})`, line: true }))),
    draw(svg, W) {
      const m = { l: 52, r: 14, t: 10, b: 46 }, H = 300;
      const x = linear(0, 1, m.l, W - m.r), y = linear(0, 1, H - m.b, m.t);
      const g = s("g");
      axisY(g, y, m.l, { ticks: [0, 0.25, 0.5, 0.75, 1], fmt: (v) => pct(v), grid: [m.l, W - m.r], title: "Share of test proteins" });
      axisX(g, x, H - m.b, { ticks: [0, 0.2, 0.4, 0.6, 0.8, 1], fmt: f1, grid: [m.t, H - m.b], title: "Maximum similarity to any training protein" });
      g.appendChild(s("line", { x1: x(0.9), x2: x(0.9), y1: m.t, y2: H - m.b, style: "stroke:var(--ink2);stroke-width:1;opacity:.55" }));
      g.appendChild(s("text", { x: x(0.9) - 4, y: H - m.b - 6, "text-anchor": "end", text: "0.9" }));
      const path = (c) => c.map((v, i) => `${i ? "L" : "M"}${x(G[i]).toFixed(1)},${y(v).toFixed(1)}`).join("");
      if (space === "ctriad") SPLITS.forEach((sp) => TASK_ORDER.forEach((t) => { const c = D.nn_ecdf.curves[`${t}|${sp}`]; if (c) g.appendChild(s("path", { d: path(c), style: `fill:none;stroke:${SPLIT_COLOR[sp]};stroke-width:1;opacity:.35` })); }));
      SPLITS.forEach((sp) => g.appendChild(s("path", { d: path(curveFor(sp)), style: `fill:none;stroke:${SPLIT_COLOR[sp]};stroke-width:2.5;stroke-linejoin:round` })));
      const cross = s("line", { y1: m.t, y2: H - m.b, style: "stroke:var(--ink2);stroke-width:1;opacity:0" });
      const ov = s("rect", { x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, style: "fill:transparent" });
      ov.addEventListener("pointermove", (e) => {
        const r = svg.getBoundingClientRect(), px = (e.clientX - r.left) * (W / r.width), v = Math.max(0, Math.min(1, x.invert(px))), i = Math.round(v * 100);
        cross.setAttribute("x1", x(G[i])); cross.setAttribute("x2", x(G[i])); cross.style.opacity = 0.6;
        tipShow(`<b>Similarity ≤ ${f2(G[i])}</b>` + SPLITS.map((sp) => trow(SPLIT_LABEL[sp], pct(curveFor(sp)[i], 1))).join(""), e);
      });
      ov.addEventListener("pointerleave", () => { tipHide(); cross.style.opacity = 0; });
      g.appendChild(cross); g.appendChild(ov); svg.appendChild(g); return H;
    },
    table() {
      const idx = [50, 70, 80, 90, 95, 99];
      return { cols: [{ k: "split", label: "Split", left: 1 }, ...idx.map((i) => ({ k: "c" + i, label: `≤ ${G[i].toFixed(2)}` }))], rows: SPLITS.map((sp) => { const c = curveFor(sp), r = { split: SPLIT_LABEL[sp] }; idx.forEach((i) => (r["c" + i] = pct(c[i], 1))); return r; }) };
    },
  });
  return fig.el;
}

/* ===== Fig 3: heatmap descriptor x classifier ===== */
function figHeat() {
  let metric = "mcc", task = "all";
  const dom = { mcc: [0, 1], auroc: [0.5, 1], auprc: [0.25, 1] };
  const cell = (sp, f, m) => { const v = D.benchmark.filter((r) => r.split === sp && r.feature === f && r.model === m && (task === "all" || r.task === task)); return v.length ? { v: mean(v.map((r) => r[metric])), n: v.length, all: ["mcc", "auroc", "auprc"].map((k) => mean(v.map((r) => r[k]))) } : null; };
  const taskOpts = [{ value: "all", label: "All tasks (mean)" }, ...TASK_ORDER.map((t) => ({ value: t, label: taskShort(t) }))];
  const fig = makeFigure({
    id: "f-heat", num: "Fig. 3", title: "Baseline benchmark: descriptor × classifier, by split type",
    controls: [segCtl("Metric", [{ value: "mcc", label: "MCC" }, { value: "auroc", label: "AUROC" }, { value: "auprc", label: "AUPRC" }], metric, (v) => { metric = v; fig.refresh(); }), selectCtl("Task", taskOpts, task, (v) => { task = v; fig.refresh(); })],
    caption: "<b>Mean test-set performance for every descriptor and classifier.</b> Every cell is a model with hyper-parameters tuned by inner 3-fold cross-validation on the training set only, then scored once on the official test set. Task coverage differs by split: random covers 4 tasks, similarity-aware 3, temporal 1 (GO:0000018). With “All tasks” selected, panels therefore average different task sets; pick one task to compare like with like. The PSSM-based k-separated bigrams dominate under the temporal split, and Gaussian NB and the MLP are the weakest classifiers under the other two.",
    draw(svg, W) {
      const wide = W >= 880, lw = 94, gap = 20, top = 44, ch = 30;
      const d = dom[metric], pw = wide ? (W - lw - gap * 2) / 3 : W - lw, cw = pw / MODELS.length;
      const g = s("g"); let yOff = 0;
      SPLITS.forEach((sp, si) => {
        const x0 = wide ? lw + si * (pw + gap) : lw, y0 = wide ? 0 : yOff;
        g.appendChild(s("text", { class: "strong", x: x0, y: y0 + 12, style: "font-size:12.5px", text: SPLIT_LABEL[sp] }));
        MODELS.forEach((m, mi) => g.appendChild(s("text", { x: x0 + mi * cw + cw / 2, y: y0 + top - 8, "text-anchor": "middle", text: MODEL_SHORT[m] })));
        if (wide ? si === 0 : true) FEATS.forEach((f, fi) => g.appendChild(s("text", { class: "ink", x: x0 - 8, y: y0 + top + fi * ch + ch / 2 + 4, "text-anchor": "end", text: FEAT_SHORT[f] })));
        const any = FEATS.some((f) => MODELS.some((m) => cell(sp, f, m)));
        if (!any) g.appendChild(s("text", { x: x0 + pw / 2, y: y0 + top + (FEATS.length * ch) / 2, "text-anchor": "middle", text: "Not available for this task" }));
        else FEATS.forEach((f, fi) => MODELS.forEach((m, mi) => {
          const c = cell(sp, f, m); if (!c) return;
          const col = rampColor((c.v - d[0]) / (d[1] - d[0])), xx = x0 + mi * cw, yy = y0 + top + fi * ch;
          const r = s("rect", { x: xx + 1, y: yy + 1, width: cw - 2, height: ch - 2, rx: 3, style: `fill:${col.css}` });
          tipOn(r, () => `<b>${FEAT_LABEL[f]} · ${MODEL_LABEL[m]}</b>${trow("Split", SPLIT_LABEL[sp])}${trow("MCC", f3(c.all[0]))}${trow("AUROC", f3(c.all[1]))}${trow("AUPRC", f3(c.all[2]))}${trow("Tasks averaged", c.n)}`);
          g.appendChild(r);
          g.appendChild(s("text", { x: xx + cw / 2, y: yy + ch / 2 + 4, "text-anchor": "middle", style: `font-size:10.5px;fill:${col.lum > 0.55 ? "#0b0b0b" : "#ffffff"};pointer-events:none`, text: c.v.toFixed(2) }));
        }));
        yOff += top + FEATS.length * ch + 26;
      });
      const bh = wide ? top + FEATS.length * ch + 22 : yOff;
      const gid = "hg" + Math.random().toString(36).slice(2, 6), defs = s("defs"), lg = s("linearGradient", { id: gid });
      for (let i = 0; i <= 10; i++) lg.appendChild(s("stop", { offset: i * 10 + "%", "stop-color": rampColor(i / 10).css }));
      defs.appendChild(lg); g.appendChild(defs);
      const bx = lw, bw = Math.min(260, W - lw);
      g.appendChild(s("rect", { x: bx, y: bh, width: bw, height: 8, rx: 2, style: `fill:url(#${gid})` }));
      const sc = linear(d[0], d[1], bx, bx + bw);
      ticks(d[0], d[1], 4).forEach((t) => g.appendChild(s("text", { x: sc(t), y: bh + 22, "text-anchor": "middle", text: t.toFixed(2) })));
      g.appendChild(s("text", { class: "axis-title", x: W < 560 ? bx : bx + bw + 12, y: W < 560 ? bh - 6 : bh + 8, text: METRIC_LABEL[metric] }));
      svg.appendChild(g); return bh + 32;
    },
    table() {
      const rows = []; SPLITS.forEach((sp) => FEATS.forEach((f) => MODELS.forEach((m) => { const c = cell(sp, f, m); if (c) rows.push({ split: SPLIT_LABEL[sp], feature: FEAT_LABEL[f], model: MODEL_LABEL[m], mcc: c.all[0], auroc: c.all[1], auprc: c.all[2], n: c.n }); })));
      return { cols: [{ k: "split", label: "Split", left: 1 }, { k: "feature", label: "Descriptor", left: 1 }, { k: "model", label: "Classifier", left: 1 }, { k: "mcc", label: "MCC", fmt: f3 }, { k: "auroc", label: "AUROC", fmt: f3 }, { k: "auprc", label: "AUPRC", fmt: f3 }, { k: "n", label: "Tasks" }], rows };
    },
  });
  return fig.el;
}

/* ===== Fig 4: box + dots of all 49 configurations per task and split ===== */
function figDist() {
  let metric = "auroc";
  const groups = () => { const out = []; TASK_ORDER.forEach((t) => { const sps = SPLITS.filter((sp) => D.benchmark.some((r) => r.task === t && r.split === sp)); if (sps.length) out.push({ t, sps }); }); return out; };
  const jit = (i) => { const v = Math.sin(i * 127.1 + 3.7) * 43758.5453; return v - Math.floor(v) - 0.5; };
  const fig = makeFigure({
    id: "f-dist", num: "Fig. 4", title: "Spread across all 49 descriptor × classifier configurations",
    controls: [segCtl("Metric", [{ value: "auroc", label: "AUROC" }, { value: "mcc", label: "MCC" }, { value: "auprc", label: "AUPRC" }], metric, (v) => { metric = v; fig.refresh(); })],
    legend: () => legendEl(SPLITS.map((sp) => ({ color: SPLIT_COLOR[sp], label: SPLIT_LABEL[sp] }))),
    caption: "<b>Each dot is one configuration</b> (7 descriptors × 7 classifiers) scored on the official test set; boxes span the quartiles and the bar inside is the median. Within a task, the median drops from random to similarity-aware, and again to temporal where that split exists. Configurations that reach 1.0 on the three small EC and GO tasks are evaluated on 24–94 proteins, so a perfect score there is not strong evidence.",
    draw(svg, W) {
      const gs = groups(), m = { l: 52, r: 10, t: 12, b: 50 }, H = 340;
      const all = D.benchmark.map((r) => r[metric]), lo = Math.min(...all), hi = Math.max(...all);
      const y0 = metric === "mcc" ? Math.floor(Math.min(lo, 0) * 10) / 10 : Math.floor(lo * 10) / 10;
      const y = linear(y0, Math.min(1, Math.ceil(hi * 20) / 20 + 0.02), H - m.b, m.t), g = s("g");
      axisY(g, y, m.l, { ticks: ticks(...y.domain, 6), fmt: f1, grid: [m.l, W - m.r], title: METRIC_LABEL[metric] });
      const bw = (W - m.l - m.r) / gs.length; g.appendChild(s("g", { class: "axis" }, s("line", { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b })));
      gs.forEach((gr, gi) => {
        const cx = m.l + gi * bw + bw / 2, step = Math.min(70, bw / 3.2);
        gr.sps.forEach((sp, si) => {
          const px = cx + (si - (gr.sps.length - 1) / 2) * step, rows = D.benchmark.filter((r) => r.task === gr.t && r.split === sp), vals = rows.map((r) => r[metric]);
          const q1 = quantile(vals, 0.25), q3 = quantile(vals, 0.75), md = median(vals), w = Math.min(40, step * 0.62), col = SPLIT_COLOR[sp];
          g.appendChild(s("rect", { x: px - w / 2, y: y(q3), width: w, height: Math.max(1, y(q1) - y(q3)), rx: 3, style: `fill:${col};opacity:.16;stroke:${col};stroke-width:1` }));
          g.appendChild(s("line", { x1: px - w / 2, x2: px + w / 2, y1: y(md), y2: y(md), style: "stroke:var(--ink);stroke-width:2" }));
          rows.forEach((r, i) => {
            const c = s("circle", { cx: px + jit(i + si * 50) * w * 0.85, cy: y(r[metric]), r: 2.7, style: `fill:${col};opacity:.78` });
            tipOn(c, () => `<b>${FEAT_LABEL[r.feature]} · ${MODEL_LABEL[r.model]}</b>${trow("Task / split", taskShort(r.task) + " · " + SPLIT_LABEL[r.split])}${trow(METRIC_LABEL[metric], f3(r[metric]))}${trow("95% CI", `${f2(r[metric + "_lo"])} – ${f2(r[metric + "_hi"])}`)}${trow("Test size", r.n_test)}`);
            g.appendChild(c);
          });
        });
        g.appendChild(s("text", { class: "strong", x: cx, y: H - m.b + 18, "text-anchor": "middle", text: taskShort(gr.t) }));
        g.appendChild(s("text", { x: cx, y: H - m.b + 32, "text-anchor": "middle", text: gr.sps.map((sp) => D.benchmark.find((r) => r.task === gr.t && r.split === sp).n_test).join(" / ") + " test" }));
      });
      svg.appendChild(g); return H;
    },
    table() {
      const rows = []; groups().forEach((gr) => gr.sps.forEach((sp) => { const v = D.benchmark.filter((r) => r.task === gr.t && r.split === sp).map((r) => r[metric]); rows.push({ task: taskShort(gr.t), split: SPLIT_LABEL[sp], n: v.length, min: Math.min(...v), q1: quantile(v, 0.25), med: median(v), q3: quantile(v, 0.75), max: Math.max(...v) }); }));
      return { cols: [{ k: "task", label: "Task", left: 1 }, { k: "split", label: "Split", left: 1 }, { k: "n", label: "Configs" }, ...["min", "q1", "med", "q3", "max"].map((k) => ({ k, label: k === "med" ? "Median" : k.toUpperCase(), fmt: f3 }))], rows };
    },
  });
  return fig.el;
}

/* ===== Fig 5: ROC and precision-recall ===== */
function figCurves() {
  const keys = Object.keys(D.curves).sort((a, b) => { const [ta, sa] = a.split("|"), [tb, sb] = b.split("|"); return TASK_ORDER.indexOf(ta) - TASK_ORDER.indexOf(tb) || SPLITS.indexOf(sa) - SPLITS.indexOf(sb); });
  let key = "GO_0000018|target";
  const spec = [["best", "Best by test AUROC", "var(--ink)"], ["ref_svm_ctriad", "SVM · conjoint triad", "var(--s1)"], ["ref_rf_aac", "RF · AAC", "var(--s2)"], ["ref_logreg_kpssm", "LogReg · k-sep. PSSM", "var(--s3)"]];
  const fig = makeFigure({
    id: "f-curves", num: "Fig. 5", title: "ROC and precision–recall curves on a chosen test set",
    controls: [selectCtl("Task · split", keys.map((k) => { const [t, sp] = k.split("|"); return { value: k, label: `${taskShort(t)} · ${SPLIT_LABEL[sp]}` }; }), key, (v) => { key = v; fig.refresh(); })],
    legend: () => legendEl(spec.filter((sp) => D.curves[key][sp[0]]).map((sp) => ({ color: sp[2], line: true, label: sp[0] === "best" ? `${sp[1]} (${FEAT_SHORT[D.curves[key].best.feature]} · ${MODEL_SHORT[D.curves[key].best.model]})` : sp[1] }))),
    caption: "<b>Three fixed configurations plus the best one</b> for the selected test set. The best curve is chosen on the very test set it is drawn on, so it is optimistic by construction; the three fixed curves are not selected after the fact. In the PR panel the thin line is the positive-class prevalence, the score of a random classifier.",
    draw(svg, W) {
      const wide = W >= 620, pw = wide ? (W - 120) / 2 : W - 70, H = wide ? 330 : 640, C = D.curves[key], g = s("g");
      [["roc", 0], ["pr", 1]].forEach(([kind, pi]) => {
        const ox = wide ? 52 + pi * (pw + 56) : 52, oy = wide ? 10 : 10 + pi * 320, ph = wide ? H - 66 : 250;
        const x = linear(0, 1, ox, ox + pw), y = linear(0, 1, oy + ph, oy), gg = s("g");
        axisY(gg, y, ox, { ticks: [0, 0.25, 0.5, 0.75, 1], fmt: f2, grid: [ox, ox + pw], title: kind === "roc" ? "True-positive rate" : "Precision" });
        axisX(gg, x, oy + ph, { ticks: [0, 0.25, 0.5, 0.75, 1], fmt: f2, grid: [oy, oy + ph], title: kind === "roc" ? "False-positive rate" : "Recall" });
        if (kind === "roc") gg.appendChild(s("line", { x1: x(0), y1: y(0), x2: x(1), y2: y(1), style: "stroke:var(--axis);stroke-width:1" }));
        else gg.appendChild(s("line", { x1: x(0), y1: y(C.best.prevalence), x2: x(1), y2: y(C.best.prevalence), style: "stroke:var(--axis);stroke-width:1" }));
        gg.appendChild(s("text", { class: "strong", x: ox, y: oy - 2, text: "" }));
        spec.slice().reverse().forEach(([k, lab, col]) => {
          const c = C[k]; if (!c) return; const xs = kind === "roc" ? c.fpr : c.rec, ys = kind === "roc" ? c.tpr : c.prec;
          gg.appendChild(s("path", { d: xs.map((v, i) => `${i ? "L" : "M"}${x(v).toFixed(1)},${y(ys[i]).toFixed(1)}`).join(""), style: `fill:none;stroke:${col};stroke-width:${k === "best" ? 2.4 : 1.8};stroke-linejoin:round` }));
          xs.forEach((v, i) => { if (i % 2) return; const hit = s("circle", { cx: x(v), cy: y(ys[i]), r: 6, style: "fill:transparent" }); tipOn(hit, () => `<b>${lab}</b>${trow(kind === "roc" ? "FPR" : "Recall", f3(v))}${trow(kind === "roc" ? "TPR" : "Precision", f3(ys[i]))}`); gg.appendChild(hit); });
        });
        g.appendChild(gg);
      });
      svg.appendChild(g); return wide ? H : 10 + 320 + 250 + 60;
    },
    table() {
      const C = D.curves[key], rows = spec.filter((sp) => C[sp[0]]).map((sp) => { const b = D.benchmark.find((r) => r.task === key.split("|")[0] && r.split === key.split("|")[1] && r.feature === C[sp[0]].feature && r.model === C[sp[0]].model); return { name: sp[1], cfg: `${FEAT_SHORT[C[sp[0]].feature]} · ${MODEL_SHORT[C[sp[0]].model]}`, auroc: b.auroc, auprc: b.auprc, mcc: b.mcc, lo: b.mcc_lo, hi: b.mcc_hi }; });
      return { cols: [{ k: "name", label: "Curve", left: 1 }, { k: "cfg", label: "Configuration", left: 1 }, { k: "auroc", label: "AUROC", fmt: f3 }, { k: "auprc", label: "AUPRC", fmt: f3 }, { k: "mcc", label: "MCC", fmt: f3 }, { k: "lo", label: "MCC 95% lo", fmt: f2 }, { k: "hi", label: "MCC 95% hi", fmt: f2 }], rows };
    },
  });
  return fig.el;
}

/* ===== Fig 6: paired split comparison (forest) ===== */
function figForest() {
  const pairs = [["random", "target"], ["random", "temporal"], ["target", "temporal"]], pc = ["var(--s1)", "var(--s2)", "var(--s3)"];
  const mets = ["mcc", "auroc", "auprc"], rows = [];
  mets.forEach((mt) => pairs.forEach((p, pi) => { const r = D.split_compare.find((q) => q.metric === mt && q.a === p[0] && q.b === p[1]); if (r) rows.push({ ...r, pi }); }));
  const fig = makeFigure({
    id: "f-forest", num: "Fig. 6", title: "Paired performance differences between split types",
    legend: () => legendEl(pairs.map((p, i) => ({ color: pc[i], label: `${SPLIT_LABEL[p[0]]} − ${SPLIT_LABEL[p[1]]}` }))),
    caption: "<b>Mean paired difference with a 95% bootstrap interval.</b> Each pair is one task × descriptor × classifier configuration scored under two split types. A positive value means the first split type reports higher performance. Random − similarity-aware uses 147 pairs from 3 tasks; both temporal comparisons use 49 pairs from the single task that has a temporal split, so they describe GO:0000018 rather than the benchmark as a whole. Intervals resample configurations, which share one test set per task, so they understate uncertainty about new tasks.",
    draw(svg, W) {
      const nar = W < 560, m = { l: nar ? 112 : 200, r: 18, t: 8, b: 44 }, rh = 24, gh = 16, g = s("g");
      const SHORT = { random: "Random", target: "Similarity", temporal: "Temporal" }, lab = (p) => (nar ? `${SHORT[p[0]].slice(0, 4)}. − ${SHORT[p[1]].slice(0, 4)}.` : `${SPLIT_LABEL[p[0]]} − ${SPLIT_LABEL[p[1]]}`);
      const lo = Math.min(0, ...rows.map((r) => r.lo)) - 0.02, hi = Math.max(...rows.map((r) => r.hi)) + 0.03, x = linear(lo, hi, m.l, W - m.r);
      let y = m.t; const ys = [];
      mets.forEach((mt) => { y += 4; g.appendChild(s("text", { class: "strong", x: 0, y: y + 12, text: METRIC_LABEL[mt] })); y += 18; pairs.forEach((p, pi) => { ys.push([mt, pi, y]); y += rh; }); y += gh - 4; });
      const yEnd = y - gh + 8;
      axisX(g, x, yEnd, { ticks: ticks(lo, hi, 7), fmt: (v) => (v === 0 ? "0" : v.toFixed(2)), grid: [m.t, yEnd], title: nar ? "Mean difference" : "Mean difference (first − second split type)" });
      g.appendChild(s("line", { x1: x(0), x2: x(0), y1: m.t, y2: yEnd, style: "stroke:var(--ink2);stroke-width:1.2" }));
      ys.forEach(([mt, pi, yy]) => {
        const r = rows.find((q) => q.metric === mt && q.pi === pi); if (!r) return; const cy = yy + rh / 2 - 2;
        g.appendChild(s("text", { class: "ink", x: m.l - 10, y: cy + 4, "text-anchor": "end", text: lab(pairs[pi]) }));
        g.appendChild(s("line", { x1: x(r.lo), x2: x(r.hi), y1: cy, y2: cy, style: `stroke:${pc[pi]};stroke-width:2.2;stroke-linecap:round` }));
        const dot = s("circle", { cx: x(r.mean_diff), cy, r: 5, style: `fill:${pc[pi]};stroke:var(--surface);stroke-width:2` });
        const hit = s("rect", { x: x(r.lo) - 4, y: cy - 10, width: x(r.hi) - x(r.lo) + 8, height: 20, style: "fill:transparent" });
        tipOn(hit, () => `<b>${METRIC_LABEL[mt]} · ${SPLIT_LABEL[pairs[pi][0]]} − ${SPLIT_LABEL[pairs[pi][1]]}</b>${trow("Mean difference", sgn(r.mean_diff))}${trow("95% CI", `${sgn(r.lo)} to ${sgn(r.hi)}`)}${trow("Pairs", r.n_pairs)}${trow("Share first higher", pct(r.frac_a_better))}${trow("Wilcoxon p", r.wilcoxon_p < 1e-4 ? "< 1e-4" : f3(r.wilcoxon_p))}`);
        g.appendChild(dot); g.appendChild(hit);
        g.appendChild(s("text", { class: "ink", x: Math.min(W - m.r, x(r.hi) + 8), y: cy + 4, text: sgn(r.mean_diff, 2), style: W < 560 ? "display:none" : "" }));
      });
      svg.appendChild(g); return yEnd + 44;
    },
    table: () => ({ cols: [{ k: "metric", label: "Metric", left: 1, fmt: (v) => METRIC_LABEL[v] }, { k: "a", label: "First", left: 1, fmt: (v) => SPLIT_LABEL[v] }, { k: "b", label: "Second", left: 1, fmt: (v) => SPLIT_LABEL[v] }, { k: "n_pairs", label: "Pairs" }, { k: "mean_diff", label: "Mean diff.", fmt: f3 }, { k: "lo", label: "CI low", fmt: f3 }, { k: "hi", label: "CI high", fmt: f3 }, { k: "frac_a_better", label: "Share first higher", fmt: (v) => pct(v) }, { k: "wilcoxon_p", label: "Wilcoxon p", fmt: (v) => (v < 1e-4 ? "< 1e-4" : f3(v)) }], rows }),
  });
  return fig.el;
}
function narrowL(W) { return W < 560 ? 150 : 200; }
