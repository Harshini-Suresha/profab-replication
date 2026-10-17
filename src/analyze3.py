"""Part F: ROC / PR curves and calibration-free summaries from stored test scores -> results/site_curves.json"""
import os, sys, json, pickle, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(ROOT, "results")
recs = pickle.load(open(f"{R}/benchmark_test_scores.pkl", "rb"))
b = pd.read_csv(f"{R}/benchmark_official_splits.csv")


def roc_pr(y, s, npts=70):
    y = np.asarray(y); s = np.asarray(s, float)
    o = np.argsort(-s, kind="mergesort"); ys = y[o]; ss = s[o]
    tp = np.cumsum(ys); fp = np.cumsum(1 - ys)
    last = np.r_[np.where(np.diff(ss))[0], len(ss) - 1]
    tp = np.r_[0, tp[last]]; fp = np.r_[0, fp[last]]
    P, N = y.sum(), len(y) - y.sum()
    tpr = tp / P; fpr = fp / N
    prec = np.r_[1.0, tp[1:] / np.maximum(tp[1:] + fp[1:], 1)]
    # thin to <= npts points, keeping the endpoints
    def thin(a, b_):
        if len(a) <= npts:
            return [round(float(x), 4) for x in a], [round(float(x), 4) for x in b_]
        idx = np.unique(np.linspace(0, len(a) - 1, npts).astype(int))
        return [round(float(a[i]), 4) for i in idx], [round(float(b_[i]), 4) for i in idx]
    rx, ry = thin(fpr, tpr)
    px, py = thin(tpr, prec)
    return dict(fpr=rx, tpr=ry, rec=px, prec=py, prevalence=round(float(P / len(y)), 4))


idx = {(r[0], r[1], r[2], r[3]): r for r in recs}
best = b.sort_values("mcc", ascending=False).groupby(["task", "split"]).head(1)
out = {}
for _, row in b.iterrows():
    pass
for (task, split), g in b.groupby(["task", "split"]):
    sel = {}
    top = g.sort_values("auroc", ascending=False).iloc[0]
    for name, (f, m) in dict(best=(top.feature, top.model), ref_svm_ctriad=("ctriad", "svm"), ref_rf_aac=("aac", "rf"),
                             ref_logreg_kpssm=("kpssm", "logreg")).items():
        r = idx.get((task, split, f, m))
        if r is None:
            continue
        _, _, _, _, acc, y, s, p = r
        sel[name] = dict(feature=f, model=m, **roc_pr(y, s))
    out[f"{task}|{split}"] = sel
json.dump(out, open(f"{R}/site_curves.json", "w"))
print("curves for", len(out), "task/split pairs;", sum(len(v) for v in out.values()), "curves")
