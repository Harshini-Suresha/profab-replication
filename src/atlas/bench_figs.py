"""Atlas HEA-01..16, CUR-01..08, CNF-01..16, INT-01..08 from the official-split benchmark."""
import os, sys, pickle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acommon import *
import pandas as pd
from sklearn.metrics import roc_curve, precision_recall_curve

b = pd.read_csv(f"{RES}/benchmark_official_splits.csv")
recs = {(r[0], r[1], r[2], r[3]): r for r in pickle.load(open(f"{RES}/benchmark_test_scores.pkl", "rb"))}
H, CU, CN, IT = Registry("HEA", "Heatmaps"), Registry("CUR", "Curves"), Registry("CNF", "Confusion and scores"), Registry("INT", "Intervals")


def sub(task, split):
    return b[(b.task == task) & (b.split == split)]


def lum(rgb):
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]


# ---------------------------------------------------------------- heatmaps
for metric, lo, hi, name in (("mcc", 0.0, 1.0, "MCC"), ("auroc", 0.5, 1.0, "AUROC")):
    for task, split in TASK_SPLITS:
        d = sub(task, split); M = np.full((7, 7), np.nan)
        for i, f in enumerate(FEATS):
            for j, m in enumerate(MODELS):
                v = d[(d.feature == f) & (d.model == m)][metric]; M[i, j] = v.iloc[0] if len(v) else np.nan
        fig, ax = new(6.4, 4.7)
        im = ax.imshow(M, cmap=CMAP, vmin=lo, vmax=hi, aspect="auto")
        for i in range(7):
            for j in range(7):
                if np.isnan(M[i, j]): continue
                rgb = CMAP((M[i, j] - lo) / (hi - lo))[:3]
                ax.text(j, i, f"{M[i, j]:.2f}", ha="center", va="center", fontsize=8.5, color="white" if lum(rgb) < 0.55 else INK)
        bi, bj = np.unravel_index(np.nanargmax(M), M.shape)
        ax.add_patch(plt.Rectangle((bj - 0.5, bi - 0.5), 1, 1, fill=False, ec=INK, lw=1.8))
        ax.set_xticks(range(7), [MODEL_S[m] for m in MODELS]); ax.set_yticks(range(7), [FEAT_S[f] for f in FEATS])
        ax.xaxis.tick_top(); ax.grid(False)
        for s_ in ax.spines.values(): s_.set_visible(False)
        cb = fig.colorbar(im, ax=ax, shrink=0.8, pad=0.02); cb.outline.set_visible(False); cb.set_label(name)
        ax.set_title(f"{TASK_L[task]} · {SPLIT_L[split]}: {name} by descriptor and classifier", pad=42)
        n_te, n_pos = int(d.n_test.iloc[0]), int(d.n_test_pos.iloc[0])
        ax.text(0, 1.07, f"Test n = {n_te} ({n_pos} positive). Outlined cell is best on this test set, so optimistic.", transform=ax.transAxes, fontsize=8, color=MUTED)
        rm = np.nanmean(M, axis=1); cm = np.nanmean(M, axis=0)
        H.save(fig, f"{TASK_L[task]} · {SPLIT_L[split]}: {name} grid",
               f"{name} for all 49 descriptor × classifier configurations on the {SPLIT_L[split].lower()} test set of {TASK_L[task]} (n = {n_te}). Best cell: {FEAT_L[FEATS[bi]]} with {MODEL_L[MODELS[bj]]} ({M[bi, bj]:.2f}). "
               f"Descriptor with the highest row mean: {FEAT_L[FEATS[int(np.nanargmax(rm))]]} ({np.nanmax(rm):.2f}); lowest: {FEAT_L[FEATS[int(np.nanargmin(rm))]]} ({np.nanmin(rm):.2f}). Classifier with the highest column mean: {MODEL_L[MODELS[int(np.nanargmax(cm))]]} ({np.nanmax(cm):.2f}).")

# ---------------------------------------------------------------- ROC / PR panels
for task, split in TASK_SPLITS:
    fig, axs = plt.subplots(2, 2, figsize=(8.0, 6.6), constrained_layout=True)
    best = (None, -1)
    for ci, feat in enumerate(("ctriad", "kpssm")):
        for m in MODELS:
            r = recs[(task, split, feat, m)]; y, s_ = r[5], r[6]
            fpr, tpr, _ = roc_curve(y, s_); pr, rc, _ = precision_recall_curve(y, s_)
            au = b[(b.task == task) & (b.split == split) & (b.feature == feat) & (b.model == m)].auroc.iloc[0]
            axs[0, ci].plot(fpr, tpr, color=MODEL_C[m], lw=1.5, label=f"{MODEL_S[m]} ({au:.2f})")
            axs[1, ci].plot(rc, pr, color=MODEL_C[m], lw=1.5)
            if au > best[1]: best = ((feat, m), au)
        axs[0, ci].plot([0, 1], [0, 1], color=AXIS, lw=1); axs[0, ci].set_title(f"ROC · {FEAT_L[feat]}", fontsize=9.5)
        axs[1, ci].axhline(y.mean(), color=AXIS, lw=1); axs[1, ci].set_title(f"Precision–recall · {FEAT_L[feat]}", fontsize=9.5)
        axs[0, ci].set_xlabel("False-positive rate"); axs[0, ci].set_ylabel("True-positive rate"); axs[1, ci].set_xlabel("Recall"); axs[1, ci].set_ylabel("Precision")
        axs[0, ci].legend(title="AUROC in brackets", loc="lower right", fontsize=7.5, title_fontsize=7.5)
        for a in axs[:, ci]: a.set_xlim(0, 1); a.set_ylim(0, 1.02); a.grid(True, color=GRID)
    fig.suptitle(f"{TASK_L[task]} · {SPLIT_L[split]}: ROC and precision–recall, seven classifiers", x=0.01, ha="left", fontsize=11, fontweight="semibold")
    CU.save(fig, f"{TASK_L[task]} · {SPLIT_L[split]}: ROC and PR curves",
            f"Test-set ROC (top) and precision–recall (bottom) curves for seven classifiers on conjoint-triad (left) and k-separated bigram PSSM (right) features, {TASK_L[task]} {SPLIT_L[split].lower()} split, n = {len(y)} with {100 * y.mean():.0f}% positive. "
            f"The thin horizontal line in the PR panels is the positive prevalence. Highest AUROC among the 14 curves: {FEAT_L[best[0][0]]} with {MODEL_L[best[0][1]]} ({best[1]:.3f}).")

# ---------------------------------------------------------------- confusion matrices and score distributions
REFS = [("ctriad", "svm"), ("kpssm", "logreg")]
for task, split in TASK_SPLITS:
    d = sub(task, split)
    fig, axs = plt.subplots(1, 2, figsize=(7.4, 3.8), constrained_layout=True); notes = []
    for ax, (feat, m) in zip(axs, REFS):
        r = d[(d.feature == feat) & (d.model == m)].iloc[0]
        cm = np.array([[r.tn, r.fp], [r.fn, r.tp]], float); rn = cm / cm.sum(1, keepdims=True)
        ax.imshow(rn, cmap=CMAP, vmin=0, vmax=1)
        for i in range(2):
            for j in range(2):
                ax.text(j, i, f"{int(cm[i, j])}\n{100 * rn[i, j]:.0f}%", ha="center", va="center", fontsize=10, color="white" if rn[i, j] > 0.5 else INK, fontweight="semibold")
        ax.set_xticks([0, 1], ["Not annotated", "Annotated"]); ax.set_yticks([0, 1], ["Not annotated", "Annotated"]); ax.grid(False)
        ax.set_xlabel("Predicted"); ax.set_ylabel("True"); ax.set_title(f"{MODEL_S[m]} · {FEAT_S[feat]}", fontsize=9.5)
        for s_ in ax.spines.values(): s_.set_visible(False)
        notes.append(f"{MODEL_L[m]} on {FEAT_L[feat]}: sensitivity {r.recall:.2f}, specificity {r.specificity:.2f}, MCC {r.mcc:.2f}")
    fig.suptitle(f"{TASK_L[task]} · {SPLIT_L[split]}: confusion matrices (row-normalised)", x=0.01, ha="left", fontsize=10.5, fontweight="semibold")
    CN.save(fig, f"{TASK_L[task]} · {SPLIT_L[split]}: confusion matrices",
            f"Test-set confusion matrices at each model's default decision threshold, {TASK_L[task]} {SPLIT_L[split].lower()} split. Cells show counts and the share of each true class. " + "; ".join(notes) + ". Both configurations are fixed in advance, not chosen on the test set.")
for task, split in TASK_SPLITS:
    fig, axs = plt.subplots(1, 2, figsize=(7.6, 3.6), constrained_layout=True); notes = []
    for ax, (feat, m) in zip(axs, REFS):
        r = recs[(task, split, feat, m)]; y, s_ = r[5], r[6]
        bins = np.linspace(np.percentile(s_, 1), np.percentile(s_, 99), 26)
        ax.hist(s_[y == 0], bins=bins, color=NEG_C, alpha=0.6, density=True, label=f"Not annotated, n={(y == 0).sum()}")
        ax.hist(s_[y == 1], bins=bins, color=POS_C, alpha=0.65, density=True, label=f"Annotated, n={(y == 1).sum()}")
        thr = 0.5 if m == "logreg" else 0.0; ax.axvline(thr, color=INK, lw=1.2)
        ax.set_xlabel("Classifier score" + (" (probability)" if m == "logreg" else " (decision function)")); ax.set_ylabel("Density")
        ax.set_title(f"{MODEL_S[m]} · {FEAT_S[feat]}", fontsize=9.5); ax.legend(fontsize=7.5); ax.grid(False)
        overlap = np.mean(s_[y == 1].mean() > s_[y == 0]) if False else np.nan
        notes.append(f"{MODEL_L[m]} on {FEAT_L[feat]}: median score {np.median(s_[y == 1]):.2f} for positives against {np.median(s_[y == 0]):.2f} for negatives")
    fig.suptitle(f"{TASK_L[task]} · {SPLIT_L[split]}: score distributions by class", x=0.01, ha="left", fontsize=10.5, fontweight="semibold")
    CN.save(fig, f"{TASK_L[task]} · {SPLIT_L[split]}: score distributions",
            f"Distribution of test-set scores for positives and negatives, {TASK_L[task]} {SPLIT_L[split].lower()} split. The vertical line is the default decision threshold. " + "; ".join(notes) + ". Overlap between the two histograms is what limits AUROC, whatever the threshold.")

# ---------------------------------------------------------------- caterpillar intervals
for task, split in TASK_SPLITS:
    d = sub(task, split).sort_values("mcc").reset_index(drop=True)
    fig, ax = new(7.4, 4.3); x = np.arange(len(d))
    for i, r in d.iterrows():
        ax.plot([i, i], [r.mcc_lo, r.mcc_hi], color=FEAT_C[r.feature], lw=1.3, alpha=0.55, solid_capstyle="round")
    for f in FEATS:
        m = d.feature == f
        ax.scatter(x[m], d.mcc[m], s=22, color=FEAT_C[f], label=FEAT_S[f], zorder=3, edgecolors="white", linewidths=0.5)
    ax.axhline(0, color=INK2, lw=1)
    top = d.iloc[-3:]
    for k_, (i, r) in enumerate(top.iterrows()):
        ax.annotate(f"{FEAT_S[r.feature]} · {MODEL_S[r.model]}", (i, r.mcc_hi), xytext=(-4, 6 + 11 * (2 - k_)), textcoords="offset points", ha="right", fontsize=7.5, color=INK2)
    ax.set_xlabel("Configurations ranked by MCC (49)"); ax.set_ylabel("MCC with 95% bootstrap interval"); ax.set_xticks([]); ax.grid(False); ax.grid(axis="y", color=GRID)
    ax.legend(ncol=4, loc="upper left", fontsize=7.5, columnspacing=1.0, handletextpad=0.2)
    ax.set_title(f"{TASK_L[task]} · {SPLIT_L[split]}: MCC with bootstrap intervals"); subtitle(ax, f"Test n = {int(d.n_test.iloc[0])}; 500 stratified resamples per configuration")
    excl = int((d.mcc_lo > 0).sum()); wid = (d.mcc_hi - d.mcc_lo)
    IT.save(fig, f"{TASK_L[task]} · {SPLIT_L[split]}: all configurations with intervals",
            f"All 49 configurations on the {SPLIT_L[split].lower()} test set of {TASK_L[task]}, ranked by MCC, with 95% stratified bootstrap intervals. {excl} of 49 intervals exclude zero. The median interval width is {wid.median():.2f} (range {wid.min():.2f}–{wid.max():.2f}), "
            f"so neighbouring ranks are usually statistically indistinguishable. Colours mark the descriptor.")
print("done", H.n, CU.n, CN.n, IT.n)
