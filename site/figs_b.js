/* label de-collision for direct line labels */
function spreadLabels(items, gap, lo, hi) {
  const a = items.map((d) => ({ ...d, ly: d.y })).sort((p, q) => p.ly - q.ly);
  for (let i = 1; i < a.length; i++) if (a[i].ly < a[i - 1].ly + gap) a[i].ly = a[i - 1].ly + gap;
  const over = a.length ? a[a.length - 1].ly - hi : 0;
  if (over > 0) a.forEach((d) => (d.ly -= over));
  for (let i = a.length - 2; i >= 0; i--) if (a[i].ly > a[i + 1].ly - gap) a[i].ly = a[i + 1].ly - gap;
  return a;
}
const TAU_NOTE = "τ = similarity threshold; groups are connected components of the graph that links proteins whose similarity is at least τ";

/* ===== Fig 7: held-out performance by nearest-training-neighbour similarity ===== */
function figBins() {
  let model = "svm";
  const labels = D.bin_labels.slice().sort((a, b) => binKey(a) - binKey(b));
  function binKey(l) { return l.startsWith("<") ? 0 : l.startsWith(">=") ? 99 : parseFloat(l); }
  const val = (f, b) => D.bin_perf.find((r) => r.feature === f && r.model === model && r.bin === b);
  const feats = ["aac", "paac", "ctriad", "kpssm"];
  const models = uniq(D.bin_perf.map((r) => r.model));
  const fig = makeFigure({
    id: "f-bins", num: "Fig. 7", title: "Held-out accuracy by similarity to the nearest training protein",
    controls: [selectCtl("Classifier", models.map((m) => ({ value: m, label: MODEL_LABEL[m] })), model, (v) => { model = v; fig.refresh(); })],
    legend: () => legendEl(feats.map((f) => ({ color: FEAT_COLOR[f], line: true, label: FEAT_LABEL[f] }))),
    caption: "<b>Balanced accuracy of held-out predictions grouped by how similar each protein is to its closest training protein.</b> Predictions come from ordinary 5-fold stratified cross-validation on each task’s random-split pool, so test proteins fall into every similarity band. Similarity is conjoint-triad cosine (mean-centred); bins with fewer than 3 positives or negatives in a task are dropped, and tasks are pooled with weights equal to bin size. Composition descriptors gain accuracy as a close relative appears in training. The PSSM descriptor does not follow conjoint-triad similarity, which is why the next figures group by more than one space. Bars below show how many held-out predictions fall in each bin.",
    draw(svg, W) {
      const m = { l: 56, r: 118, t: 10, b: 42 }, H = 330, bh = 54, g = s("g");
      const x = band(labels, m.l, W - m.r, 0.16), y = linear(0.5, 1, H - m.b - bh - 18, m.t);
      axisY(g, y, m.l, { ticks: [0.5, 0.6, 0.7, 0.8, 0.9, 1], fmt: f1, grid: [m.l, W - m.r], title: "Balanced accuracy" });
      g.appendChild(s("g", { class: "axis" }, s("line", { x1: m.l, x2: W - m.r, y1: y(0.5), y2: y(0.5) })));
      const cnt = labels.map((l) => D.bin_counts[l] || 0), cy = linear(0, Math.max(...cnt), H - m.b, H - m.b - bh);
      labels.forEach((l, i) => {
        const bar = s("rect", { x: x(l), y: cy(cnt[i]), width: x.bw, height: Math.max(1, H - m.b - cy(cnt[i])), rx: 2, style: "fill:var(--axis)" });
        tipOn(bar, () => `<b>Similarity ${l}</b>${trow("Held-out predictions", cnt[i].toLocaleString())}`); g.appendChild(bar);
        g.appendChild(s("text", { x: x.mid(l), y: H - m.b + 15, "text-anchor": "middle", text: l.replace(">=", "≥") }));
      });
      g.appendChild(s("text", { class: "axis-title", x: (m.l + W - m.r) / 2, y: H - 4, "text-anchor": "middle", text: "Similarity to nearest training protein (conjoint-triad)" }));
      g.appendChild(s("text", { x: m.l - 8, y: H - m.b - bh / 2, "text-anchor": "end", text: "count" }));
      const ends = [];
      feats.forEach((f) => {
        const pts = labels.map((l) => ({ l, r: val(f, l) })).filter((p) => p.r);
        g.appendChild(s("path", { d: pts.map((p, i) => `${i ? "L" : "M"}${x.mid(p.l).toFixed(1)},${y(p.r.bal_acc).toFixed(1)}`).join(""), style: `fill:none;stroke:${FEAT_COLOR[f]};stroke-width:2;stroke-linejoin:round` }));
        pts.forEach((p) => { const c = s("circle", { cx: x.mid(p.l), cy: y(p.r.bal_acc), r: 4.2, style: `fill:${FEAT_COLOR[f]};stroke:var(--surface);stroke-width:2` }); tipOn(c, () => `<b>${FEAT_LABEL[f]} · ${MODEL_LABEL[model]}</b>${trow("Similarity bin", p.l)}${trow("Balanced accuracy", f3(p.r.bal_acc))}${trow("Error", pct(p.r.err, 1))}${trow("Predictions", p.r.n.toLocaleString())}`); g.appendChild(c); });
        const last = pts[pts.length - 1]; if (last) ends.push({ y: y(last.r.bal_acc), f, x: x.mid(last.l) });
      });
      spreadLabels(ends, 13, m.t + 8, y(0.5) - 4).forEach((d) => g.appendChild(s("text", { class: "ink", x: W - m.r + 8, y: d.ly + 4, style: `fill:var(--ink2)`, text: FEAT_SHORT[d.f] })));
      svg.appendChild(g); return H;
    },
    table() {
      const rows = []; feats.forEach((f) => labels.forEach((l) => { const r = val(f, l); if (r) rows.push({ feature: FEAT_LABEL[f], bin: l, n: r.n, bal: r.bal_acc, err: r.err }); }));
      return { cols: [{ k: "feature", label: "Descriptor", left: 1 }, { k: "bin", label: "Similarity bin", left: 1 }, { k: "n", label: "Predictions" }, { k: "bal", label: "Balanced acc.", fmt: f3 }, { k: "err", label: "Error", fmt: (v) => pct(v, 1) }], rows };
    },
  });
  return fig.el;
}

/* ===== Fig 8: inflation of random CV over homology-grouped CV ===== */
function figInflation() {
  let metric = "auroc";
  const feats = ["aac", "paac", "ctriad", "kpssm"], taus = uniq(D.inflation.map((r) => r.tau)).sort((a, b) => a - b);
  const rec = (f, t) => D.inflation.find((r) => r.feature === f && r.tau === t && r.metric === metric);
  const fig = makeFigure({
    id: "f-infl", num: "Fig. 8", title: "Performance lost when close relatives are removed from the test folds",
    controls: [segCtl("Metric", [{ value: "auroc", label: "AUROC" }, { value: "mcc", label: "MCC" }], metric, (v) => { metric = v; fig.refresh(); })],
    legend: () => legendEl(feats.map((f) => ({ color: FEAT_COLOR[f], line: true, label: FEAT_LABEL[f] }))),
    caption: "<b>Random-fold score minus homology-grouped-fold score, same proteins, same models.</b> Grouping uses conjoint-triad similarity: proteins linked at similarity ≥ τ share a group and never straddle train and test. Lower τ is stricter and moves left. Bands are 95% bootstrap intervals over task × classifier pairs (4 tasks × 5 classifiers). At τ = 0.70 the largest group holds " + pct(Math.min(...D.cluster_meta.filter((r) => r.regime === "cluster_0.7").map((r) => r.largest))) + " to " + pct(Math.max(...D.cluster_meta.filter((r) => r.regime === "cluster_0.7").map((r) => r.largest))) + " of a pool. Composition descriptors lose the most; the k-separated PSSM bigrams barely move, which is consistent with conjoint-triad groups not separating proteins that look alike in PSSM space (Fig. 10).",
    draw(svg, W) {
      const m = { l: 56, r: 92, t: 12, b: 52 }, H = 320, g = s("g");
      const all = D.inflation.filter((r) => r.metric === metric), lo = Math.min(0, ...all.map((r) => r.lo)), hi = Math.max(...all.map((r) => r.hi));
      const y = linear(Math.floor(lo * 20) / 20, Math.ceil(hi * 20) / 20, H - m.b, m.t), x = linear(taus[0] - 0.02, taus[taus.length - 1] + 0.02, m.l, W - m.r);
      axisY(g, y, m.l, { ticks: ticks(...y.domain, 6), fmt: (v) => v.toFixed(2), grid: [m.l, W - m.r], title: `${METRIC_LABEL[metric]} lost (random − grouped)` });
      axisX(g, x, H - m.b, { ticks: taus, fmt: f2, grid: [m.t, H - m.b], title: "Grouping threshold τ (stricter ← → looser)" });
      g.appendChild(s("line", { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), style: "stroke:var(--ink2);stroke-width:1.2" }));
      feats.forEach((f) => {
        const pts = taus.map((t) => ({ t, r: rec(f, t) })).filter((p) => p.r), col = FEAT_COLOR[f];
        g.appendChild(s("path", { d: pts.map((p, i) => `${i ? "L" : "M"}${x(p.t)},${y(p.r.hi)}`).join("") + pts.slice().reverse().map((p) => `L${x(p.t)},${y(p.r.lo)}`).join("") + "Z", style: `fill:${col};opacity:.13` }));
        g.appendChild(s("path", { d: pts.map((p, i) => `${i ? "L" : "M"}${x(p.t)},${y(p.r.mean_inflation)}`).join(""), style: `fill:none;stroke:${col};stroke-width:2.2;stroke-linejoin:round` }));
        pts.forEach((p) => { const c = s("circle", { cx: x(p.t), cy: y(p.r.mean_inflation), r: 4.6, style: `fill:${col};stroke:var(--surface);stroke-width:2` }); tipOn(c, () => `<b>${FEAT_LABEL[f]} · τ = ${f2(p.t)}</b>${trow(METRIC_LABEL[metric] + " lost", sgn(p.r.mean_inflation))}${trow("95% CI", `${sgn(p.r.lo)} to ${sgn(p.r.hi)}`)}${trow("Task × model pairs", p.r.n)}`); g.appendChild(c); });
      });
      const lastX = x(taus[taus.length - 1]);
      const endsR = feats.map((f) => { const r = rec(f, taus[taus.length - 1]); return r ? { y: y(r.mean_inflation), f } : null; }).filter(Boolean);
      spreadLabels(endsR, 13, m.t + 6, H - m.b - 4).forEach((d) => g.appendChild(s("text", { class: "ink", x: lastX + 12, y: d.ly + 4, text: FEAT_SHORT[d.f] })));
      svg.appendChild(g); return H;
    },
    table() {
      const rows = []; feats.forEach((f) => taus.forEach((t) => { const r = rec(f, t); if (r) rows.push({ feature: FEAT_LABEL[f], tau: t, m: r.mean_inflation, lo: r.lo, hi: r.hi, n: r.n }); }));
      return { cols: [{ k: "feature", label: "Descriptor", left: 1 }, { k: "tau", label: "τ", fmt: f2 }, { k: "m", label: METRIC_LABEL[metric] + " lost", fmt: (v) => sgn(v) }, { k: "lo", label: "CI low", fmt: (v) => sgn(v) }, { k: "hi", label: "CI high", fmt: (v) => sgn(v) }, { k: "n", label: "Pairs" }], rows };
    },
  });
  return fig.el;
}

/* ===== Fig 9: pruning curve with size-matched control ===== */
function figPruning() {
  let feat = "ctriad", model = "all";
  const taus = uniq(D.pruning.map((r) => r.tau)).sort((a, b) => a - b);
  const models = ["all", ...uniq(D.pruning.map((r) => r.model))];
  const agg = (t) => { const rs = D.pruning.filter((r) => r.feature === feat && r.tau === t && (model === "all" || r.model === model)); if (!rs.length) return null; const mu = (k) => mean(rs.map((r) => r[k])); return { pruned: mu("auroc_pruned"), control: mu("auroc_control"), full: mu("auroc_full"), removed: mu("removed"), kept: mu("n_train_kept"), gap: mu("gap"), n: rs.length }; };
  const fig = makeFigure({
    id: "f-prune", num: "Fig. 9", title: "Leakage pruning against a size-matched random-removal control",
    controls: [selectCtl("Descriptor", ["aac", "ctriad", "kpssm"].map((f) => ({ value: f, label: FEAT_LABEL[f] })), feat, (v) => { feat = v; fig.refresh(); }), selectCtl("Classifier", models.map((m) => ({ value: m, label: m === "all" ? "Mean of 5 classifiers" : MODEL_LABEL[m] })), model, (v) => { model = v; fig.refresh(); })],
    legend: () => legendEl([{ color: "var(--s1)", line: true, label: "Remove training proteins with a close test relative" }, { color: "var(--s2)", line: true, label: "Remove the same number at random" }, { color: "var(--ink2)", line: true, label: "Full training set" }]),
    caption: "<b>Pruning removes, from each training fold, every protein whose similarity to some test protein is at least τ</b> (5-fold CV, conjoint-triad similarity). The control drops the same number of training proteins at random (3 draws per fold), so any gap between the two lines comes from which proteins were removed, not from having less data. The number under each tick is the mean count of training proteins removed. Removing near-duplicates (τ = 0.99) changes little; removing moderate relatives (τ ≤ 0.85) costs AAC and conjoint-triad models more than random removal does, and leaves PSSM-bigram models unchanged because triad similarity does not identify their relatives.",
    draw(svg, W) {
      const m = { l: 56, r: 14, t: 14, b: 66 }, H = 330, g = s("g");
      const pts = taus.map((t) => ({ t, a: agg(t) })).filter((p) => p.a);
      const vals = pts.flatMap((p) => [p.a.pruned, p.a.control, p.a.full]), lo = Math.floor(Math.min(...vals) * 20) / 20, hi = Math.min(1, Math.ceil(Math.max(...vals) * 20) / 20 + 0.01);
      const y = linear(lo, hi, H - m.b, m.t), x = linear(taus[0] - 0.02, taus[taus.length - 1] + 0.02, m.l, W - m.r);
      axisY(g, y, m.l, { ticks: ticks(lo, hi, 5), fmt: f2, grid: [m.l, W - m.r], title: "AUROC (held-out fold)" });
      axisX(g, x, H - m.b, { ticks: taus, fmt: f2, grid: [m.t, H - m.b], title: "Pruning threshold τ (stricter ← → looser)", titleDy: 50 });
      pts.forEach((p) => g.appendChild(s("text", { x: x(p.t), y: H - m.b + 30, "text-anchor": "middle", text: `−${Math.round(p.a.removed)}` })));
      const fullMean = mean(pts.map((p) => p.a.full));
      g.appendChild(s("line", { x1: m.l, x2: W - m.r, y1: y(fullMean), y2: y(fullMean), style: "stroke:var(--ink2);stroke-width:1.4" }));
      [["control", "var(--s2)"], ["pruned", "var(--s1)"]].forEach(([k, col]) => {
        g.appendChild(s("path", { d: pts.map((p, i) => `${i ? "L" : "M"}${x(p.t)},${y(p.a[k])}`).join(""), style: `fill:none;stroke:${col};stroke-width:2.4;stroke-linejoin:round` }));
        pts.forEach((p) => { const c = s("circle", { cx: x(p.t), cy: y(p.a[k]), r: 4.6, style: `fill:${col};stroke:var(--surface);stroke-width:2` }); tipOn(c, () => `<b>τ = ${f2(p.t)} · ${FEAT_LABEL[feat]}</b>${trow("Pruned AUROC", f3(p.a.pruned))}${trow("Random-removal AUROC", f3(p.a.control))}${trow("Full training set", f3(p.a.full))}${trow("Gap (control − pruned)", sgn(p.a.gap))}${trow("Training removed", Math.round(p.a.removed))}${trow("Training kept", Math.round(p.a.kept))}`); g.appendChild(c); });
      });
      svg.appendChild(g); return H;
    },
    table() {
      const rows = taus.map((t) => ({ t, ...(agg(t) || {}) })).filter((r) => r.pruned !== undefined);
      return { cols: [{ k: "t", label: "τ", fmt: f2 }, { k: "removed", label: "Training removed", fmt: (v) => Math.round(v) }, { k: "kept", label: "Training kept", fmt: (v) => Math.round(v) }, { k: "full", label: "AUROC full", fmt: f3 }, { k: "pruned", label: "AUROC pruned", fmt: f3 }, { k: "control", label: "AUROC random removal", fmt: f3 }, { k: "gap", label: "Gap (control − pruned)", fmt: (v) => sgn(v) }, { k: "n", label: "Fold × task × classifier cells" }], rows };
    },
  });
  return fig.el;
}

/* ===== Fig 10: which similarity proxy protects which descriptor ===== */
function figProxy() {
  const spaces = ["ctriad", "kpssm"], rowsF = ["aac", "paac", "ctriad", "kpssm"];
  const val = (sp, tau, f) => D.proxy_inflation.find((r) => r.group_space === sp && Math.abs(r.tau - tau) < 1e-9 && r.feature === f);
  const taus = (sp) => uniq(D.proxy_inflation.filter((r) => r.group_space === sp).map((r) => r.tau)).sort((a, b) => b - a);
  const fig = makeFigure({
    id: "f-proxy", num: "Fig. 10", title: "The grouping space decides which descriptors are protected",
    caption: "<b>AUROC lost when folds are grouped by similarity in one descriptor space (panel) and models use another descriptor (row).</b> Groups are connected components at threshold τ in the panel’s space; the value is random-fold AUROC minus grouped-fold AUROC, averaged over 4 tasks × 3 classifiers × 2 fold seeds. Each space exposes mainly the models built on it: conjoint-triad groups cost composition models up to 0.09 and PSSM models nothing, while PSSM groups cost PSSM models 0.08 to 0.16 and composition models about 0.02 or less. Thresholds are not comparable between panels. In PSSM space the largest group holds " + pct(D.proxy_cross.find((r) => r.group_space === "kpssm" && r.tau === 0.99 && r.feature === "kpssm").largest_group) + " of proteins at τ = 0.99 and " + pct(D.proxy_cross.find((r) => r.group_space === "kpssm" && r.tau === 0.9 && r.feature === "kpssm").largest_group) + " at τ = 0.90, so the strictest column approaches extrapolation. A leakage filter built in one descriptor space therefore does not certify another.",
    draw(svg, W) {
      const wide = W >= 700, lw = 86, gap = 28, top = 44, ch = 34, g = s("g");
      const allv = D.proxy_inflation.map((r) => r.inflation), vmax = Math.max(0.05, Math.ceil(Math.max(...allv) * 40) / 40);
      let yOff = 0; const pw = wide ? (W - lw - gap) / 2 : W - lw;
      spaces.forEach((sp, si) => {
        const tl = taus(sp), cw = pw / tl.length, x0 = wide ? lw + si * (pw + gap) : lw, y0 = wide ? 0 : yOff;
        g.appendChild(s("text", { class: "strong", x: x0, y: y0 + 12, style: "font-size:12.5px", text: W < 560 ? `Groups from ${FEAT_SHORT[sp]} similarity` : `Groups from ${FEAT_LABEL[sp]} similarity` }));
        tl.forEach((t, ti) => g.appendChild(s("text", { x: x0 + ti * cw + cw / 2, y: y0 + top - 8, "text-anchor": "middle", text: `τ ${t.toFixed(2)}` })));
        if (wide ? si === 0 : true) rowsF.forEach((f, fi) => g.appendChild(s("text", { class: "ink", x: x0 - 8, y: y0 + top + fi * ch + ch / 2 + 4, "text-anchor": "end", text: FEAT_SHORT[f] })));
        rowsF.forEach((f, fi) => tl.forEach((t, ti) => {
          const r = val(sp, t, f); if (!r) return; const col = rampColor(Math.max(0, r.inflation) / vmax), xx = x0 + ti * cw, yy = y0 + top + fi * ch;
          const rect = s("rect", { x: xx + 1, y: yy + 1, width: cw - 2, height: ch - 2, rx: 3, style: `fill:${col.css}` });
          tipOn(rect, () => `<b>${FEAT_LABEL[f]} models · ${FEAT_LABEL[sp]} groups, τ ${t.toFixed(2)}</b>${trow("AUROC lost", sgn(r.inflation))}${trow("95% CI", `${sgn(r.lo)} to ${sgn(r.hi)}`)}${trow("Task × classifier pairs", r.n)}`);
          g.appendChild(rect); g.appendChild(s("text", { x: xx + cw / 2, y: yy + ch / 2 + 4, "text-anchor": "middle", style: `font-size:11px;fill:${col.lum > 0.55 ? "#0b0b0b" : "#ffffff"};pointer-events:none`, text: sgn(r.inflation, 3) }));
        }));
        yOff += top + rowsF.length * ch + 30;
      });
      const bh = wide ? top + rowsF.length * ch + 18 : yOff, gid = "pg" + Math.random().toString(36).slice(2, 6), defs = s("defs"), lg = s("linearGradient", { id: gid });
      for (let i = 0; i <= 10; i++) lg.appendChild(s("stop", { offset: i * 10 + "%", "stop-color": rampColor(i / 10).css }));
      defs.appendChild(lg); g.appendChild(defs);
      const bw = Math.min(240, W - lw), sc = linear(0, vmax, lw, lw + bw);
      g.appendChild(s("rect", { x: lw, y: bh, width: bw, height: 8, rx: 2, style: `fill:url(#${gid})` }));
      ticks(0, vmax, 4).forEach((t) => g.appendChild(s("text", { x: sc(t), y: bh + 22, "text-anchor": "middle", text: t.toFixed(2) })));
      g.appendChild(s("text", { class: "axis-title", x: W < 560 ? lw : lw + bw + 12, y: W < 560 ? bh - 6 : bh + 8, text: "AUROC lost" }));
      svg.appendChild(g); return bh + 32;
    },
    table() {
      const rows = []; spaces.forEach((sp) => taus(sp).forEach((t) => rowsF.forEach((f) => { const r = val(sp, t, f); if (r) rows.push({ sp: FEAT_LABEL[sp], t, f: FEAT_LABEL[f], v: r.inflation, lo: r.lo, hi: r.hi, n: r.n }); })));
      return { cols: [{ k: "sp", label: "Grouping space", left: 1 }, { k: "t", label: "τ", fmt: f2 }, { k: "f", label: "Model descriptor", left: 1 }, { k: "v", label: "AUROC lost", fmt: (v) => sgn(v) }, { k: "lo", label: "CI low", fmt: (v) => sgn(v) }, { k: "hi", label: "CI high", fmt: (v) => sgn(v) }, { k: "n", label: "Pairs" }], rows };
    },
  });
  return fig.el;
}

/* ===== Fig 11: stock positional loading vs accession-keyed loading ===== */
function figStock() {
  let metric = "mcc";
  const rows = []; ["ctriad", "kpssm"].forEach((f) => SPLITS.forEach((sp) => { const r = D.stock_summary.find((q) => q.feature === f && q.split === sp); if (r) rows.push(r); }));
  const fig = makeFigure({
    id: "f-stock", num: "Fig. 11", title: "Same data, two ways of reading the split files",
    controls: [segCtl("Metric", [{ value: "mcc", label: "MCC" }, { value: "auroc", label: "AUROC" }], metric, (v) => { metric = v; fig.refresh(); })],
    legend: () => legendEl([{ color: "var(--s2)", label: "Positional (apply index files to this descriptor’s own rows, as the ProFAB loader does)" }, { color: "var(--s1)", label: "Accession-keyed (indices resolved once, features joined by accession)" }]),
    caption: "<b>Mean test performance over 4 tasks (temporal: GO:0000018 only) and 7 classifiers.</b> Conjoint-triad files are row-aligned with the index files, so both readings agree exactly. The k-separated bigram PSSM files start one protein later than their sibling files, so the positional reading selects a neighbouring protein for almost every row. Random and similarity-aware scores barely move; the temporal split loses " + pct(1 - STK("kpssm", "temporal").mcc_stock / STK("kpssm", "temporal").mcc_keyed) + " of its MCC under the positional reading.",
    draw(svg, W) {
      const nar = W < 620, m = { l: nar ? 84 : 180, r: nar ? 16 : 200, t: 10, b: 44 }, rh = 36, H = m.t + rows.length * rh + m.b, g = s("g");
      const vs = rows.flatMap((r) => [r[metric + "_stock"], r[metric + "_keyed"]]), lo = metric === "auroc" ? 0.5 : 0, x = linear(lo, 1, m.l, W - m.r);
      axisX(g, x, H - m.b + 4, { ticks: ticks(lo, 1, 5), fmt: f1, grid: [m.t, H - m.b + 4], title: METRIC_LABEL[metric] });
      rows.forEach((r, i) => {
        const cy = m.t + i * rh + rh / 2, a = r[metric + "_stock"], b = r[metric + "_keyed"];
        g.appendChild(s("text", { class: "strong", x: m.l - 10, y: cy - 1, "text-anchor": "end", text: FEAT_SHORT[r.feature] }));
        g.appendChild(s("text", { x: m.l - 10, y: cy + 11, "text-anchor": "end", text: SPLIT_LABEL[r.split] }));
        g.appendChild(s("line", { x1: x(a), x2: x(b), y1: cy, y2: cy, style: "stroke:var(--axis);stroke-width:3;stroke-linecap:round" }));
        [[a, "var(--s2)", "Positional"], [b, "var(--s1)", "Accession-keyed"]].forEach(([v, col, nm]) => {
          const c = s("circle", { cx: x(v), cy, r: 6, style: `fill:${col};stroke:var(--surface);stroke-width:2` });
          tipOn(c, () => `<b>${FEAT_LABEL[r.feature]} · ${SPLIT_LABEL[r.split]}</b>${trow(nm + " " + METRIC_LABEL[metric], f3(v))}${trow("Positional", f3(a))}${trow("Accession-keyed", f3(b))}${trow("Median test→train similarity (positional)", f2(r.nn_median_stock))}${trow("Median test→train similarity (keyed)", f2(r.nn_median_keyed))}`);
          g.appendChild(c);
        });
        if (!nar && Math.abs(a - b) > 0.04) g.appendChild(s("text", { class: "ink", x: Math.max(x(a), x(b)) + 12, y: cy + 4, text: sgn(b - a, 2) + " keyed vs positional" }));
        else if (!nar && Math.abs(a - b) < 0.004) g.appendChild(s("text", { x: Math.max(x(a), x(b)) + 12, y: cy + 4, text: "same selection" }));
        else if (nar && Math.abs(a - b) > 0.04) g.appendChild(s("text", { class: "ink", x: Math.min(x(a), x(b)) - 8, y: cy - 10, "text-anchor": "end", text: sgn(b - a, 2) }));
      });
      svg.appendChild(g); return H;
    },
    table: () => ({ cols: [{ k: "feature", label: "Descriptor", left: 1, fmt: (v) => FEAT_LABEL[v] }, { k: "split", label: "Split", left: 1, fmt: (v) => SPLIT_LABEL[v] }, { k: "mcc_stock", label: "MCC positional", fmt: f3 }, { k: "mcc_keyed", label: "MCC keyed", fmt: f3 }, { k: "auroc_stock", label: "AUROC positional", fmt: f3 }, { k: "auroc_keyed", label: "AUROC keyed", fmt: f3 }, { k: "nn_median_stock", label: "Median NN-sim positional", fmt: f2 }, { k: "nn_median_keyed", label: "Median NN-sim keyed", fmt: f2 }], rows }),
  });
  return fig.el;
}
