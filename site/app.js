/* ===== page assembly ===== */
const $ = (sel, root = document) => root.querySelector(sel);
const SC = (m, a, b) => D.split_compare.find((r) => r.metric === m && r.a === a && r.b === b);
const INF = (f, t, m = "auroc") => D.inflation.find((r) => r.feature === f && Math.abs(r.tau - t) < 1e-9 && r.metric === m);
const BIN = (f, mod, b) => D.bin_perf.find((r) => r.feature === f && r.model === mod && r.bin === b);
const STK = (f, sp) => D.stock_summary.find((r) => r.feature === f && r.split === sp);
const PRU = (f, t) => { const rs = D.pruning.filter((r) => r.feature === f && Math.abs(r.tau - t) < 1e-9); return rs.length ? { gap: mean(rs.map((r) => r.gap)), removed: mean(rs.map((r) => r.removed)), pruned: mean(rs.map((r) => r.auroc_pruned)), control: mean(rs.map((r) => r.auroc_control)), full: mean(rs.map((r) => r.auroc_full)) } : null; };
const PXI = (sp, t, f) => D.proxy_inflation.find((r) => r.group_space === sp && Math.abs(r.tau - t) < 1e-9 && r.feature === f);
const ci = (r, d = 2) => `${f2(r.lo)}–${f2(r.hi)}`;

function section(id, num, title, kicker, ...body) {
  return h("section", { id }, h("h2", {}, h("span", { class: "sec" }, num), title), kicker ? h("p", { class: "kicker" }, kicker) : null, ...body);
}
const P = (html) => h("p", { html });
const col = (...kids) => h("div", { class: "col" }, ...kids);

function findings() {
  const m1 = SC("mcc", "random", "target"), a1 = SC("auroc", "random", "target"), p1 = SC("auprc", "random", "target");
  const m2 = SC("mcc", "random", "temporal"), a2 = SC("auroc", "random", "temporal");
  const i70 = INF("ctriad", 0.7), i70m = INF("ctriad", 0.7, "mcc"), i95 = INF("ctriad", 0.95), k70 = INF("kpssm", 0.7);
  const hi = BIN("ctriad", "svm", ">=0.99"), lo = BIN("ctriad", "svm", "<0.3");
  const kt = STK("kpssm", "temporal");
  const px = PXI("kpssm", 0.99, "kpssm"), pxg = D.proxy_cross.find((r) => r.group_space === "kpssm" && Math.abs(r.tau - 0.99) < 1e-9 && r.feature === "kpssm");
  const pr = PRU("ctriad", 0.85);
  const li = (big, small, text) => h("li", {}, h("div", { class: "big" }, big, h("small", {}, small)), h("p", { html: text }));
  return h("ul", { class: "findings" },
    li(sgn(-m1.mean_diff, 2), "MCC, similarity-aware vs random", `On ProFAB’s own splits, similarity-aware test sets score <b>${f2(m1.mean_diff)} MCC lower</b> than random ones (95% CI ${f2(m1.lo)}–${f2(m1.hi)}), with AUROC down ${f3(a1.mean_diff)} and AUPRC down ${f3(p1.mean_diff)}. The random split reports the higher MCC in ${pct(m1.frac_a_better)} of ${m1.n_pairs} paired configurations from 3 tasks.`),
    li(sgn(-m2.mean_diff, 2), "MCC, temporal vs random", `The temporal split costs <b>${f2(m2.mean_diff)} MCC</b> and ${f3(a2.mean_diff)} AUROC relative to random splitting. Only GO:0000018 ships a usable temporal split, so this is a single-task result (49 configurations).`),
    li(sgn(-i70.mean_inflation, 3), "AUROC at τ = 0.70, conjoint-triad models", `Holding the proteins fixed and grouping cross-validation folds by similarity removes up to <b>${f3(i70.mean_inflation)} AUROC</b> (MCC ${f3(i70m.mean_inflation)}) from conjoint-triad models, and ${f3(i95.mean_inflation)} when only near-duplicates (τ = 0.95) are separated.`),
    li(`${pct(hi.err, 1)} → ${pct(lo.err, 0)}`, "SVM error, nearest relative ≥ 0.99 vs < 0.3", `Held-out error rises from <b>${pct(hi.err, 1)}</b> for proteins with a near-identical training relative to <b>${pct(lo.err, 0)}</b> for proteins with none close (balanced accuracy ${f3(hi.bal_acc)} vs ${f3(lo.bal_acc)}, conjoint-triad SVM).`),
    li(sgn(-pr.gap, 3), "AUROC, pruning vs random removal, τ = 0.85", `Removing the ${Math.round(pr.removed)} training proteins that have a close test relative hurts conjoint-triad models <b>${f3(pr.gap)} AUROC more</b> than removing the same number at random, so the loss comes from the relatives and not from the smaller training set.`),
    li(sgn(-k70.mean_inflation, 3), "AUROC change, PSSM models, triad-space groups", `A similarity proxy exposes leakage only for the descriptors it can see. Conjoint-triad groups leave PSSM-bigram models untouched (${sgn(-k70.mean_inflation, 3)} AUROC at τ = 0.70), while groups built in PSSM space remove ${f3(px.inflation)} AUROC from the same models at τ = 0.99, where the largest group holds only ${pct(pxg.largest_group)} of proteins.`),
    li(`${f2(kt.mcc_stock)} vs ${f2(kt.mcc_keyed)}`, "MCC, positional vs keyed reading, temporal split", `The k-separated bigram PSSM files start one protein later than their sibling descriptor files, so applying ProFAB’s index files by row position selects the wrong proteins. On the temporal split this changes mean MCC from <b>${f2(kt.mcc_keyed)}</b> to <b>${f2(kt.mcc_stock)}</b> (Section 7).`),
  );
}

function tasksTable() {
  const rows = TASK_ORDER.map((t) => {
    const a = D.audit_splits.filter((r) => r.task === t), idxs = D.audit_index.filter((r) => r.task === t).map((r) => r.split);
    const pool = D.audit_splits.find((r) => r.task === t && r.split === "random");
    return { id: D.tasks[t].id, name: D.tasks[t].name, fam: D.tasks[t].family, pool: pool.pool, pos: Math.round(pool.pos_rate_train * 100) + "%", splits: uniq(idxs).map((s) => SPLIT_LABEL[s]).join(", ") };
  });
  return buildTable([{ k: "id", label: "Task", left: 1 }, { k: "name", label: "Annotation", left: 1 }, { k: "fam", label: "Family", left: 1 }, { k: "pool", label: "Proteins (random pool)" }, { k: "pos", label: "Positive rate" }, { k: "splits", label: "Shipped splits", left: 1 }], rows, { scroll: false });
}
function featTable() {
  const rows = [
    ["aac", 20, "Amino-acid composition: frequency of each residue type."],
    ["paac", 50, "Pseudo-amino-acid composition: composition plus sequence-order correlation terms."],
    ["gaac", 5, "Grouped amino-acid composition: frequency of five physicochemical residue classes."],
    ["ctdt", 39, "Composition–transition–distribution, transition block: how often neighbouring residues switch property class."],
    ["socnumber", 60, "Sequence-order-coupling number: physicochemical distance between residues at a fixed lag."],
    ["ctriad", 343, "Conjoint triad: frequency of each triplet of seven residue classes."],
    ["kpssm", 400, "k-separated bigrams of the PSSM: evolutionary profile information from a position-specific scoring matrix."],
  ].map(([k, d, t]) => ({ k: FEAT_LABEL[k], d, t }));
  return buildTable([{ k: "k", label: "Descriptor", left: 1 }, { k: "d", label: "Dimensions" }, { k: "t", label: "Encodes", left: 1 }], rows);
}
function modelTable() {
  const rows = [["logreg", "L2, balanced class weights; C ∈ {0.01, 0.1, 1, 10}"], ["svm", "RBF kernel, balanced class weights; C ∈ {0.1, 1, 10}"], ["knn", "Distance-weighted; k ∈ {3, 5, 11, 21}"], ["rf", "300 trees, balanced subsample weights"], ["hgb", "Histogram gradient boosting, 200 iterations, early stopping"], ["nb", "Gaussian naive Bayes"], ["mlp", "One hidden layer of 128 units, L2 penalty 0.01, early stopping"]].map(([k, t]) => ({ k: MODEL_LABEL[k], t }));
  return buildTable([{ k: "k", label: "Classifier", left: 1 }, { k: "t", label: "Configuration (tuned by inner 3-fold CV on AUROC)", left: 1 }], rows);
}

function integrityTables() {
  const al = D.kpssm_alignment.filter((r) => true);
  const sum = {}; al.forEach((r) => { const k = r.task + "|" + r.split; sum[k] = sum[k] || { task: r.task, split: r.split, only_aac: 0, only_kp: 0, dup: 0 }; sum[k].only_aac += r.only_in_aac; sum[k].only_kp += r.only_in_kpssm; sum[k].dup += r.dup_in_kpssm; });
  const t1 = buildTable([{ k: "task", label: "Task", left: 1, fmt: taskShort }, { k: "split", label: "Split", left: 1, fmt: (v) => SPLIT_LABEL[v] }, { k: "only_aac", label: "Proteins in AAC file but not kPSSM" }, { k: "only_kp", label: "Proteins in kPSSM file but not AAC" }, { k: "dup", label: "Repeated accessions in kPSSM" }], Object.values(sum));
  const t2 = buildTable([{ k: "task", label: "Task", left: 1, fmt: taskShort }, { k: "split", label: "Split", left: 1, fmt: (v) => SPLIT_LABEL[v] }, { k: "n_test", label: "Test rows" }, { k: "test_members_wrong", label: "Test rows that select a different protein" }, { k: "test_wrong_frac", label: "Share", fmt: (v) => pct(v, 1) }], D.kpssm_positional);
  const part = D.audit_partition.filter((r) => r.oob > 0);
  const t3 = buildTable([{ k: "task", label: "Task", left: 1, fmt: taskShort }, { k: "split", label: "Split", left: 1, fmt: (v) => SPLIT_LABEL[v] }, { k: "label", label: "Class", left: 1 }, { k: "rows", label: "Rows in feature file" }, { k: "n_idx", label: "Indices listed" }, { k: "oob", label: "Indices past end of file", fmt: (v) => h("span", { class: "flag" }, v) }, { k: "max_idx", label: "Largest index" }], part);
  return [t1, t2, t3];
}

/* ===== data explorer ===== */
function explorer() {
  const st = { task: "all", split: "all", feature: "all", model: "all", sort: "mcc", dir: -1, page: 0 }, PS = 20;
  const cols = [["task", "Task", 1, (v) => taskShort(v)], ["split", "Split", 1, (v) => SPLIT_LABEL[v]], ["feature", "Descriptor", 1, (v) => FEAT_LABEL[v]], ["model", "Classifier", 1, (v) => MODEL_LABEL[v]], ["n_test", "Test n", 0, (v) => v], ["mcc", "MCC", 0, f3], ["mcc_lo", "MCC lo", 0, f2], ["mcc_hi", "MCC hi", 0, f2], ["auroc", "AUROC", 0, f3], ["auprc", "AUPRC", 0, f3], ["accuracy", "Acc.", 0, f3], ["balanced_accuracy", "Bal. acc.", 0, f3], ["precision", "Prec.", 0, f3], ["recall", "Recall", 0, f3], ["specificity", "Spec.", 0, f3], ["f1", "F1", 0, f3], ["tp", "TP", 0, (v) => v], ["fp", "FP", 0, (v) => v], ["tn", "TN", 0, (v) => v], ["fn", "FN", 0, (v) => v]];
  const host = h("div"), status = h("span", { class: "small-note" });
  const opts = (vals, lab) => [{ value: "all", label: "All" }, ...vals.map((v) => ({ value: v, label: lab(v) }))];
  const filtered = () => D.benchmark.filter((r) => ["task", "split", "feature", "model"].every((k) => st[k] === "all" || r[k] === st[k]));
  const render = () => {
    const rows = filtered().sort((a, b) => (typeof a[st.sort] === "string" ? a[st.sort].localeCompare(b[st.sort]) : a[st.sort] - b[st.sort]) * st.dir);
    const pages = Math.max(1, Math.ceil(rows.length / PS)); st.page = Math.min(st.page, pages - 1);
    const view = rows.slice(st.page * PS, st.page * PS + PS);
    const thead = h("tr", {}, cols.map(([k, l, left]) => { const th = h("th", { class: "sortable" + (left ? " l" : ""), tabindex: 0, "aria-sort": st.sort === k ? (st.dir > 0 ? "ascending" : "descending") : "none", role: "columnheader" }, l); const go = () => { if (st.sort === k) st.dir *= -1; else { st.sort = k; st.dir = left ? 1 : -1; } render(); }; th.addEventListener("click", go); th.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }); return th; }));
    const tbl = h("table", {}, h("thead", {}, thead), h("tbody", {}, view.map((r) => h("tr", {}, cols.map(([k, , left, fm]) => h("td", { class: left ? "l" : "" }, fm(r[k])))))));
    const pager = h("div", { class: "pager" }, h("button", { type: "button", disabled: st.page === 0, onclick: () => { st.page--; render(); } }, "Previous"), h("span", {}, `Page ${st.page + 1} of ${pages} · ${rows.length} configurations`), h("button", { type: "button", disabled: st.page >= pages - 1, onclick: () => { st.page++; render(); } }, "Next"),
      h("button", { type: "button", class: "btn", onclick: () => copyCsv(rows) }, "Copy filtered rows as CSV"), status);
    host.replaceChildren(h("div", { class: "table-wrap" }, tbl), pager);
  };
  function copyCsv(rows) {
    const keys = ["task", "split", "feature", "model", "n_train", "n_test", "n_test_pos", "mcc", "mcc_lo", "mcc_hi", "auroc", "auroc_lo", "auroc_hi", "auprc", "auprc_lo", "auprc_hi", "accuracy", "balanced_accuracy", "precision", "recall", "specificity", "f1", "tp", "fp", "tn", "fn"];
    const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => r[k]).join(","))].join("\n");
    const done = () => { status.textContent = `Copied ${rows.length} rows.`; setTimeout(() => (status.textContent = ""), 2500); };
    const fallback = () => { const ta = h("textarea", { style: "position:fixed;opacity:0" }); ta.value = csv; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); done(); } catch (e) { status.textContent = "Copy was blocked by the browser."; } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(csv).then(done, fallback); else fallback();
  }
  const ctl = h("div", { class: "controls" },
    selectCtl("Task", opts(TASK_ORDER, taskShort), "all", (v) => { st.task = v; st.page = 0; render(); }),
    selectCtl("Split", opts(SPLITS, (v) => SPLIT_LABEL[v]), "all", (v) => { st.split = v; st.page = 0; render(); }),
    selectCtl("Descriptor", opts(FEATS, (v) => FEAT_LABEL[v]), "all", (v) => { st.feature = v; st.page = 0; render(); }),
    selectCtl("Classifier", opts(MODELS, (v) => MODEL_LABEL[v]), "all", (v) => { st.model = v; st.page = 0; render(); }));
  render(); return h("div", {}, ctl, host);
}

/* ===== build ===== */
function build() {
  const root = $("#root"), nTest = D.audit_splits.map((r) => r.n_test), cfg = D.benchmark.length;
  const sections = [
    ["summary", "Summary"], ["background", "Background"], ["design", "Design"], ["baseline", "Baseline"], ["splits", "Split types"], ["leakage", "Leakage"], ["integrity", "Data integrity"], ["explorer", "Explorer"], ["tasks", "Task profiles"], ["analyses", "Analyses"], ["reference", "Reference"], ["diagrams", "Diagrams"], ["atlas", "Atlas"], ["discussion", "Discussion"], ["faq", "FAQ"], ["methods", "Methods"], ["further", "Further work"], ["glossary2", "Glossary"], ["reading", "Reading"],
  ];
  const bar = h("div", { class: "topbar" }, h("span", { class: "brand" }, "ProFAB replication"), h("nav", { "aria-label": "Sections" }, sections.map(([id, l]) => h("a", { href: "#" + id }, l))), h("button", { type: "button", class: "theme-btn", id: "themeBtn", "aria-label": "Toggle colour theme" }, "Theme"));
  const main = h("main", {},
    h("header", { class: "masthead col" },
      h("p", { class: "eyebrow" }, "Replication study · Briefings in Bioinformatics 24(2), 2023"),
      h("h1", {}, "ProFAB Benchmark Replication"),
      h("p", { class: "lede" }, "A reimplementation of the Open Protein Functional Annotation Benchmark on its released GO and EC datasets, comparing random, similarity-aware and temporal splits and measuring how much close relatives between training and test sets inflate reported performance."),
      h("p", { class: "meta" }, h("span", {}, h("b", {}, "Original paper "), "Özdilek et al., ProFAB"), h("span", {}, h("b", {}, "Tasks "), "GO:0000018, GO:1905523, EC 1.2.4, EC 1.2.7"), h("span", {}, h("b", {}, "Configurations "), `${cfg} official-split runs`), h("span", {}, h("b", {}, "Contact "), h("a", { href: "mailto:harshinisuresha7@gmail.com" }, "harshinisuresha7@gmail.com")))),

    section("summary", "01", "Summary", "Seven results, each computed from the tables on this page.", col(findings(),
      h("div", { class: "scope", html: "<b>Scope.</b> The study uses the four tasks whose processed features ship with the ProFAB repository, not the full benchmark of thousands of GO terms and EC numbers hosted on the authors’ server. Similarity is measured in descriptor space (mean-centred cosine on the features ProFAB provides), which stands in for sequence identity because sequences were not retrievable from the analysis environment. Classifiers are scikit-learn models trained here rather than the ProFAB package, and numbers were not compared against the paper’s tables, whose full text was not available. Treat every absolute score as a property of this setup and every difference as the main result." }))),

    section("background", "00", "Background", "Why relatives in the test set matter, and what ProFAB provides.", background()),

    section("design", "02", "Study design", "Four tasks, three split types, seven descriptors, seven classifiers.",
      col(P("ProFAB frames protein function prediction as one binary classification problem per annotation: proteins carrying a Gene Ontology term or Enzyme Commission number are positives, and a curated set of proteins without it are negatives at roughly two negatives per positive (three for the EC tasks). Each task ships in up to three pre-defined splits, and each protein is described by up to seven sequence-derived feature vectors."), tasksTable(),
        h("h3", {}, "Split types"),
        h("dl", { class: "defs" }, h("dt", {}, "Random"), h("dd", {}, "Proteins are assigned to train and test at random. Close homologs routinely land on both sides."), h("dt", {}, "Similarity-aware"), h("dd", {}, "ProFAB’s “target” split (named “similarity” in the loader). Proteins are separated by their similarity to each other before assignment, and the split files are then drawn from that arrangement."), h("dt", {}, "Temporal"), h("dd", {}, "Assignment follows the time each annotation was made. The files include a validation block, which is merged into training here.")),
        h("h3", {}, "Descriptors"), featTable(), h("h3", {}, "Classifiers"), modelTable()),
      figSplits()),

    section("baseline", "03", "Reproducing the baseline evaluation", "Every descriptor and classifier on every official split.",
      col(P(`All ${cfg} combinations of task, split, descriptor and classifier were trained and scored once on the official test set. Hyper-parameters were tuned by inner 3-fold cross-validation on the training set only. Test sets hold ${Math.min(...nTest)} to ${Math.max(...nTest)} proteins, so each score carries a stratified bootstrap 95% interval (500 resamples), reported in the explorer and in tooltips.`),
        baselineText()),
      figHeat(), figDist(), figCurves()),

    section("splits", "04", "Random versus similarity-aware versus temporal splits", "The same models score lower when test proteins have fewer close relatives in training.",
      col(P("Fig. 2 shows how the splits differ before any model is trained: the distance from each test protein to its closest training protein. Fig. 6 then pairs every configuration under two split types and reports the difference in each metric.")),
      figNN(), figForest()),

    section("leakage", "05", "How closely related proteins inflate performance", "Four views of one effect: stratified by similarity, grouped, pruned and cross-checked.",
      col(P("The official splits differ in more than similarity, since they contain different proteins and different test sizes. To isolate close relatives, the next four experiments hold the protein pool fixed. Each task’s random-split pool is cross-validated with ordinary folds and with folds that keep similar proteins together, using the same models on the same descriptors.")),
      figBins(), figInflation(), figPruning(), figProxy()),

    section("integrity", "06", "Data integrity findings", "Two problems in the released split files affect any evaluation that uses them.",
      col(h("h3", {}, "k-separated bigram PSSM files are shifted by one protein"),
        P("ProFAB selects train and test members by row position: each split ships index files listing which rows of the feature file belong to each part. Six of the seven descriptor files list the same proteins in the same order. In all 18 class-wise k-separated bigram PSSM files the first protein of that order is missing, so every later protein sits earlier than the index files expect: exactly one row earlier in 16 files, and 1 to 3 rows earlier in the other two, where further proteins are also absent. Applying the indices to a PSSM file by position therefore selects neighbouring proteins instead of the intended ones."),
        integrityTables()[0],
        P("The effect on test rows, counting rows whose selected protein differs from the one the index files point to in the other descriptors’ files:"),
        integrityTables()[1],
        P("This study resolves indices once, against the AAC file, and joins every other descriptor by accession (the “accession-keyed” reading). The choice rests on six descriptor files agreeing with each other and with the index files, with the PSSM files as the odd one out. The original construction of the index files could not be inspected, so the authors should confirm which reading they intended."),
        h("h3", {}, "EC 1.2.7 temporal index files point past the end of the data"),
        P("The temporal index files for EC 1.2.7 list 27 more positions per class than the feature files have rows, so the split cannot be reconstructed. That split is excluded from every analysis here. All other splits partition their feature files exactly: no repeated indices, no uncovered rows, no overlap between train and test."),
        integrityTables()[2]),
      figStock()),

    section("explorer", "07", "Result explorer", `All ${cfg} official-split results. Click a column header to sort.`, explorer()),

    section("tasks", "00", "Task profiles", "Per-task and per-split summary of the official benchmark.", taskProfiles()),

    section("analyses", "00", "Additional analyses", "Paired tests, sensitivity by descriptor and classifier, and task-level matrices.", analyses()),

    section("reference", "00", "Reference tables", "Descriptors, classifiers and metrics used throughout.", reference()),

    section("diagrams", "08", "Diagrams", "How the pieces connect.", diagrams()),

    section("atlas", "09", "Figure atlas", `${ATLAS.length} additional figures, grouped by what they show.`, atlas()),

    section("discussion", "00", "Discussion", "What the evidence supports, what it does not, and what to do about it.", discussion()),

    section("faq", "00", "Questions and answers", null, faq()),

    section("methods", "10", "Methods, limitations and reproducibility", null, methods()),

    section("further", "00", "Further work", null, extensions()),

    section("glossary2", "00", "Glossary", null, glossary()),

    section("reading", "00", "Further reading", null, reading()),

    h("footer", { class: "col" }, "ProFAB Benchmark Replication. Code, tables and figures are in the accompanying project archive. Every number on this page is computed in the browser from the embedded results.", h("div", { class: "contact" }, "Contact: ", h("a", { href: "mailto:harshinisuresha7@gmail.com" }, "harshinisuresha7@gmail.com")))
  );
  root.replaceChildren(bar, main);
  [...main.querySelectorAll("section > h2 > .sec")].forEach((e, i) => { e.textContent = String(i + 1).padStart(2, "0"); });
  const btn = $("#themeBtn"); btn.addEventListener("click", () => { const cur = isDark() ? "dark" : "light", nx = cur === "dark" ? "light" : "dark"; document.documentElement.setAttribute("data-theme", nx); try { localStorage.setItem("profab-theme", nx); } catch (e) {} setTimeout(redrawAll, 30); });
  try { const t = localStorage.getItem("profab-theme"); if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); } catch (e) {}
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => setTimeout(redrawAll, 30));
  const links = [...document.querySelectorAll(".topbar nav a")], io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id)); }), { rootMargin: "-20% 0px -70% 0px" });
  document.querySelectorAll("main section").forEach((x) => io.observe(x));
}

function baselineText() {
  const T = "GO_0000018", comp = ["aac", "paac", "gaac", "ctdt", "socnumber", "ctriad"];
  const mu = (sp, fs) => mean(D.benchmark.filter((r) => r.task === T && r.split === sp && fs.includes(r.feature)).map((r) => r.mcc));
  const rank = (sp) => MODELS.map((m) => ({ m, v: mean(D.benchmark.filter((r) => r.split === sp && r.model === m).map((r) => r.mcc)) })).sort((a, b) => b.v - a.v);
  const rr = rank("random"), NAME = { logreg: "logistic regression", svm: "the RBF SVM", knn: "k-NN", rf: "random forest", hgb: "gradient boosting", nb: "Gaussian naive Bayes", mlp: "the MLP" };
  return col(
    P(`<b>Descriptor.</b> On GO:0000018, the one task with all three splits, mean MCC of the six composition and physicochemical descriptors falls from ${f2(mu("random", comp))} under the random split to ${f2(mu("target", comp))} under the similarity-aware split and ${f2(mu("temporal", comp))} under the temporal split. The k-separated bigram PSSM descriptor falls from ${f2(mu("random", ["kpssm"]))} to ${f2(mu("target", ["kpssm"]))} and ${f2(mu("temporal", ["kpssm"]))}, so evolutionary information keeps most of its advantage when test proteins differ from training proteins.`),
    P(`<b>Classifier.</b> Averaged over descriptors and tasks, mean MCC under the random split is highest for ${NAME[rr[0].m]} (${f2(rr[0].v)}) and ${NAME[rr[1].m]} (${f2(rr[1].v)}) and lowest for ${NAME[rr[rr.length - 1].m]} (${f2(rr[rr.length - 1].v)}). Differences between the top classifiers are small compared with the differences between split types, so conclusions about methods depend on how the test set was built.`));
}
function methods() {
  return col(
    h("h3", {}, "Data"),
    P("Feature matrices, label files and split index files come from the ProFAB repository (kansil/ProFAB, MIT licence). Each row holds a UniProt accession and the descriptor values. Rows are keyed by accession; split membership is resolved against the AAC file and descriptors are joined by accession, which also removes the PSSM shift (Section 7). Out-of-range indices are ignored, which matches the ProFAB loader."),
    h("h3", {}, "Training and evaluation"),
    P("Every model is a scikit-learn estimator (version 1.9.1). Linear, kernel, k-NN, naive Bayes and MLP models are preceded by standardisation fitted on the training fold. Logistic regression, SVM and k-NN are tuned over small grids by stratified 3-fold cross-validation maximising AUROC inside the training set. Random forest, gradient boosting, naive Bayes and the MLP use fixed settings. The temporal validation block is merged into training. Test sets are scored once."),
    h("div", { class: "eq", html: "MCC = (TP·TN − FP·FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))<br>AUROC = P(score₊ > score₋) + ½ P(score₊ = score₋)<br>AUPRC = Σₖ (Rₖ − Rₖ₋₁) · Pₖ over distinct score thresholds" }),
    P("Class labels are imbalanced at roughly 1 positive per 2 to 3 negatives, so MCC and AUPRC are reported alongside AUROC. Accuracy, balanced accuracy, precision, recall, specificity, F1 and the confusion matrix are in the explorer. Intervals are stratified bootstrap percentiles over test proteins (500 resamples)."),
    h("h3", {}, "Similarity proxy"),
    P("Sequences were not retrievable, so similarity between two proteins is the cosine of their mean-centred descriptor vectors. Centring uses the task pool mean, which removes the shared composition baseline that makes raw cosine near 1 for every pair. Conjoint triad (343 dimensions) is the default space because it is the largest composition-type descriptor available for every protein; k-separated bigram PSSM (400 dimensions) is the second space. This proxy tracks, but does not equal, sequence identity: two unrelated proteins can share composition, and two homologs with diverged composition can look dissimilar. Thresholds such as 0.9 therefore carry no fixed identity percentage."),
    h("div", { class: "eq", html: "sim(a, b) = (xₐ − μ) · (x_b − μ) / (‖xₐ − μ‖ · ‖x_b − μ‖)<br>nn(t) = max over training proteins j of sim(t, j)" }),
    h("h3", {}, "Controlled experiments"),
    h("dl", { class: "defs" },
      h("dt", {}, "Stratified bins (Fig. 7)"), h("dd", {}, "Out-of-fold predictions from 4 repetitions of 5-fold stratified cross-validation, binned by nn(t) against the training fold."),
      h("dt", {}, "Grouped folds (Fig. 8)"), h("dd", {}, "Proteins are linked when sim ≥ τ; connected components become groups, and stratified group 5-fold cross-validation keeps each group in one fold. Two repetitions per threshold. Inflation is random-fold score minus grouped-fold score, averaged over repetitions, then bootstrapped across task × classifier pairs."),
      h("dt", {}, "Pruning (Fig. 9)"), h("dd", {}, "For each of the 5 stratified folds, training proteins with sim ≥ τ to any test protein are removed. The control removes the same number at random, three draws per fold."),
      h("dt", {}, "Proxy cross-check (Fig. 10)"), h("dd", {}, "Grouped folds built from one descriptor space, with models trained on each of four descriptors. Two repetitions, three classifiers.")),
    h("h3", {}, "Limitations"),
    h("ul", { class: "plain" },
      h("li", { text: "Four tasks, three of which have 270 to 1,500 proteins. Task-level conclusions rest on small test sets, and confidence intervals over configurations understate uncertainty about unseen tasks because configurations share a test set." }),
      h("li", { text: "The temporal comparison covers one task (GO:0000018)." }),
      h("li", { text: "Grouped folds at low thresholds merge many proteins into one group (up to 16% of a pool for conjoint-triad groups at τ = 0.70, and 42% for PSSM groups at τ = 0.90), which pushes folds towards extrapolation. Thresholds are not comparable between descriptor spaces." }),
      h("li", { text: "Similarity is a feature-space proxy. A rerun with sequence identity from MMseqs2 or CD-HIT would replace the proxy thresholds with identity percentages." }),
      h("li", { text: "Models are classical scikit-learn estimators on fixed descriptors. Deep sequence models are out of scope." }),
      h("li", { text: "No comparison against the original paper’s reported numbers was possible." }),
      h("li", { text: "The accession-keyed reading assumes the first five descriptor files define the intended row order. The k-separated bigram PSSM shift is documented, but the authors’ original index construction could not be inspected." })),
    h("h3", {}, "Reproducibility"),
    P("The project archive contains the loader, models, experiments, aggregation scripts, result tables and this page’s build script. Run order: <code>audit.py</code>, <code>bench.py</code>, <code>controlled_cv.py</code>, <code>pruning.py</code>, <code>stock_loader.py</code>, <code>proxy_cross.py</code>, then <code>analyze.py</code>, <code>analyze2.py</code>, <code>analyze3.py</code> and <code>build_site.py</code>. All runs use fixed seeds."),
    h("h3", {}, "Reference"),
    h("ol", { class: "refs" }, h("li", { html: "Özdilek AS, Atakan A, Özsarı G, Acar A, Atalay MV, Doğan T, Rifaioğlu AS. ProFAB: open protein functional annotation benchmark. <i>Briefings in Bioinformatics</i> 24(2), bbac627, 2023. doi:10.1093/bib/bbac627." }), h("li", { html: "ProFAB software and datasets: github.com/kansil/ProFAB." })));
}
build();
