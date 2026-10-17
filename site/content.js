/* ---------- long-form content sections ---------- */
const UL = (items) => h("ul", { class: "plain" }, items.map((t) => h("li", { html: t })));
const TBL = (head, rows, cls) => h("div", { class: "table-wrap" }, h("table", { class: cls || "" }, h("thead", {}, h("tr", {}, head.map((t, i) => h("th", { style: i === 0 ? "text-align:left" : "text-align:left;white-space:normal" }, t)))),
  h("tbody", {}, rows.map((r) => h("tr", {}, r.map((c, i) => h("td", { style: "text-align:left;white-space:normal;vertical-align:top" + (i === 0 ? ";font-weight:600" : ""), html: String(c) }))))))) ;
const SPN2 = { random: "Random", target: "Similarity-aware", temporal: "Temporal" };

function background() {
  return col(
    h("h3", {}, "Why benchmarks for protein function prediction need care"),
    P("Predicting what a protein does from its sequence is a supervised problem with an unusual property: the examples are not independent. Proteins descend from common ancestors, so a dataset of annotated proteins contains families whose members share most of their sequence and, very often, their function. If a model is trained on one member of a family and tested on another, it can score well by recognising the family rather than by learning anything transferable. Reported performance then measures how well the test set is covered by relatives in the training set."),
    P("This is the long-standing reason that community assessments of function prediction hold out proteins by time or by sequence similarity, and that sequence-based studies cluster their data before splitting. A benchmark that ships fixed splits makes comparisons between methods fair only if those splits actually separate relatives, and only if the files that encode them are consistent. Both conditions can be checked, and this study checks them."),
    h("h3", {}, "What ProFAB provides"),
    UL(["<b>Tasks.</b> Binary annotation problems for Gene Ontology terms and Enzyme Commission classes. Each has a positive set (proteins carrying the annotation) and a negative set. Four tasks are bundled in the public repository and used here: GO:0000018, GO:1905523, EC 1.2.4 and EC 1.2.7.",
      "<b>Descriptors.</b> Seven precomputed feature representations per protein, from 5 to 400 dimensions, keyed by UniProt accession.",
      "<b>Splits.</b> Index files for training, validation and test sets under up to three schemes: random, similarity-aware (labelled <i>target</i> in the files) and temporal.",
      "<b>Methods.</b> A Python framework with classical learners and neural models. This study uses scikit-learn estimators only."]),
    h("h3", {}, "What this replication adds"),
    P("The benchmark’s released baselines are re-run on its bundled data, and the question the brief poses is answered in two ways: directly, by comparing scores under the official random, similarity-aware and temporal splits, and mechanistically, by building controlled splits in which the similarity between training and test proteins is varied on purpose. The second part is what lets the page say how much of a score is attributable to relatives and not only that scores drop."),
    P("Sequences were not retrievable in this environment, so similarity is measured in descriptor space. Every statement about similarity on this page is therefore about a proxy; the Methods section says exactly how it is defined and what it can and cannot support."));
}

function taskProfiles() {
  const rows = [];
  DG.taskprof.forEach((t) => t.splits.forEach((s, i) => rows.push([i === 0 ? t.task : "", SPN2[s.split], `${s.n_train.toLocaleString()} / ${s.n_test}`, `${s.n_test_pos} (${Math.round((100 * s.n_test_pos) / s.n_test)}%)`, s.nn_median.toFixed(2), s.mean_auroc.toFixed(2), s.mean_mcc.toFixed(2), `${s.top_feat} (${s.top_feat_auroc.toFixed(2)})`, `${s.low_feat} (${s.low_feat_auroc.toFixed(2)})`, `${s.best} · AUROC ${s.best_auroc.toFixed(2)}`])));
  return col(P("One row per official task and split. <i>Mean</i> columns average over all 49 descriptor × classifier configurations. <i>Best descriptor</i> and <i>weakest descriptor</i> are the descriptors with the highest and lowest mean AUROC over seven classifiers. The best single configuration is chosen on the test set it is reported on, so it is an optimistic number and is shown only to indicate the ceiling."),
    TBL(["Task", "Split", "Train / test", "Test positives", "Median test→train similarity", "Mean AUROC", "Mean MCC", "Best descriptor", "Weakest descriptor", "Best single configuration"], rows),
    h("h3", {}, "Reading the table"),
    UL(["<b>Test size limits what can be said.</b> Several test sets hold between 24 and 94 proteins. With a few dozen positives, the bootstrap interval on MCC is wide enough that most classifier differences within one task are not distinguishable; the atlas interval plots show this directly.",
      "<b>Median similarity follows the split type.</b> The similarity-aware and temporal test sets sit at lower median nearest-neighbour similarity than random test sets, which is what those schemes are designed to achieve, but the shift is moderate, not total: relatives remain in the tail of the distribution (see the ridgeline in the diagrams section).",
      "<b>Descriptor ranking is stable at the extremes.</b> The k-separated bigram PSSM descriptor leads on four of the eight task/split rows (all three GO:0000018 splits and EC 1.2.4 similarity-aware), while PAAC, AAC and SOC number lead on the others; the 60-dimensional SOC number or the 5-dimensional GAAC trail in every row. The middle of the ranking moves between split types."]));
}

function reference() {
  const dims = DG.dims, mm = DG.modelmeans;
  const desc = [["AAC", dims.aac, "Fraction of each of the 20 amino acids.", "Length-independent; ignores order entirely."],
    ["PAAC", dims.paac, "Amino-acid composition plus sequence-order correlation terms from physicochemical properties.", "Adds weak order information to composition."],
    ["GAAC", dims.gaac, "Composition of five physicochemical residue groups.", "Very low-dimensional; coarse."],
    ["CTD-T", dims.ctdt, "Transition part of composition–transition–distribution: how often residues of one property class are followed by another.", "Local order, per property."],
    ["SOCN", dims.socnumber, "Sequence-order coupling numbers: summed squared physicochemical distances between residues a fixed lag apart.", "Captures long-range periodicity in properties."],
    ["Conjoint triad", dims.ctriad, "Frequencies of consecutive residue triplets after reducing the 20 amino acids to 7 classes (7³ = 343 triads).", "Local motif counts in a reduced alphabet; used here as the similarity space."],
    ["k-sep. bigram PSSM", dims.kpssm, "Pairs of PSSM columns k positions apart, summed over the sequence (20 × 20 = 400).", "Carries evolutionary information from a profile search, which is why it can behave differently from composition features."]];
  const clf = [["Logistic regression", "Standardised inputs; L2 penalty; C tuned over a grid by 3-fold CV AUROC.", "Linear baseline."],
    ["SVM (RBF)", "Standardised inputs; C tuned over a grid by 3-fold CV AUROC.", "Strong default on small, dense feature sets."],
    ["k-NN", "Standardised inputs; k tuned over a grid by 3-fold CV AUROC.", "Predicts from nearest training examples, so it can exploit close relatives directly."],
    ["Random forest", "Fixed settings.", "Non-linear, little tuning."],
    ["Gradient boosting", "Histogram-based; fixed settings.", "Non-linear, handles mixed scales."],
    ["Gaussian naive Bayes", "Standardised inputs; no tuning.", "Assumes independent features, which composition descriptors violate; among the weakest models."],
    ["MLP", "Standardised inputs; one small hidden stack; fixed settings.", "Small neural baseline; variable across seeds on small data."]];
  const met = [["MCC", "(TP·TN − FP·FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))", "Single number from the confusion matrix that stays honest under class imbalance. Threshold-dependent: depends on the 0.5 or zero cut-off. Range −1 to 1; 0 is chance.", "Primary metric here for classification quality."],
    ["AUROC", "Probability a random positive outranks a random negative", "Threshold-free ranking quality. Can look good when positives are rare because it counts true negatives generously.", "Reported alongside MCC; used for tuning."],
    ["AUPRC", "Area under precision–recall curve", "Sensitive to the positive rate: a baseline of the prevalence, not 0.5. More informative than AUROC when positives are the minority.", "Reported to show the imbalance effect."],
    ["Accuracy", "(TP+TN)/N", "Misleading under imbalance because the majority class alone scores well.", "Shown in the explorer only."]];
  const byS = {}; mm.forEach((r) => { (byS[r.model] = byS[r.model] || {})[r.split] = r; });
  const mrows = Object.keys(byS).map((m) => [m, ...["random", "target", "temporal"].map((s) => (byS[m][s] ? `AUROC ${byS[m][s].auroc.toFixed(2)} · MCC ${byS[m][s].mcc.toFixed(2)}` : "–"))]);
  return col(h("h3", {}, "Descriptors"), TBL(["Descriptor", "Dimensions", "What it measures", "Note"], desc),
    h("h3", {}, "Classifiers"), TBL(["Model", "Setup", "Role"], clf),
    h("h3", {}, "Mean performance by classifier and split type"), P("Means over all descriptors and all tasks that have the split. The three columns cover different task sets, and temporal is a single task, so read down each column rather than across."), TBL(["Classifier", "Random", "Similarity-aware", "Temporal"], mrows),
    h("h3", {}, "Metrics"), TBL(["Metric", "Definition", "How to read it", "Use here"], met));
}

function discussion() {
  return col(
    h("h3", {}, "What the results support"),
    UL(["<b>Scores fall when relatives are separated.</b> Across the official splits, similarity-aware test sets score lower than random ones by a margin that is visible in MCC, AUROC and AUPRC, and the temporal split is lower still on the one task that has it. Direction is consistent; magnitude depends on the task and the descriptor.",
      "<b>The drop tracks similarity to training.</b> In the controlled experiment, errors rise steeply as the nearest training neighbour becomes less similar. This is the mechanism the official splits are supposed to engage.",
      "<b>It is relatives, not data volume.</b> Removing training proteins that have a close neighbour in the test fold hurts more than removing the same number at random. The gap isolates the relatives effect from simply having fewer training examples.",
      "<b>Descriptor choice interacts with the split.</b> In the controlled experiment, conjoint-triad models lose the most when relatives are removed under groupings built from composition space (up to 0.13 AUROC). The PSSM-based descriptor is almost unaffected by groupings built in composition space but loses ground when groups are built in PSSM space, so the grouping space must match the model’s view of similarity.",
      "<b>The released split files need checking.</b> The k-separated bigram PSSM files lack the first protein in every class-wise file, so applying index lists by position selects neighbouring proteins. Reading by accession fixes this and changes some temporal results substantially."]),
    h("h3", {}, "What they do not support"),
    UL(["<b>No claim about sequence identity.</b> Thresholds are proxy-similarity values with no fixed identity equivalent.",
      "<b>No claim about unseen tasks.</b> Four tasks, small test sets, one temporal task.",
      "<b>No ranking of classifiers.</b> Differences within a task are mostly inside bootstrap noise, and configurations share test sets.",
      "<b>No comparison with the paper’s published numbers.</b> They were not accessible here."]),
    h("h3", {}, "Recommendations for people using benchmarks like this"),
    UL(["Report results under at least two split types and say how test proteins relate to training proteins, for example with a nearest-neighbour similarity distribution like the ridgeline shown here.",
      "Prefer MCC and AUPRC to accuracy for imbalanced tasks, and give an interval, not only a point estimate.",
      "Join descriptors by identifier rather than row position, and audit that every file lists the same proteins in the same order before applying index lists.",
      "When claiming robustness to relatives, test it in the same similarity space the model uses; a grouping in a different space can leave the model’s own neighbours in place.",
      "Treat the best cell of a configuration grid evaluated on one test set as optimistic. Choose the configuration on validation data, then score the test set once."]));
}

function faq() {
  const q = [["Why do similarity-aware splits score lower?", "Because test proteins have fewer close relatives in training, the model has to generalise instead of recognising families. In these runs most classifiers lose AUROC (logistic regression and naive Bayes do not, within noise); no descriptor family is uniformly the most fragile, though PAAC loses the most."],
    ["Does a lower score mean the model is worse?", "No. It means the earlier score was partly credited to relatives. The lower number is the better estimate of performance on a protein that has no close training relative."],
    ["Why use MCC as the main metric?", "The tasks have roughly one positive for every two to three negatives. Accuracy is flattered by that imbalance and AUROC can hide poor precision. MCC uses all four cells of the confusion matrix and is zero for a model no better than chance."],
    ["Why is the similarity a proxy?", "Sequences could not be downloaded here, so similarity is the mean-centred cosine between descriptor vectors. It correlates with sequence identity but is not equal to it, which is why thresholds are quoted as proxy values and the limitation is stated wherever similarity appears."],
    ["What would change with true sequence identity?", "Thresholds would become identity percentages and the groupings would follow homology more faithfully. Based on the cross-matrix experiment, results for composition descriptors would probably be similar in direction, but the exact numbers would move."],
    ["Why are some test sets so small?", "They are the official ProFAB split files for the bundled tasks. The page shows their sizes explicitly and puts intervals on every metric so that small test sets are not over-read."],
    ["What was wrong with the PSSM files?", "Each of the 18 class-wise k-separated bigram PSSM files is missing the first protein listed in the other descriptor files. Index lists applied by row position therefore point one to three rows away from the intended protein. The loader here resolves indices against the AAC file and joins every descriptor by accession."],
    ["Can I rerun it?", "Yes. The archive has every script, the result tables and the page’s build script; all runs are seeded."],
    ["Why are there so many figures?", "The interactive figures carry the main argument. The atlas shows every task, split, descriptor and classifier so no result is hidden behind an average, and the diagrams explain how the pieces fit together."]];
  return col(q.map(([a, b]) => h("details", { class: "more" }, h("summary", {}, a), h("p", { html: b }))));
}

function extensions() {
  return col(UL(["<b>Sequence-identity splits.</b> Cluster the underlying sequences with MMseqs2 or CD-HIT at several identity cut-offs and repeat the grouped-fold and pruning experiments with identity in place of the proxy.",
    "<b>More tasks.</b> Extend beyond the four bundled tasks to the full ProFAB catalogue to test whether the size of the relatives effect depends on the ontology branch or enzyme class.",
    "<b>Deep sequence models.</b> Repeat the leakage curves with learned embeddings from protein language models, which may encode relatedness more strongly than composition features.",
    "<b>Temporal splits for every task.</b> The released index files provide temporal splits for one task only; rebuilding them from annotation dates would give the temporal comparison more than one point.",
    "<b>Calibration and thresholds.</b> Report calibration curves and choose decision thresholds on validation data, since MCC depends on the cut-off.",
    "<b>Fix the files.</b> Report the PSSM row-count mismatch to the maintainers with the audit table so the released indices can be regenerated."]));
}

function glossary() {
  const g = [["Accession", "Stable UniProt identifier of a protein."], ["AUPRC / AUROC", "Areas under the precision–recall and ROC curves."], ["Bootstrap interval", "Percentile interval from resampling test proteins with replacement, stratified by class."], ["Connected component", "Set of proteins linked directly or indirectly by pairs above the similarity threshold."], ["Group fold", "Cross-validation fold built so that no connected component is split across folds."], ["Leakage", "Information about test labels reaching the model through near-duplicate or related training examples."], ["MCC", "Matthews correlation coefficient."], ["Nearest-neighbour similarity", "Highest proxy similarity between a test protein and any training protein."], ["Positional vs keyed", "Applying index lists by row number versus joining files by accession."], ["Proxy similarity", "Mean-centred cosine between descriptor vectors, used in place of sequence identity."], ["Pruning", "Removing training proteins with a close relative in the test fold before fitting."], ["Single linkage", "Grouping rule that merges any two groups containing a pair above the threshold."], ["Stratified", "Preserving the class ratio in each split or fold."]];
  return col(h("dl", { class: "defs" }, g.flatMap(([a, b]) => [h("dt", {}, a), h("dd", {}, b)])));
}

function reading() {
  return col(h("ol", { class: "refs" }, [
    "Özdilek AS, Atakan A, Özsarı G, Acar A, Atalay MV, Doğan T, Rifaioğlu AS. ProFAB: open protein functional annotation benchmark. <i>Briefings in Bioinformatics</i> 24(2), bbac627, 2023.",
    "Radivojac P, et al. A large-scale evaluation of computational protein function prediction. <i>Nature Methods</i> 10, 221–227, 2013 (CAFA).",
    "Matthews BW. Comparison of the predicted and observed secondary structure of T4 phage lysozyme. <i>Biochimica et Biophysica Acta</i> 405, 442–451, 1975.",
    "Saito T, Rehmsmeier M. The precision-recall plot is more informative than the ROC plot when evaluating binary classifiers on imbalanced datasets. <i>PLoS ONE</i> 10(3), e0118432, 2015.",
    "Shen J, et al. Predicting protein–protein interactions based on only sequences information. <i>PNAS</i> 104, 4337–4341, 2007 (conjoint triad).",
    "Chou KC. Prediction of protein cellular attributes using pseudo-amino acid composition. <i>Proteins</i> 43, 246–255, 2001.",
    "Li W, Godzik A. Cd-hit: a fast program for clustering and comparing large sets of protein or nucleotide sequences. <i>Bioinformatics</i> 22, 1658–1659, 2006.",
    "Steinegger M, Söding J. MMseqs2 enables sensitive protein sequence searching for the analysis of massive data sets. <i>Nature Biotechnology</i> 35, 1026–1028, 2017.",
    "Pedregosa F, et al. Scikit-learn: machine learning in Python. <i>Journal of Machine Learning Research</i> 12, 2825–2830, 2011."].map((t) => h("li", { html: t }))));
}

/* ---------- additional analyses ---------- */
function fmtP(p) { return p < 0.001 ? "< 0.001" : p.toFixed(3); }
function sensChart(rows, title) {
  const W = 620, rowH = 34, H = 50 + rows.length * rowH, x0 = 110, lo = -0.18, hi = 0.08, X = (v) => x0 + ((v - lo) / (hi - lo)) * (W - x0 - 30), g = [];
  [-0.15, -0.10, -0.05, 0, 0.05].forEach((t) => g.push(s("line", { x1: X(t), y1: 28, x2: X(t), y2: H - 20, stroke: t === 0 ? "var(--ink2)" : "var(--grid)", "stroke-width": t === 0 ? 1.5 : 1 }), dgText(X(t), H - 4, (t > 0 ? "+" : t < 0 ? "−" : "") + Math.abs(t).toFixed(2), { a: "middle" })));
  g.push(dgText(x0, 16, title, { c: "dgt", f: "var(--ink)" }));
  rows.forEach((r, i) => { const y = 44 + i * rowH; const sig = r.hi < 0; g.push(dgText(x0 - 10, y + 4, r.k, { a: "end", f: "var(--ink)" }), s("line", { x1: X(r.lo), y1: y, x2: X(r.hi), y2: y, stroke: sig ? "var(--hot)" : "var(--axis)", "stroke-width": 3, "stroke-linecap": "round" }), s("circle", { cx: X(r.mean), cy: y, r: 5.5, fill: sig ? "var(--hot)" : "var(--ink2)" }, s("title", {}, `${r.k}: ${r.mean.toFixed(3)} (95% CI ${r.lo.toFixed(3)} to ${r.hi.toFixed(3)}), n = ${r.n}`)), dgText(X(hi) + 4, y + 4, r.mean.toFixed(3), { f: "var(--muted)" })); });
  return dgSvg(W + 40, H, ...g);
}
function heatMat(m, key, label) {
  const vals = m[key].flat(), lo = Math.min(...vals), hi = Math.max(...vals), shade = (v) => { const t = (v - lo) / (hi - lo + 1e-9); return `color-mix(in srgb, var(--s1) ${Math.round(10 + t * 65)}%, var(--surface))`; };
  return h("div", { class: "table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", { style: "text-align:left" }, "Task"), m.feats.map((f) => h("th", {}, f)))),
    h("tbody", {}, m.tasks.map((t, i) => h("tr", {}, h("td", { style: "text-align:left;font-weight:600" }, t), m[key][i].map((v) => h("td", { style: `background:${shade(v)};text-align:center` }, v.toFixed(2))))))));
}
function simPerf() {
  const S = DG.simperf, W = 560, H = 330, x0 = 56, y0 = 24, pw = W - x0 - 20, ph = H - y0 - 46, g = [], xs = S.pts.map((p) => p.x), xl = 0.4, xh = 0.8, yl = 0.5, yh = 1.0, X = (v) => x0 + ((v - xl) / (xh - xl)) * pw, Y = (v) => y0 + ph - ((v - yl) / (yh - yl)) * ph;
  [0.5, 0.6, 0.7, 0.8, 0.9, 1.0].forEach((t) => g.push(s("line", { x1: x0, y1: Y(t), x2: x0 + pw, y2: Y(t), stroke: "var(--grid)" }), dgText(x0 - 8, Y(t) + 4, t.toFixed(1), { a: "end" })));
  [0.4, 0.5, 0.6, 0.7, 0.8].forEach((t) => g.push(dgText(X(t), y0 + ph + 16, t.toFixed(1), { a: "middle" })));
  S.pts.forEach((p) => g.push(s("circle", { cx: X(p.x), cy: Y(p.auroc), r: 7, fill: SPC[p.split], "fill-opacity": 0.8, stroke: "var(--surface)", "stroke-width": 1.5 }, s("title", {}, `${p.l}: median similarity ${p.x.toFixed(2)}, mean AUROC ${p.auroc.toFixed(2)}`))));
  g.push(dgText(x0 + pw / 2, H - 6, "Median test→train similarity (conjoint-triad proxy)", { a: "middle" }), s("text", { x: 14, y: y0 + ph / 2, transform: `rotate(-90 14 ${y0 + ph / 2})`, "text-anchor": "middle", class: "dgs", fill: "var(--muted)" }, "Mean AUROC over 49 configurations"));
  Object.keys(SPN2).forEach((sp, i) => g.push(s("circle", { cx: x0 + 14 + i * 150, cy: 12, r: 5, fill: SPC[sp] }), dgText(x0 + 24 + i * 150, 16, SPN2[sp], { f: "var(--ink)" })));
  return dgSvg(W, H, ...g);
}
function analyses() {
  const pr = DG.paired.map((p) => [p.task, SPN2[p.other], p.n, `${p.auroc.mean >= 0 ? "+" : "−"}${Math.abs(p.auroc.mean).toFixed(3)}`, `${Math.round(100 * p.auroc.frac_down)}%`, fmtP(p.auroc.p), `−${Math.abs(p.mcc.mean).toFixed(3)}`, `${Math.round(100 * p.mcc.frac_down)}%`, fmtP(p.mcc.p)]);
  return col(
    h("h3", {}, "Paired comparison of random and held-out splits"),
    P("For each task with both splits, the 49 descriptor × classifier configurations are paired and the change in score from the random test set to the held-out test set is tested with a Wilcoxon signed-rank test. <b>These p-values are descriptive.</b> The 49 configurations share one test set, so they are not independent observations, and the test sets of different split types are different proteins; treat the mean change and the share of configurations that fall as the findings, and the p-values as a rough guide."),
    TBL(["Task", "Held-out split", "Configs", "Mean ΔAUROC", "Share down", "p (AUROC)", "Mean ΔMCC", "Share down", "p (MCC)"], pr),
    h("h3", {}, "Which descriptors and classifiers lose the most?"),
    P("Change in AUROC from random to similarity-aware test sets, pooled over the three tasks that have both, with bootstrap 95% intervals (2,000 resamples over task × configuration pairs). Red marks an interval that excludes zero. Intervals understate uncertainty about new tasks because the pairs share test sets."),
    h("div", { class: "dg-scroll" }, h("div", { style: "min-width:560px" }, sensChart(DG.sens_feat, "Change in AUROC by descriptor"))),
    h("div", { class: "dg-scroll", style: "margin-top:12px" }, h("div", { style: "min-width:560px" }, sensChart(DG.sens_model, "Change in AUROC by classifier"))),
    UL(["<b>No descriptor family is uniformly fragile.</b> PAAC loses the most; AAC and k-sep. PSSM lose the least, and their intervals overlap zero.",
      "<b>Flexible learners lose more than simple ones.</b> The MLP, gradient boosting and random forest fall the most, logistic regression does not fall, and naive Bayes is flat but already weak. A plausible reading is that high-capacity models fit family-specific structure that a similarity-aware split removes; this analysis cannot confirm that mechanism."]),
    h("h3", {}, "Performance by task and descriptor"),
    P("Mean AUROC over seven classifiers, random split."), heatMat(DG.mats.random, "auroc"),
    P("Mean AUROC over seven classifiers, similarity-aware split."), heatMat(DG.mats.target, "auroc"),
    P("Mean MCC over seven classifiers, random split."), heatMat(DG.mats.random, "mcc"),
    P("Mean MCC over seven classifiers, similarity-aware split."), heatMat(DG.mats.target, "mcc"),
    h("h3", {}, "Does lower similarity to training mean lower performance?"),
    P(`Each point is one of the eight official task/split sets. Median test→train similarity and mean AUROC are correlated (Spearman ρ = ${DG.simperf.rho_auroc.toFixed(2)} for AUROC and ${DG.simperf.rho_mcc.toFixed(2)} for MCC), but with eight points the correlation is weak evidence, and task identity is confounded with similarity: the sets differ in size, class balance and biology as well as in how close their test proteins are to training.`),
    h("figure", { class: "fig", style: "margin:12px 0" }, h("div", { class: "dg-scroll" }, h("div", { style: "min-width:480px" }, simPerf()))));
}
