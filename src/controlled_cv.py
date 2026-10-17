"""Experiment 2/3: same-pool comparison of random vs homology-aware cross-validation.

For each task, the whole random-split pool is cross-validated (5 folds) either with ordinary stratified
folds or with stratified group folds where groups are single-linkage groups (connected components) of the pool at a
similarity threshold tau (conjoint-triad, mean-centred cosine proxy). Out-of-fold scores are stored together
with every held-out protein's maximum similarity to its training fold.
"""
import os, sys, time, pickle, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd
from joblib import Parallel, delayed
from sklearn.model_selection import StratifiedKFold, StratifiedGroupKFold
import loader as L
from common import base_estimator, scores, max_sim_to
from pools import aligned_pool, cluster_groups, CTRL_FEATS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "results")
TAUS = [0.95, 0.90, 0.85, 0.80, 0.70]
RANDOM_REPS, CLUSTER_REPS = 4, 2
CMODELS = ["logreg", "svm", "knn", "rf", "nn1"]


def make(name):
    est = base_estimator(name, n_jobs=1)
    if name == "rf":
        est.set_params(n_estimators=200)
    return est


def run_foldset(task, regime, rep):
    acc, X, y, Z = aligned_pool(task)
    seed = 1000 + rep
    if regime == "random":
        splitter = StratifiedKFold(5, shuffle=True, random_state=seed).split(Z, y)
        groups = None
    else:
        tau = float(regime.split("_")[1])
        groups = cluster_groups(Z, tau)
        splitter = StratifiedGroupKFold(5, shuffle=True, random_state=seed).split(Z, y, groups)
    rec = []
    for fold, (tr, te) in enumerate(splitter):
        nn = max_sim_to(Z[te], Z[tr])
        for f in CTRL_FEATS:
            for m in CMODELS:
                est = make(m).fit(X[f][tr], y[tr])
                s = scores(est, X[f][te]); p = est.predict(X[f][te])
                rec.append(pd.DataFrame(dict(task=task, regime=regime, rep=rep, fold=fold, feature=f, model=m,
                                             acc=np.array(acc)[te], y=y[te], score=s.astype("float32"),
                                             pred=p.astype("int8"), nn_sim=nn.astype("float32"))))
    meta = dict(task=task, regime=regime, rep=rep, n=len(y))
    if groups is not None:
        sizes = np.bincount(groups)[1:]
        meta.update(n_clusters=int(len(sizes)), largest_cluster_frac=float(sizes.max() / len(y)),
                    singleton_frac=float((sizes == 1).sum() / len(sizes)))
    return pd.concat(rec, ignore_index=True), meta


if __name__ == "__main__":
    tasks = list(L.TASKS)
    jobs = []
    for t in tasks:
        for r in range(RANDOM_REPS):
            jobs.append((t, "random", r))
        for tau in TAUS:
            for r in range(CLUSTER_REPS):
                jobs.append((t, f"cluster_{tau}", r))
    print(len(jobs), "fold-sets", flush=True)
    t0 = time.time()
    res = Parallel(n_jobs=2, verbose=5)(delayed(run_foldset)(*j) for j in jobs)
    oof = pd.concat([r for r, _ in res], ignore_index=True)
    meta = pd.DataFrame([m for _, m in res])
    oof.to_pickle(f"{OUT}/controlled_oof.pkl")
    meta.to_csv(f"{OUT}/controlled_cluster_meta.csv", index=False)
    print("done in", round(time.time() - t0), "s", oof.shape)
    print(meta.groupby(["task", "regime"])[["largest_cluster_frac", "n_clusters"]].mean().round(3))
