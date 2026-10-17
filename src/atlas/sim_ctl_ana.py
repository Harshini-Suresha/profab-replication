"""Atlas SIM-01..10, CTL-01..08, ANA-01..06."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acommon import *
import pandas as pd
from scipy.cluster.hierarchy import linkage, leaves_list
from scipy.stats import wilcoxon, spearmanr
from pools import aligned_pool
from common import centered_unit

bm = pd.read_csv(f"{RES}/benchmark_official_splits.csv")
nn3 = pd.read_csv(f"{RES}/test_to_train_nn_similarity.csv")
nnk = pd.read_csv(f"{RES}/test_to_train_nn_kpssm.csv")
ctl = pd.read_csv(f"{RES}/table_controlled_cv.csv")
pr = pd.read_csv(f"{RES}/pruning_curve.csv")
SPL = ["random", "target", "temporal"]

# ---------------- SIM ----------------
S = Registry("SIM", "Similarity")
for src, name, lab in ((nn3, "conjoint-triad", "ctriad"), (nnk, "kPSSM", "kpssm")):
    for task in TASKS:
        fig, ax = new(6.0, 4.2)
        for sp in SPL:
            d = src[(src.task == task) & (src.split == sp)].nn_sim.sort_values().to_numpy()
            if len(d) == 0: continue
            ax.step(d, np.arange(1, len(d) + 1) / len(d), where="post", color=SPLIT_C[sp], lw=2, label=f"{SPLIT_L[sp]} (n={len(d)}, median {np.median(d):.2f})")
        ax.set_xlabel(f"Similarity to nearest training protein ({name} space)"); ax.set_ylabel("Cumulative fraction of test proteins")
        ax.set_title(f"{TASK_L[task]} · test→train nearest-neighbour similarity"); subtitle(ax, f"Empirical CDF, {name} space; curves further right mean more leakage-prone test sets")
        ax.legend(loc="upper left"); ax.set_xlim(None, 1.0); ax.set_ylim(0, 1.01)
        S.save(fig, f"{TASK_L[task]}: test→train similarity ECDF ({name})", f"For each test protein, the mean-centred cosine similarity to its nearest training protein in {name} space, shown as an empirical CDF per official split. A curve that rises late means test proteins have close training neighbours. Proxy similarity, not sequence identity.")

rows = [(f"{TASK_L[t]}\n{SPLIT_L[s]}", g.nn_sim.to_numpy()) for (t, s), g in nn3.groupby(["task", "split"])]
fig, ax = new(8.4, 4.4)
parts = ax.violinplot([r[1] for r in rows], showmedians=True, showextrema=False, widths=0.85)
for i, b in enumerate(parts["bodies"]):
    sp = [s for s in SPL if SPLIT_L[s] in rows[i][0]][0]; b.set_facecolor(SPLIT_C[sp]); b.set_alpha(0.55); b.set_edgecolor("none")
parts["cmedians"].set_color(INK); parts["cmedians"].set_linewidth(1.5)
ax.set_xticks(range(1, len(rows) + 1), [r[0] for r in rows], fontsize=7.5); ax.set_ylabel("Nearest training neighbour similarity (conjoint triad)"); ax.grid(False); ax.grid(axis="y", color=GRID)
ax.set_title("All official test sets: how close are test proteins to training?"); subtitle(ax, "Violins of test→train nearest-neighbour proxy similarity; bar is the median")
S.save(fig, "All splits: test→train similarity distributions", "Distribution of the nearest-training-neighbour similarity for the test set of every official task/split, coloured by split type. Similarity-aware splits are meant to shift mass leftwards relative to random splits; how far they do depends on the task and on the proxy.")

for task in TASKS:
    acc, X, y, Z = aligned_pool(task)
    Sm = Z @ Z.T; o = leaves_list(linkage(Z, "average", metric="cosine"))
    Sm = Sm[np.ix_(o, o)]; np.fill_diagonal(Sm, np.nan)
    fig, ax = new(5.6, 5.0)
    im = ax.imshow(Sm, cmap=CMAP, vmin=0, vmax=1, interpolation="nearest", aspect="equal"); ax.grid(False); ax.set_xticks([]); ax.set_yticks([])
    for s_ in ax.spines.values(): s_.set_visible(False)
    cb = fig.colorbar(im, ax=ax, shrink=0.8, pad=0.02); cb.outline.set_visible(False); cb.set_label("Proxy similarity")
    ax.set_title(f"{TASK_L[task]} · pool similarity matrix"); subtitle(ax, f"{len(y)} proteins ordered by average-linkage clustering (conjoint triad)")
    S.save(fig, f"{TASK_L[task]}: pairwise similarity heatmap", "Pairwise mean-centred cosine similarity between all proteins in the pool (conjoint triad), reordered so similar proteins are adjacent. Dark blocks on the diagonal are groups of near-relatives that a random split will scatter across training and test.")

fig, axs = plt.subplots(1, 4, figsize=(11, 3.4), constrained_layout=True, sharey=True)
for ax, task in zip(axs, TASKS):
    acc, X, y, Z = aligned_pool(task); Sm = Z @ Z.T; iu = np.triu_indices(len(y), 1); same = (y[:, None] == y[None, :])[iu]; v = Sm[iu]
    bins = np.linspace(-0.4, 1, 40)
    ax.hist(v[same], bins=bins, density=True, color=C[0], alpha=0.6, label="same class"); ax.hist(v[~same], bins=bins, density=True, color=C[1], alpha=0.55, label="different class")
    ax.set_title(TASK_L[task], fontsize=9.5); ax.set_xlabel("Pairwise similarity"); ax.grid(False)
axs[0].set_ylabel("Density"); axs[0].legend(fontsize=7.5)
S.save(fig, "Pairwise similarity: same class vs different class", "Distribution of all pairwise similarities in each pool, split by whether the two proteins share a class label. A right shift for same-class pairs is the signal that nearest-neighbour methods exploit, and the reason relatives across a split inflate scores.")
print("SIM", S.n)

# ---------------- CTL ----------------
Cc = Registry("CTL", "Leakage")
REG = ["random", "cluster_0.95", "cluster_0.9", "cluster_0.85", "cluster_0.8", "cluster_0.7"]
XL = ["random", "0.95", "0.90", "0.85", "0.80", "0.70"]
for task in TASKS:
    d = ctl[ctl.task == task]
    fig, axs = plt.subplots(1, 2, figsize=(9.6, 4.0), constrained_layout=True)
    for ax, met, ml in zip(axs, ["auroc", "mcc"], ["AUROC", "MCC"]):
        for f in ["aac", "paac", "ctriad", "kpssm"]:
            g = d[d.feature == f].groupby("regime")[met].agg(["mean", "min", "max"]).reindex(REG)
            ax.plot(range(6), g["mean"], marker="o", ms=4, lw=2, color=FEAT_C[f], label=FEAT_L[f])
            ax.fill_between(range(6), g["min"], g["max"], color=FEAT_C[f], alpha=0.12, lw=0)
        ax.set_xticks(range(6), XL); ax.set_xlabel("Grouping threshold τ (single linkage, conjoint triad)"); ax.set_ylabel(ml); ax.grid(False); ax.grid(axis="y", color=GRID)
    axs[0].legend(fontsize=7.5); axs[0].set_title(f"{TASK_L[task]} · AUROC under stricter grouping"); axs[1].set_title("MCC")
    Cc.save(fig, f"{TASK_L[task]}: performance as relatives are separated", "Cross-validated performance versus the threshold at which near-relatives are forced into the same fold. Lines are means over classifiers and repeats; shading is the range across classifiers. Lower τ removes more neighbours across folds, so a falling curve is leakage that a random split was crediting to the model.")

lab_c = {"full": C[0], "pruned": C[1], "control": C[2]}
for task in TASKS:
    d = pr[pr.task == task]
    fig, axs = plt.subplots(1, 3, figsize=(11, 3.6), constrained_layout=True, sharey=True)
    for ax, f in zip(axs, ["aac", "ctriad", "kpssm"]):
        e = d[d.feature == f]
        full = e[e.condition == "full"].auroc.mean(); ax.axhline(full, color=C[0], lw=1.5, ls="--", label="full training set")
        taus = sorted(e.tau.dropna().unique(), reverse=True)
        for cond in ("pruned", "control"):
            m = [e[(e.condition == cond) & (e.tau == t)].auroc.mean() for t in taus]
            ax.plot(range(len(taus)), m, marker="o", ms=4, lw=2, color=lab_c[cond], label="similarity-pruned" if cond == "pruned" else "random removal (size-matched)")
        ax.set_xticks(range(len(taus)), [f"{t:.2f}" for t in taus]); ax.set_xlabel("Pruning threshold τ"); ax.set_title(FEAT_L[f], fontsize=9.5); ax.grid(False); ax.grid(axis="y", color=GRID)
    axs[0].set_ylabel("Test AUROC"); axs[0].legend(fontsize=7.5)
    Cc.save(fig, f"{TASK_L[task]}: removing near-relatives from training vs random removal", "Training proteins with a neighbour at or above τ to any test protein are removed (pruned) and the model is refitted; the control removes the same number of random training proteins. The gap between the lines is the performance attributable to relatives rather than to less data.")
print("CTL", Cc.n)

# ---------------- ANA ----------------
A = Registry("ANA", "Cross-analysis")
fig, ax = new(5.6, 4.6)
for sp in SPL:
    d = bm[bm.split == sp]; ax.scatter(d.auroc, d.mcc, s=16, color=SPLIT_C[sp], alpha=0.7, linewidths=0, label=SPLIT_L[sp])
rho = spearmanr(bm.auroc, bm.mcc)[0]
ax.set_xlabel("AUROC"); ax.set_ylabel("MCC"); ax.legend(); ax.grid(False); ax.grid(color=GRID)
ax.set_title("MCC against AUROC across all configurations"); subtitle(ax, f"{len(bm)} runs; Spearman ρ = {rho:.2f}")
A.save(fig, "MCC vs AUROC", f"Every task × split × descriptor × classifier run. The two metrics agree on ranking (Spearman ρ = {rho:.2f}), but MCC depends on the decision threshold and is systematically lower and more spread out than AUROC.")

fig, ax = new(5.8, 4.2)
w = bm.mcc_hi - bm.mcc_lo
for sp in SPL:
    m = bm.split == sp; ax.scatter(bm.n_test[m], w[m], s=16, color=SPLIT_C[sp], alpha=0.7, linewidths=0, label=SPLIT_L[sp])
ax.set_xscale("log"); ax.set_xlabel("Test-set size (log scale)"); ax.set_ylabel("Width of 95% bootstrap interval on MCC"); ax.legend(); ax.grid(False); ax.grid(color=GRID)
ax.set_title("Small test sets give wide intervals"); subtitle(ax, "Each point is one configuration")
A.save(fig, "Interval width vs test-set size", "Width of the bootstrap 95% interval on MCC against the number of test proteins. Several official test sets contain only a few dozen proteins, so many differences between classifiers there are within noise.")

piv = bm.pivot_table(index=["task", "feature", "model"], columns="split", values="auroc")
fig, ax = new(5.6, 5.0)
d = piv.dropna(subset=["random", "target"])
ax.scatter(d.random, d.target, s=16, color=C[1], alpha=0.7, linewidths=0); ax.plot([0.4, 1], [0.4, 1], color=AXIS, lw=1)
fr = (d.target < d.random).mean(); ax.set_xlim(0.4, 1.0); ax.set_ylim(0.4, 1.0)
ax.set_xlabel("AUROC, random split"); ax.set_ylabel("AUROC, similarity-aware split"); ax.set_aspect("equal"); ax.grid(False); ax.grid(color=GRID)
ax.set_title("Same configuration, two splits"); subtitle(ax, f"{len(d)} configurations; {100 * fr:.0f}% score lower on the similarity-aware split")
A.save(fig, "Random vs similarity-aware AUROC per configuration", f"Each point is one task × descriptor × classifier run evaluated under both splits. Points below the diagonal lose performance when relatives are separated ({100 * fr:.0f}% of {len(d)}). Test sets differ between splits, so this is a descriptive comparison.")

fig, ax = new(6.6, 4.4)
for sp, x0 in zip(SPL, range(3)):
    pass
rk = {sp: bm[bm.split == sp].groupby("feature").auroc.mean().reindex(FEATS).rank(ascending=False) for sp in SPL}
for f in FEATS:
    ys = [rk[sp][f] for sp in SPL]; ax.plot(range(3), ys, marker="o", lw=2.4, ms=7, color=FEAT_C[f])
    ax.text(2.06, ys[2], FEAT_S[f], va="center", fontsize=8.5, color=FEAT_C[f]); ax.text(-0.06, ys[0], FEAT_S[f], va="center", ha="right", fontsize=8.5, color=FEAT_C[f])
ax.set_xticks(range(3), [SPLIT_L[s] for s in SPL]); ax.set_yticks(range(1, 8)); ax.invert_yaxis(); ax.set_xlim(-0.6, 2.6); ax.set_ylabel("Rank by mean AUROC (1 = best)"); ax.grid(False)
ax.set_title("Does the best descriptor change with the split?"); subtitle(ax, "Mean AUROC over tasks and classifiers within each split type")
A.save(fig, "Descriptor ranking across split types", "Rank of each descriptor by mean test AUROC (averaged over all tasks and seven classifiers) within each split type. Crossing lines show descriptors whose advantage depends on how the test set was built. Split types cover different tasks, so ranks are only roughly comparable.")

rn = bm[bm.split == "random"]; key = ["task", "feature"]; W = np.zeros((7, 7))
pv = rn.pivot_table(index=key, columns="model", values="auroc")[MODELS]
for i, a in enumerate(MODELS):
    for j, b in enumerate(MODELS):
        if i != j: W[i, j] = (pv[a] > pv[b]).mean()
fig, ax = new(5.8, 5.0)
im = ax.imshow(W, cmap=CMAP, vmin=0, vmax=1); ax.grid(False)
ax.set_xticks(range(7), [MODEL_S[m] for m in MODELS]); ax.set_yticks(range(7), [MODEL_S[m] for m in MODELS]); ax.xaxis.tick_top()
for i in range(7):
    for j in range(7):
        if i != j: ax.text(j, i, f"{100 * W[i, j]:.0f}", ha="center", va="center", fontsize=8.5, color="white" if W[i, j] > 0.55 else INK)
for s_ in ax.spines.values(): s_.set_visible(False)
cb = fig.colorbar(im, ax=ax, shrink=0.8, pad=0.02); cb.outline.set_visible(False); cb.set_label("Fraction of cases row beats column")
ax.set_title("Pairwise classifier win rates (random splits)", pad=34); ax.text(0, 1.1, f"AUROC; {len(pv)} task × descriptor cases", transform=ax.transAxes, fontsize=8, color=MUTED)
A.save(fig, "Classifier win-rate matrix", f"For every task × descriptor case on random splits, whether the row classifier achieves higher AUROC than the column classifier; cells show the percentage of the {len(pv)} cases. It is a ranking summary rather than a significance test.")

dim = {}
import loader as L
for f in FEATS:
    dim[f] = L.load("GO_0000018", "random", f, merge_val=True).X_train.shape[1]
fig, ax = new(6.0, 4.2)
g = bm[bm.split == "random"].groupby("feature").auroc.agg(["mean", "std"]).reindex(FEATS)
for f in FEATS:
    ax.errorbar(dim[f], g.loc[f, "mean"], yerr=g.loc[f, "std"], fmt="o", color=FEAT_C[f], ms=7, capsize=3, lw=1.2); ax.annotate(FEAT_S[f], (dim[f], g.loc[f, "mean"]), xytext=(6, 5), textcoords="offset points", fontsize=8.5, color=INK2)
ax.set_xscale("log"); ax.set_xlabel("Descriptor dimensionality (log scale)"); ax.set_ylabel("Mean AUROC (random splits)"); ax.grid(False); ax.grid(color=GRID)
ax.set_title("Dimension is not performance"); subtitle(ax, "Mean over tasks and classifiers; bars are one standard deviation across runs")
A.save(fig, "Descriptor dimensionality vs performance", "Mean random-split AUROC of each descriptor against its number of features. The best and worst descriptors are not simply the largest or smallest, which is why descriptor choice should be evaluated rather than assumed.")
print("ANA", A.n)
