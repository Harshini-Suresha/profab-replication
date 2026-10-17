"""Experiment 1: baseline benchmark on the official ProFAB train/test splits.

task x split x descriptor x classifier. Hyper-parameters are tuned by inner 3-fold CV (AUROC) on the
training set only; temporal validation members are merged into training before tuning.
"""
import os, sys, time, pickle, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd
from joblib import Parallel, delayed
import loader as L
from common import MODELS, fit_model, scores, metrics, bootstrap_ci

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "results"); os.makedirs(OUT, exist_ok=True)


def job(task, split, feat, model):
    t0 = time.time()
    sp = L.load(task, split, feat, merge_val=True)
    est, params = fit_model(model, sp.X_train, sp.y_train, tune=True)
    s = scores(est, sp.X_test)
    p = est.predict(sp.X_test)
    m = metrics(sp.y_test, p, s)
    ci = bootstrap_ci(sp.y_test, p, s, n_boot=500)
    row = dict(task=task, split=split, feature=feat, model=model, n_train=len(sp.y_train), n_test=len(sp.y_test),
               n_test_pos=int(sp.y_test.sum()), dropped_missing=sp.n_dropped, params=str(params),
               seconds=round(time.time() - t0, 2), **m)
    for k, (lo, hi) in ci.items():
        row[f"{k}_lo"] = lo; row[f"{k}_hi"] = hi
    return row, (task, split, feat, model, sp.acc_test, sp.y_test, s, p)


if __name__ == "__main__":
    FEATS = ["aac", "paac", "gaac", "ctdt", "socnumber", "ctriad", "kpssm"]
    jobs = []
    for task in L.TASKS:
        for split in L.available_splits(task):
            if sum(v for k, v in L.index_audit(task, split).items() if "oob" in k):
                continue
            for f in FEATS:
                for m in MODELS:
                    jobs.append((task, split, f, m))
    print(len(jobs), "configurations", flush=True)
    res = Parallel(n_jobs=2, verbose=5)(delayed(job)(*j) for j in jobs)
    df = pd.DataFrame([r for r, _ in res])
    df.to_csv(f"{OUT}/benchmark_official_splits.csv", index=False)
    with open(f"{OUT}/benchmark_test_scores.pkl", "wb") as fh:
        pickle.dump([x for _, x in res], fh)
    print(df.groupby(["split"])[["mcc", "auroc", "auprc"]].mean().round(3))
