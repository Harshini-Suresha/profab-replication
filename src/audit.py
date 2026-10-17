"""Experiment 0: dataset and split audit (no model fitting)."""
import json, os, sys, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd
import loader as L
from common import centered_unit, max_sim_to

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "results")
os.makedirs(OUT, exist_ok=True)
THR = [0.5, 0.7, 0.9, 0.95, 0.99]

rows, nn_rows, idx_rows = [], [], []
for task in L.TASKS:
    for split in L.available_splits(task):
        a = L.index_audit(task, split); a.update(task=task, split=split); idx_rows.append(a)
        if sum(v for k, v in a.items() if "oob" in k):
            continue  # unusable index files, recorded in idx_rows
        sp = L.load(task, split, "ctriad")
        acc = L.split_accessions(task, split)
        D = L.descriptor(task, split, "ctriad")
        pool_X = D.drop(columns="y").to_numpy(float)
        mu = pool_X.mean(0)
        Ztr = centered_unit(np.vstack([sp.X_train] + ([sp.X_val] if sp.X_val is not None else [])), mu)
        Zte = centered_unit(sp.X_test, mu)
        nn = max_sim_to(Zte, Ztr)
        # redundancy inside the pool
        Zp = centered_unit(pool_X, mu)
        nnp = max_sim_to(Zp, Zp, exclude_self=True)
        # exact duplicate feature vectors (aac, 6 d.p.) between train and test
        A = L.load(task, split, "aac")
        key = lambda M: {tuple(np.round(r, 6)) for r in M}
        dup = len(key(A.X_test) & key(np.vstack([A.X_train] + ([A.X_val] if A.X_val is not None else []))))
        r = dict(task=task, split=split, pool=len(D), n_train=len(sp.y_train) + (len(sp.y_val) if sp.y_val is not None else 0),
                 n_test=len(sp.y_test), pos_rate_train=float(np.mean(np.r_[sp.y_train, sp.y_val if sp.y_val is not None else []])),
                 pos_rate_test=float(sp.y_test.mean()), n_test_pos=int(sp.y_test.sum()), n_test_neg=int((1 - sp.y_test).sum()),
                 acc_overlap=len(set(sp.acc_train + sp.acc_val) & set(sp.acc_test)),
                 exact_dup_test_in_train=dup, nn_median=float(np.median(nn)), nn_mean=float(nn.mean()),
                 pool_nn_median=float(np.median(nnp)), pool_frac_nn_ge_099=float((nnp >= 0.99).mean()))
        for t in THR:
            r[f"test_frac_nn_ge_{t}"] = float((nn >= t).mean())
        rows.append(r)
        for a_, s_, y_ in zip(sp.acc_test, nn, sp.y_test):
            nn_rows.append(dict(task=task, split=split, acc=a_, y=int(y_), nn_sim=float(s_)))

pd.DataFrame(rows).to_csv(f"{OUT}/audit_splits.csv", index=False)
pd.DataFrame(idx_rows).to_csv(f"{OUT}/audit_index_integrity.csv", index=False)
pd.DataFrame(nn_rows).to_csv(f"{OUT}/test_to_train_nn_similarity.csv", index=False)
print(pd.DataFrame(rows).round(3).to_string())
