"""Data for the Sankey and chord diagrams -> site/diagram_data.json"""
import os, sys, json, pickle
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acommon import *
import pandas as pd
from sklearn.model_selection import StratifiedKFold, StratifiedGroupKFold
from pools import aligned_pool, cluster_groups

aud = pd.read_csv(f"{RES}/audit_splits.csv")
out = {"splits": []}
for _, r in aud.iterrows():
    ntr, nte, npos = int(r.n_train), int(r.n_test), int(r.n_test_pos)
    trp = int(round(r.pos_rate_train * ntr))
    out["splits"].append(dict(task=TASK_L[r.task], split=r.split, train_pos=trp, train_neg=ntr - trp, test_pos=npos, test_neg=nte - npos))

nn = pd.read_csv(f"{RES}/test_to_train_nn_similarity.csv")
sc = pickle.load(open(f"{RES}/benchmark_test_scores.pkl", "rb"))
rows = []
for t, sp, f, m, acc, y, s_, pr in sc:
    if f == "ctriad" and m == "svm":
        rows.append(pd.DataFrame(dict(task=t, split=sp, acc=list(acc), ok=(np.asarray(pr) == np.asarray(y)))))
pr = pd.concat(rows).merge(nn[["task", "split", "acc", "nn_sim"]], on=["task", "split", "acc"])
edges = [0, 0.5, 0.7, 0.9, 1.01]; labs = ["< 0.5", "0.5–0.7", "0.7–0.9", "≥ 0.9"]
pr["bin"] = pd.cut(pr.nn_sim, edges, labels=labs, right=False)
out["outcome"] = [dict(split=sp, bin=b, ok=int(g.ok.sum()), err=int((~g.ok).sum())) for (sp, b), g in pr.groupby(["split", "bin"], observed=True)]

tau = 0.85
def chord(task, groups):
    acc, X, y, Z = aligned_pool(task); S = Z @ Z.T; np.fill_diagonal(S, -1)
    if groups:
        g = cluster_groups(Z, tau); fold = np.zeros(len(y), int)
        for k, (_, te) in enumerate(StratifiedGroupKFold(5, shuffle=True, random_state=0).split(Z, y, g)): fold[te] = k
    else:
        fold = np.zeros(len(y), int)
        for k, (_, te) in enumerate(StratifiedKFold(5, shuffle=True, random_state=0).split(Z, y)): fold[te] = k
    A = (S >= tau)
    M = np.zeros((5, 5), int)
    for i in range(5):
        for j in range(5):
            M[i, j] = int(A[np.ix_(fold == i, fold == j)].sum())
    return dict(task=TASK_L[task], mode="grouped" if groups else "random", sizes=[int((fold == k).sum()) for k in range(5)], M=M.tolist())
out["chord"] = [chord(t, g) for t in ("GO_0000018", "ecNo_1-2-4") for g in (False, True)]
out["tau"] = tau
json.dump(out, open(os.path.join(ROOT, "site", "diagram_data.json"), "w"))
for c in out["chord"]: print(c["task"], c["mode"], "cross-fold pairs", sum(sum(r) for r in c["M"]) - sum(c["M"][i][i] for i in range(5)), "within", sum(c["M"][i][i] for i in range(5)))
print(pd.DataFrame(out["outcome"]).assign(rate=lambda d: d.err/(d.ok+d.err)).to_string())
