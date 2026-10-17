"""Experiment 7: test-to-train nearest-neighbour similarity measured in each descriptor's own space."""
import os, sys, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd
import loader as L
from common import centered_unit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SP = ["aac", "paac", "ctdt", "ctriad", "kpssm"]
rows, samples = [], []
for task in L.TASKS:
    for split in L.available_splits(task):
        if sum(v for k, v in L.index_audit(task, split).items() if "oob" in k):
            continue
        for sp_ in SP:
            s = L.load(task, split, sp_, merge_val=True)
            mu = L.descriptor(task, split, sp_).drop(columns="y").to_numpy(float).mean(0)
            nn = (centered_unit(s.X_test, mu) @ centered_unit(s.X_train, mu).T).max(1)
            rows.append(dict(task=task, split=split, space=sp_, n_test=len(nn), median=np.median(nn), q25=np.quantile(nn, .25), q75=np.quantile(nn, .75),
                             frac_ge_09=(nn >= .9).mean(), frac_ge_095=(nn >= .95).mean(), frac_ge_099=(nn >= .99).mean()))
            if sp_ == "kpssm":
                samples += [dict(task=task, split=split, nn_sim=float(v)) for v in nn]
pd.DataFrame(rows).to_csv(os.path.join(ROOT, "results", "audit_spaces.csv"), index=False)
pd.DataFrame(samples).to_csv(os.path.join(ROOT, "results", "test_to_train_nn_kpssm.csv"), index=False)
d = pd.DataFrame(rows)
print(d.groupby(["split", "space"])[["median", "frac_ge_09", "frac_ge_099"]].mean().round(3).unstack(0).to_string())
