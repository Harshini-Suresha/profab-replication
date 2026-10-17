"""Aggregate raw results into one JSON document (results/site_data.json) plus CSV tables."""
import os, sys, json, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd
from scipy.stats import wilcoxon
import loader as L
from common import auroc, auprc, mcc_from, confusion, MODEL_LABEL, FEATURE_LABEL

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(ROOT, "results")
OUT = {}
rng = np.random.default_rng(7)


def rnd(x, n=4):
    if isinstance(x, (float, np.floating)):
        return None if np.isnan(x) else round(float(x), n)
    return x


def df_records(df, n=4):
    return [{k: rnd(v, n) for k, v in r.items()} for r in df.to_dict("records")]


def boot_mean_ci(v, n=4000):
    v = np.asarray(v, float); v = v[~np.isnan(v)]
    if len(v) == 0: return (np.nan, np.nan, np.nan)
    b = rng.choice(v, (n, len(v))).mean(1)
    return float(v.mean()), float(np.percentile(b, 2.5)), float(np.percentile(b, 97.5))


# ------------------------------------------------------------------ meta
OUT["tasks"] = {k: dict(id=v[0], name=v[1], family=v[2]) for k, v in L.TASKS.items()}
OUT["feature_label"] = FEATURE_LABEL
OUT["model_label"] = MODEL_LABEL

# ------------------------------------------------------------------ 0. audit
aud = pd.read_csv(f"{R}/audit_splits.csv")
OUT["audit_splits"] = df_records(aud)
OUT["audit_index"] = df_records(pd.read_csv(f"{R}/audit_index_integrity.csv"))
nn = pd.read_csv(f"{R}/test_to_train_nn_similarity.csv")
grid = np.linspace(0, 1, 101)
ecdf = {}
for (t, s), g in nn.groupby(["task", "split"]):
    v = np.sort(g.nn_sim.values)
    ecdf[f"{t}|{s}"] = [round(float((v <= x).mean()), 4) for x in grid]
OUT["nn_ecdf"] = dict(grid=[round(float(x), 2) for x in grid], curves=ecdf)
agg = nn.groupby("split").nn_sim.apply(lambda v: pd.Series(dict(n=len(v), median=v.median(), q25=v.quantile(.25), q75=v.quantile(.75),
                                                                  frac_ge_09=(v >= .9).mean(), frac_ge_095=(v >= .95).mean())))
OUT["nn_summary"] = {s: {k: rnd(v) for k, v in g.items()} for s, g in agg.unstack().iterrows()}

# ------------------------------------------------------------------ 1. official benchmark
b = pd.read_csv(f"{R}/benchmark_official_splits.csv")
b.to_csv(f"{R}/table_benchmark_full.csv", index=False)
keep = ["task", "split", "feature", "model", "n_train", "n_test", "n_test_pos", "mcc", "mcc_lo", "mcc_hi", "auroc", "auroc_lo", "auroc_hi",
        "auprc", "auprc_lo", "auprc_hi", "accuracy", "balanced_accuracy", "precision", "recall", "specificity", "f1", "tp", "fp", "tn", "fn"]
OUT["benchmark"] = df_records(b[keep], 4)
hm = b.groupby(["split", "feature", "model"])[["mcc", "auroc", "auprc"]].mean().reset_index()
OUT["bench_heat"] = df_records(hm)
top = b.sort_values("mcc", ascending=False).groupby(["task", "split"]).head(1)
OUT["bench_best"] = df_records(top[["task", "split", "feature", "model", "mcc", "mcc_lo", "mcc_hi", "auroc", "auprc", "n_test", "n_test_pos"]])

# paired split comparison (task x feature x model)
piv = b.pivot_table(index=["task", "feature", "model"], columns="split", values=["mcc", "auroc", "auprc"])
cmp_rows = []
for metric in ("mcc", "auroc", "auprc"):
    for a_, b_ in (("random", "target"), ("random", "temporal"), ("target", "temporal")):
        d = (piv[(metric, a_)] - piv[(metric, b_)]).dropna()
        if len(d) < 6: continue
        m, lo, hi = boot_mean_ci(d.values)
        try:
            p = wilcoxon(d.values).pvalue
        except Exception:
            p = np.nan
        cmp_rows.append(dict(metric=metric, a=a_, b=b_, n_pairs=int(len(d)), mean_diff=m, lo=lo, hi=hi, wilcoxon_p=p,
                             frac_a_better=float((d > 0).mean())))
OUT["split_compare"] = df_records(pd.DataFrame(cmp_rows), 5)
# per-task, per-split mean metrics
OUT["bench_task_split"] = df_records(b.groupby(["task", "split"])[["mcc", "auroc", "auprc"]].mean().reset_index())
OUT["model_rank"] = df_records(b.groupby(["split", "model"])[["mcc", "auroc"]].mean().reset_index())
OUT["feature_rank"] = df_records(b.groupby(["split", "feature"])[["mcc", "auroc"]].mean().reset_index())

# ------------------------------------------------------------------ 2. controlled CV
oof = pd.read_pickle(f"{R}/controlled_oof.pkl")
cm = pd.read_csv(f"{R}/controlled_cluster_meta.csv")
OUT["cluster_meta"] = df_records(cm.groupby(["task", "regime"]).agg(n=("n", "first"), n_clusters=("n_clusters", "mean"),
                                                                     largest=("largest_cluster_frac", "mean"),
                                                                     singleton=("singleton_frac", "mean")).reset_index())
rows = []
for key, g in oof.groupby(["task", "regime", "rep", "feature", "model"], sort=False):
    y = g.y.values; s = g.score.values.astype(float); p = g.pred.values
    rows.append(dict(zip(["task", "regime", "rep", "feature", "model"], key), auroc=auroc(y, s), auprc=auprc(y, s),
                     mcc=mcc_from(*confusion(y, p)), nn_median=float(np.median(g.nn_sim)),
                     frac_nn_ge_09=float((g.nn_sim >= .9).mean())))
ctl = pd.DataFrame(rows)
ctl.to_csv(f"{R}/table_controlled_cv.csv", index=False)
ctl["tau"] = ctl.regime.map(lambda r: np.nan if r == "random" else float(r.split("_")[1]))
cm_ = ctl.groupby(["regime", "tau", "feature", "model"])[["auroc", "auprc", "mcc", "nn_median", "frac_nn_ge_09"]].mean().reset_index()
OUT["controlled"] = df_records(cm_)
OUT["controlled_task"] = df_records(ctl.groupby(["task", "regime", "tau", "feature", "model"], dropna=False)[["auroc", "mcc"]].mean().reset_index())
# paired inflation: random - cluster_tau, per task x feature x model (rep-averaged)
base = ctl[ctl.regime == "random"].groupby(["task", "feature", "model"])[["auroc", "auprc", "mcc"]].mean()
infl = []
for r in sorted(set(ctl.regime) - {"random"}, key=lambda s: -float(s.split("_")[1])):
    c = ctl[ctl.regime == r].groupby(["task", "feature", "model"])[["auroc", "auprc", "mcc"]].mean()
    d = (base - c).reset_index()
    for f, gg in d.groupby("feature"):
        for metric in ("auroc", "mcc"):
            m, lo, hi = boot_mean_ci(gg[metric].values)
            infl.append(dict(regime=r, tau=float(r.split("_")[1]), feature=f, metric=metric, mean_inflation=m, lo=lo, hi=hi, n=len(gg)))
OUT["inflation"] = df_records(pd.DataFrame(infl), 5)

# held-out performance as a function of nearest-training-neighbour similarity (random folds only)
bins = [-1, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 0.99, 1.01]
labels = ["<0.3", "0.3-0.5", "0.5-0.7", "0.7-0.8", "0.8-0.9", "0.9-0.95", "0.95-0.99", ">=0.99"]
rr = oof[oof.regime == "random"].copy()
rr["bin"] = pd.cut(rr.nn_sim, bins=bins, labels=labels, right=False)
rr["ok"] = (rr.y == rr.pred).astype(int)
bn = []
for (t, f, m, bi), g in rr.groupby(["task", "feature", "model", "bin"], observed=True):
    pos = g[g.y == 1].ok; neg = g[g.y == 0].ok
    if len(pos) >= 3 and len(neg) >= 3:
        bn.append(dict(task=t, feature=f, model=m, bin=str(bi), n=len(g), bal_acc=(pos.mean() + neg.mean()) / 2))
bn = pd.DataFrame(bn)
agg_bin = []
for (f, m, bi), g in bn.groupby(["feature", "model", "bin"]):
    w = g.n.values
    agg_bin.append(dict(feature=f, model=m, bin=bi, n=int(w.sum()), n_tasks=len(g), bal_acc=float(np.average(g.bal_acc, weights=w)),
                        err=float(1 - np.average(g.bal_acc, weights=w))))
OUT["bin_perf"] = df_records(pd.DataFrame(agg_bin))
OUT["bin_labels"] = labels
cnt = rr[rr.feature == "ctriad"][rr.model == "svm"].groupby("bin", observed=True).size()
OUT["bin_counts"] = {str(k): int(v) for k, v in cnt.items()}

json.dump(OUT, open(f"{R}/site_data.json", "w"))
print("wrote part A/B", {k: (len(v) if hasattr(v, '__len__') else v) for k, v in OUT.items()})
