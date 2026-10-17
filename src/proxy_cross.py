"""Experiment 6: which descriptor does each homology proxy protect against?

Homology-aware CV groups are built from similarity in one descriptor space (conjoint triad or k-separated-bigram PSSM,
mean-centred cosine, single linkage at tau). Every descriptor is then evaluated under those groups.
"""
import os, sys, time, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd
from joblib import Parallel, delayed
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import connected_components
from sklearn.model_selection import StratifiedKFold, StratifiedGroupKFold
import loader as L
from common import centered_unit, base_estimator, scores, auroc, mcc_from, confusion, auprc
from pools import aligned_pool

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPACES = {"ctriad": [0.95, 0.90, 0.85, 0.80], "kpssm": [0.99, 0.97, 0.95, 0.90]}
FEATS = ["aac", "paac", "ctriad", "kpssm"]
MODELS = ["svm", "logreg", "rf"]
REPS = 2


def make(m):
    e = base_estimator(m, n_jobs=1)
    if m == "rf": e.set_params(n_estimators=100)
    return e


def run(task, space, tau, rep):
    acc, X, y, _ = aligned_pool(task)
    Zs = centered_unit(X[space]); S = Zs @ Zs.T; np.fill_diagonal(S, -1)
    if tau is None:
        sp = StratifiedKFold(5, shuffle=True, random_state=500 + rep).split(Zs, y); lg = 0.0; ng = len(y)
    else:
        g = connected_components(csr_matrix(S >= tau), directed=False)[1]
        sp = StratifiedGroupKFold(5, shuffle=True, random_state=500 + rep).split(Zs, y, g)
        lg = float(np.bincount(g).max() / len(y)); ng = int(g.max() + 1)
    store = {(f, m): ([], [], []) for f in FEATS for m in MODELS}
    nn_all = {s: [] for s in SPACES}
    Zsp = {s: centered_unit(X[s]) for s in SPACES}
    for tr, te in sp:
        for s in SPACES:
            nn_all[s].append((Zsp[s][te] @ Zsp[s][tr].T).max(1))
        for f in FEATS:
            for m in MODELS:
                est = make(m).fit(X[f][tr], y[tr]); sc = scores(est, X[f][te]); pr = est.predict(X[f][te])
                a, b, c = store[(f, m)]; a.append(y[te]); b.append(sc); c.append(pr)
    rows = []
    for (f, m), (a, b, c) in store.items():
        yy, ss, pp = np.concatenate(a), np.concatenate(b), np.concatenate(c)
        rows.append(dict(task=task, group_space=space, tau=tau if tau is not None else np.nan, rep=rep, feature=f, model=m,
                         auroc=auroc(yy, ss), auprc=auprc(yy, ss), mcc=mcc_from(*confusion(yy, pp)),
                         largest_group=lg, n_groups=ng,
                         nn_ctriad_median=float(np.median(np.concatenate(nn_all["ctriad"]))),
                         nn_kpssm_median=float(np.median(np.concatenate(nn_all["kpssm"])))))
    return rows


PARTS = os.path.join(ROOT, "results", "proxy_cross_parts")


def run_cached(task, space, tau, rep):
    os.makedirs(PARTS, exist_ok=True)
    f = os.path.join(PARTS, f"{task}__{space}__{'none' if tau is None else tau}__{rep}.csv")
    if os.path.exists(f):
        return pd.read_csv(f).to_dict("records")
    rows = run(task, space, tau, rep)
    pd.DataFrame(rows).to_csv(f + ".tmp", index=False); os.replace(f + ".tmp", f)
    return rows


if __name__ == "__main__":
    jobs = []
    for t in L.TASKS:
        for s, taus in SPACES.items():
            for r in range(REPS):
                jobs.append((t, s, None, r))   # random folds (recorded once per space, identical regime)
                for tau in taus:
                    jobs.append((t, s, tau, r))
    print(len(jobs), "jobs", flush=True)
    t0 = time.time()
    res = Parallel(n_jobs=2, verbose=5)(delayed(run_cached)(*j) for j in jobs)
    df = pd.DataFrame([r for rr in res for r in rr])
    df.to_csv(os.path.join(ROOT, "results", "proxy_cross.csv"), index=False)
    print("done", round(time.time() - t0), "s", df.shape)
