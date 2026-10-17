"""Reference data for the extra content sections -> site/diagram_data.json"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acommon import *
import pandas as pd
import loader as L
P = os.path.join(ROOT, "site", "diagram_data.json"); out = json.load(open(P))
out["dims"] = {f: int(L.load("GO_0000018", "random", f, merge_val=True).X_train.shape[1]) for f in FEATS}
bm = pd.read_csv(f"{RES}/benchmark_official_splits.csv"); aud = pd.read_csv(f"{RES}/audit_splits.csv")
tp = []
for t in TASKS:
    row = dict(task=TASK_L[t], splits=[])
    for sp in ["random", "target", "temporal"]:
        d = bm[(bm.task == t) & (bm.split == sp)]
        if d.empty: continue
        b = d.sort_values("auroc", ascending=False).iloc[0]; a = aud[(aud.task == t) & (aud.split == sp)].iloc[0]
        med = d.groupby("feature").auroc.mean().sort_values(ascending=False)
        row["splits"].append(dict(split=sp, n_train=int(a.n_train), n_test=int(a.n_test), n_test_pos=int(a.n_test_pos), nn_median=round(float(a.nn_median), 3),
            best=f"{FEAT_S[b.feature]} · {MODEL_S[b.model]}", best_auroc=round(float(b.auroc), 3), best_mcc=round(float(b.mcc), 3),
            top_feat=FEAT_S[med.index[0]], top_feat_auroc=round(float(med.iloc[0]), 3), low_feat=FEAT_S[med.index[-1]], low_feat_auroc=round(float(med.iloc[-1]), 3),
            mean_auroc=round(float(d.auroc.mean()), 3), mean_mcc=round(float(d.mcc.mean()), 3)))
    tp.append(row)
out["taskprof"] = tp
cm = bm.groupby(["split", "model"]).agg(auroc=("auroc", "mean"), mcc=("mcc", "mean")).reset_index()
out["modelmeans"] = [dict(split=r.split, model=MODEL_L[r.model], auroc=round(float(r.auroc), 3), mcc=round(float(r.mcc), 3)) for r in cm.itertuples()]
json.dump(out, open(P, "w")); print(out["dims"]); print(json.dumps(tp[0], indent=0)[:600])
