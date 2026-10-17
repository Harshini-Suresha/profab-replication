"""Experiment 4: leakage pruning curve with a size-matched random-removal control.

5-fold stratified CV on each task's random pool. For each test fold and threshold tau, training proteins whose
maximum proxy-similarity to any test protein is >= tau are removed ("pruned"). A control removes the same number
of randomly chosen training proteins ("control", 3 draws) so that loss of training data is not mistaken for
loss of leakage.
"""
import os, sys, time, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd
from joblib import Parallel, delayed
from sklearn.model_selection import StratifiedKFold
import loader as L
from common import base_estimator, scores, metrics
from pools import aligned_pool

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "results")
TAUS = [0.99, 0.95, 0.90, 0.85, 0.80, 0.70]
PFEATS = ["aac", "ctriad", "kpssm"]
PMODELS = ["logreg", "svm", "knn", "rf", "nn1"]
N_CONTROL = 3


def make(name):
    est = base_estimator(name, n_jobs=1)
    if name == "rf":
        est.set_params(n_estimators=200)
    return est


def evaluate(X, y, tr, te, feat, model):
    if len(np.unique(y[tr])) < 2:
        return None
    est = make(model).fit(X[feat][tr], y[tr])
    s = scores(est, X[feat][te]); p = est.predict(X[feat][te])
    m = metrics(y[te], p, s)
    return dict(mcc=m["mcc"], auroc=m["auroc"], auprc=m["auprc"], accuracy=m["accuracy"])


def run(task, fold_id):
    acc, X, y, Z = aligned_pool(task)
    tr, te = list(StratifiedKFold(5, shuffle=True, random_state=2000).split(Z, y))[fold_id]
    s_tr = (Z[tr] @ Z[te].T).max(1)
    rng = np.random.default_rng(fold_id)
    rows = []
    for feat in PFEATS:
        for model in PMODELS:
            r = evaluate(X, y, tr, te, feat, model)
            rows.append(dict(task=task, fold=fold_id, feature=feat, model=model, tau=np.nan, condition="full",
                             draw=0, n_train=len(tr), n_removed=0, **r))
    for tau in TAUS:
        keep = tr[s_tr < tau]
        n_rm = len(tr) - len(keep)
        if n_rm == 0:
            continue
        for feat in PFEATS:
            for model in PMODELS:
                r = evaluate(X, y, keep, te, feat, model)
                if r:
                    rows.append(dict(task=task, fold=fold_id, feature=feat, model=model, tau=tau, condition="pruned",
                                     draw=0, n_train=len(keep), n_removed=n_rm, **r))
        for d in range(N_CONTROL):
            ctrl = np.sort(rng.choice(tr, size=len(keep), replace=False))
            for feat in PFEATS:
                for model in PMODELS:
                    r = evaluate(X, y, ctrl, te, feat, model)
                    if r:
                        rows.append(dict(task=task, fold=fold_id, feature=feat, model=model, tau=tau,
                                         condition="control", draw=d, n_train=len(ctrl), n_removed=n_rm, **r))
    return pd.DataFrame(rows)


if __name__ == "__main__":
    jobs = [(t, f) for t in L.TASKS for f in range(5)]
    t0 = time.time()
    res = Parallel(n_jobs=2, verbose=5)(delayed(run)(*j) for j in jobs)
    df = pd.concat(res, ignore_index=True)
    df.to_csv(f"{OUT}/pruning_curve.csv", index=False)
    print("done", round(time.time() - t0), "s", df.shape)
