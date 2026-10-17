"""Quantify what happens when ProFAB's positional index files are applied to kpssm files with missing rows."""
import os, sys, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pandas as pd
import loader as L

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = []
for task in L.TASKS:
    for split in L.available_splits(task):
        a = L.index_audit(task, split)
        if sum(v for k, v in a.items() if "oob" in k):
            continue
        parts = {}
        mis = {"train": 0, "test": 0}
        tot = {"train": 0, "test": 0}
        for part in ("train", "test"):
            intended, got = [], []
            for lab in ("positive", "negative"):
                ref = L.descriptor(task, split, "aac")
                ref_lab = ref[ref.y == (1 if lab == "positive" else 0)].index.tolist()
                kp = L.descriptor(task, split, "kpssm")
                kp_lab = kp[kp.y == (1 if lab == "positive" else 0)].index.tolist()
                idx = L._idx(os.path.join(L.DATA, task, f"{split}_{lab}_{part}_indices.txt"))
                intended += [ref_lab[i] for i in idx if i < len(ref_lab)]
                got += [kp_lab[i] for i in idx if i < len(kp_lab)]
            parts[part] = (intended, got)
        tr_pos = set(parts["train"][1]); te_pos = set(parts["test"][1])
        rows.append(dict(task=task, split=split,
                         kpssm_rows_missing=len(L.descriptor(task, split, "aac")) - len(L.descriptor(task, split, "kpssm")),
                         train_members_wrong=sum(i != g for i, g in zip(*parts["train"])) if parts["train"][1] else 0,
                         test_members_wrong=sum(i != g for i, g in zip(*parts["test"])) if parts["test"][1] else 0,
                         n_train=len(parts["train"][0]), n_test=len(parts["test"][0]),
                         train_test_overlap_positional=len(tr_pos & te_pos)))
df = pd.DataFrame(rows)
df["test_wrong_frac"] = df.test_members_wrong / df.n_test
df.to_csv(os.path.join(ROOT, "results", "audit_kpssm_positional.csv"), index=False)
print(df.round(3).to_string())
