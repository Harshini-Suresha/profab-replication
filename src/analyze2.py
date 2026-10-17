"""Part C-E: pruning, stock-loader comparison, proxy cross-matrix -> appended to results/site_data.json."""
import os, sys, json, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(ROOT, "results")
OUT = json.load(open(f"{R}/site_data.json"))
rng = np.random.default_rng(11)

def rnd(x, n=4):
    return None if (isinstance(x, (float, np.floating)) and np.isnan(x)) else (round(float(x), n) if isinstance(x, (float, np.floating)) else x)
def recs(df, n=4): return [{k: rnd(v, n) for k, v in r.items()} for r in df.to_dict("records")]
def boot(v, n=4000):
    v = np.asarray(v, float); v = v[~np.isnan(v)]
    b = rng.choice(v, (n, len(v))).mean(1); return float(v.mean()), float(np.percentile(b, 2.5)), float(np.percentile(b, 97.5))

# ---- pruning: per (task, fold, feature, model, tau) paired differences vs the size-matched control
p = pd.read_csv(f"{R}/pruning_curve.csv")
full = p[p.condition == "full"].set_index(["task", "fold", "feature", "model"])[["auroc", "mcc"]]
pr = p[p.condition == "pruned"].set_index(["task", "fold", "feature", "model", "tau"])
ct = p[p.condition == "control"].groupby(["task", "fold", "feature", "model", "tau"])[["auroc", "mcc", "n_train"]].mean()
rows = []
for (f, m, tau), _ in pr.reset_index().groupby(["feature", "model", "tau"]):
    a = pr.xs((f, m, tau), level=("feature", "model", "tau"))
    c = ct.xs((f, m, tau), level=("feature", "model", "tau"))
    fl = full.xs((f, m), level=("feature", "model"))
    idx = a.index.intersection(c.index)
    if len(idx) < 5: continue
    d_pr = (fl.loc[idx, "auroc"] - a.loc[idx, "auroc"]).values
    d_ct = (fl.loc[idx, "auroc"] - c.loc[idx, "auroc"]).values
    gap = (c.loc[idx, "auroc"] - a.loc[idx, "auroc"]).values
    mg = boot(gap)
    rows.append(dict(feature=f, model=m, tau=tau, n_folds=len(idx), auroc_full=fl.loc[idx, "auroc"].mean(), auroc_pruned=a.loc[idx, "auroc"].mean(),
                     auroc_control=c.loc[idx, "auroc"].mean(), mcc_full=fl.loc[idx, "mcc"].mean(), mcc_pruned=a.loc[idx, "mcc"].mean(),
                     mcc_control=c.loc[idx, "mcc"].mean(), drop_pruned=d_pr.mean(), drop_control=d_ct.mean(),
                     gap=mg[0], gap_lo=mg[1], gap_hi=mg[2], removed=a.loc[idx, "n_removed"].mean(), n_train_kept=a.loc[idx, "n_train"].mean()))
OUT["pruning"] = recs(pd.DataFrame(rows))

# ---- stock loader
s = pd.read_csv(f"{R}/stock_loader_comparison.csv")
OUT["stock"] = recs(s.groupby(["feature", "split", "model"])[["mcc_stock", "mcc_keyed", "auroc_stock", "auroc_keyed", "nn_median_stock", "nn_median_keyed"]].mean().reset_index())
OUT["stock_summary"] = recs(s.groupby(["feature", "split"])[["mcc_stock", "mcc_keyed", "auroc_stock", "auroc_keyed", "nn_median_stock", "nn_median_keyed"]].mean().reset_index())
OUT["kpssm_alignment"] = recs(pd.read_csv(f"{R}/audit_kpssm_alignment.csv"))
OUT["kpssm_positional"] = recs(pd.read_csv(f"{R}/audit_kpssm_positional.csv"))

# ---- proxy cross
x = pd.read_csv(f"{R}/proxy_cross.csv")
x["tau"] = x.tau.fillna(-1)
g = x.groupby(["group_space", "tau", "feature"])[["auroc", "auprc", "mcc", "largest_group", "nn_ctriad_median", "nn_kpssm_median"]].mean().reset_index()
# random baseline per space averaged over both spaces (identical regime)
rb = x[x.tau == -1].groupby("feature")[["auroc", "mcc"]].mean()
OUT["proxy_cross"] = recs(g)
OUT["proxy_random"] = {f: dict(auroc=rnd(v.auroc), mcc=rnd(v.mcc)) for f, v in rb.iterrows()}
d = []
for (sp, tau, f), gg in x[x.tau != -1].groupby(["group_space", "tau", "feature"]):
    base = x[(x.group_space == sp) & (x.tau == -1) & (x.feature == f)].set_index(["task", "model", "rep"]).auroc
    cur = gg.set_index(["task", "model", "rep"]).auroc
    idx = cur.index.intersection(base.index)
    dd = (base.loc[idx] - cur.loc[idx]).groupby(level=["task", "model"]).mean().values
    m = boot(dd)
    d.append(dict(group_space=sp, tau=tau, feature=f, inflation=m[0], lo=m[1], hi=m[2], n=len(dd)))
OUT["proxy_inflation"] = recs(pd.DataFrame(d), 5)

# ---- own-space similarity audit
sp = pd.read_csv(f"{R}/audit_spaces.csv")
OUT["spaces_task"] = recs(sp)
OUT["spaces_summary"] = recs(sp.groupby(["split", "space"])[["median", "q25", "q75", "frac_ge_09", "frac_ge_095", "frac_ge_099"]].mean().reset_index())
kn = pd.read_csv(f"{R}/test_to_train_nn_kpssm.csv")
grid = np.linspace(0, 1, 101)
OUT["nn_ecdf_kpssm"] = {sname: [round(float((np.sort(g.nn_sim.values) <= x).mean()), 4) for x in grid] for sname, g in kn.groupby("split")}
json.dump(OUT, open(f"{R}/site_data.json", "w"))
print("wrote part C-E")
