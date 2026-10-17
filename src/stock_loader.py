"""Experiment 5: stock (positional) ProFAB loading vs accession-keyed loading for kpssm, with ctriad as no-offset control."""
import os, sys, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, pandas as pd
import loader as L
from common import MODELS, fit_model, scores, metrics, centered_unit, max_sim_to

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = []
for task in L.TASKS:
    for split in L.available_splits(task):
        if sum(v for k, v in L.index_audit(task, split).items() if "oob" in k):
            continue
        C = L.descriptor(task, split, "ctriad")
        mu = C.drop(columns="y").to_numpy(float).mean(0)
        for feat in ("ctriad", "kpssm"):
            Xtr, ytr, Xte, yte, atr, ate = L.load_positional(task, split, feat)
            sp = L.load(task, split, feat, merge_val=True)
            # realised leakage proxy: ctriad similarity between the proteins whose features are really used
            def sim(a_te, a_tr):
                a_te = [a for a in a_te if a in C.index]; a_tr = [a for a in a_tr if a in C.index]
                return float(np.median(max_sim_to(centered_unit(C.loc[a_te].drop(columns="y").to_numpy(float), mu),
                                                  centered_unit(C.loc[a_tr].drop(columns="y").to_numpy(float), mu))))
            nn_stock = sim(ate, atr); nn_keyed = sim(sp.acc_test, sp.acc_train)
            for m in MODELS:
                est, _ = fit_model(m, Xtr, ytr, tune=True); s = scores(est, Xte); r1 = metrics(yte, est.predict(Xte), s)
                est, _ = fit_model(m, sp.X_train, sp.y_train, tune=True); s = scores(est, sp.X_test); r2 = metrics(sp.y_test, est.predict(sp.X_test), s)
                rows.append(dict(task=task, split=split, feature=feat, model=m, nn_median_stock=nn_stock, nn_median_keyed=nn_keyed,
                                 mcc_stock=r1["mcc"], auroc_stock=r1["auroc"], auprc_stock=r1["auprc"],
                                 mcc_keyed=r2["mcc"], auroc_keyed=r2["auroc"], auprc_keyed=r2["auprc"],
                                 n_test_stock=len(yte), n_test_keyed=len(sp.y_test)))
df = pd.DataFrame(rows); df.to_csv(os.path.join(ROOT, "results", "stock_loader_comparison.csv"), index=False)
g = df.groupby(["feature", "split"])[["nn_median_stock", "nn_median_keyed", "mcc_stock", "mcc_keyed", "auroc_stock", "auroc_keyed"]].mean().round(3)
print(g.to_string())
