"""Additional analyses: paired tests, sensitivity by descriptor / classifier, task x descriptor matrices -> site/diagram_data.json"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acommon import *
import pandas as pd
from scipy.stats import wilcoxon, spearmanr
P = os.path.join(ROOT, "site", "diagram_data.json"); out = json.load(open(P))
bm = pd.read_csv(f"{RES}/benchmark_official_splits.csv"); aud = pd.read_csv(f"{RES}/audit_splits.csv")
rng = np.random.RandomState(0)
# paired tests random vs target and random vs temporal, per task and pooled over configs
def paired(t, other):
    a = bm[(bm.task == t) & (bm.split == "random")].set_index(["feature", "model"]); b = bm[(bm.task == t) & (bm.split == other)].set_index(["feature", "model"])
    idx = a.index.intersection(b.index); res = {}
    for m in ("auroc", "mcc"):
        d = (b.loc[idx, m] - a.loc[idx, m]).to_numpy(); w = wilcoxon(d)
        res[m] = dict(mean=round(float(d.mean()), 4), median=round(float(np.median(d)), 4), frac_down=round(float((d < 0).mean()), 3), p=float(w.pvalue))
    return dict(task=TASK_L[t], other=other, n=int(len(idx)), **res)
out["paired"] = [paired(t, o) for t, o in [("GO_0000018", "target"), ("GO_0000018", "temporal"), ("ecNo_1-2-4", "target"), ("ecNo_1-2-7", "target")]]
# sensitivity: drop random -> similarity-aware, by descriptor and by classifier, over tasks that have both
def sens(key):
    rows = []
    for k in sorted(bm[key].unique()):
        ds = []
        for t in ("GO_0000018", "ecNo_1-2-4", "ecNo_1-2-7"):
            a = bm[(bm.task == t) & (bm.split == "random") & (bm[key] == k)].set_index(["feature", "model"]).auroc
            b = bm[(bm.task == t) & (bm.split == "target") & (bm[key] == k)].set_index(["feature", "model"]).auroc
            ds += list((b - a.loc[b.index]).to_numpy())
        ds = np.array(ds); bs = [rng.choice(ds, len(ds)).mean() for _ in range(2000)]
        rows.append(dict(k=(FEAT_S if key == "feature" else MODEL_S)[k], mean=round(float(ds.mean()), 4), lo=round(float(np.percentile(bs, 2.5)), 4), hi=round(float(np.percentile(bs, 97.5)), 4), n=int(len(ds))))
    return rows
out["sens_feat"] = sens("feature"); out["sens_model"] = sens("model")
# task x descriptor mean AUROC / MCC per split
mats = {}
for sp in ("random", "target"):
    d = bm[bm.split == sp].groupby(["task", "feature"]).agg(auroc=("auroc", "mean"), mcc=("mcc", "mean")).reset_index()
    mats[sp] = dict(tasks=[TASK_L[t] for t in TASKS if t in set(d.task)], feats=[FEAT_S[f] for f in FEATS],
                    auroc=[[round(float(d[(d.task == t) & (d.feature == f)].auroc.iloc[0]), 3) for f in FEATS] for t in TASKS if t in set(d.task)],
                    mcc=[[round(float(d[(d.task == t) & (d.feature == f)].mcc.iloc[0]), 3) for f in FEATS] for t in TASKS if t in set(d.task)])
out["mats"] = mats
# median similarity vs mean performance across the 8 splits
m = bm.groupby(["task", "split"]).agg(auroc=("auroc", "mean"), mcc=("mcc", "mean")).reset_index().merge(aud[["task", "split", "nn_median"]], on=["task", "split"])
out["simperf"] = dict(pts=[dict(l=f"{TASK_L[r.task]} {SPL}", x=round(float(r.nn_median), 3), auroc=round(float(r.auroc), 3), mcc=round(float(r.mcc), 3), split=r.split) for r in m.itertuples() for SPL in [r.split[:3]]],
                      rho_auroc=round(float(spearmanr(m.nn_median, m.auroc)[0]), 3), rho_mcc=round(float(spearmanr(m.nn_median, m.mcc)[0]), 3))
json.dump(out, open(P, "w"))
for p in out["paired"]: print(p)
print(out["sens_feat"]); print(out["sens_model"]); print(out["simperf"]["rho_auroc"], out["simperf"]["rho_mcc"])
