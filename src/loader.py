"""ID-keyed loader for the ProFAB bundled datasets.

ProFAB stores, per task and split type, one positive and one negative feature
file per descriptor (first column = UniProt accession, remaining columns =
features) plus index files giving row positions of train/test/validation
members. Positional indices are only valid against files with identical row
order, and a few kpssm files have fewer rows than the other descriptors. To be
safe, row positions are resolved to accessions on a reference descriptor (aac)
and every other descriptor is then joined by accession.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
FEATURES = ["aac", "paac", "gaac", "ctdt", "socnumber", "ctriad", "kpssm"]
REF = "aac"

TASKS = {
    "GO_0000018": ("GO:0000018", "Regulation of DNA recombination", "GO"),
    "GO_1905523": ("GO:1905523", "Positive regulation of macrophage migration", "GO"),
    "ecNo_1-2-4": ("EC 1.2.4", "Oxidoreductases acting on aldehyde/oxo group, 2-oxoacid dehydrogenases", "EC"),
    "ecNo_1-2-7": ("EC 1.2.7", "Oxidoreductases acting on aldehyde/oxo group, iron-sulfur protein acceptor", "EC"),
}


def _read(path: str) -> pd.DataFrame:
    df = pd.read_csv(path, sep="\t", header=None, dtype={0: str})
    df = df.set_index(0)
    df.index.name = "acc"
    return df


def _idx(path: str) -> list[int]:
    if not os.path.exists(path):
        return []
    with open(path) as fh:
        return [int(x) for x in fh.read().split() if x.strip()]


def available_splits(task: str) -> list[str]:
    return [s for s in ("random", "target", "temporal")
            if os.path.exists(os.path.join(DATA, task, f"{s}_positive_aac.txt"))]


@lru_cache(maxsize=None)
def descriptor(task: str, split: str, feature: str) -> pd.DataFrame:
    """Feature matrix (index = accession) with a `y` column (1 positive, 0 negative)."""
    pos = _read(os.path.join(DATA, task, f"{split}_positive_{feature}.txt"))
    neg = _read(os.path.join(DATA, task, f"{split}_negative_{feature}.txt"))
    out = pd.concat([pos.assign(y=1), neg.assign(y=0)]).copy()
    out.columns = [str(c) for c in out.columns]
    # A few descriptor files list one accession twice (identical label); keep the first occurrence so
    # that row positions stay aligned with labels downstream.
    out = out[~out.index.duplicated(keep="first")]
    return out


@dataclass
class Split:
    task: str
    split: str
    feature: str
    X_train: np.ndarray
    y_train: np.ndarray
    X_test: np.ndarray
    y_test: np.ndarray
    X_val: np.ndarray | None
    y_val: np.ndarray | None
    acc_train: list[str]
    acc_test: list[str]
    acc_val: list[str]
    n_dropped: int  # accessions present in reference but missing for this descriptor


@lru_cache(maxsize=None)
def split_accessions(task: str, split: str) -> dict[str, list[str]]:
    """Resolve index files to accession lists using the reference descriptor."""
    base = os.path.join(DATA, task)
    pos = _read(os.path.join(base, f"{split}_positive_{REF}.txt")).index.tolist()
    neg = _read(os.path.join(base, f"{split}_negative_{REF}.txt")).index.tolist()
    out: dict[str, list[str]] = {}
    for part in ("train", "test", "validation"):
        pi = _idx(os.path.join(base, f"{split}_positive_{part}_indices.txt"))
        ni = _idx(os.path.join(base, f"{split}_negative_{part}_indices.txt"))
        # Same behaviour as ProFAB's own loader: out-of-range positions are ignored.
        out[part] = [pos[i] for i in pi if i < len(pos)] + [neg[i] for i in ni if i < len(neg)]
    return out


def index_audit(task: str, split: str) -> dict:
    """Counts of index entries that fall outside the feature file (silently dropped by ProFAB)."""
    base = os.path.join(DATA, task)
    npos = len(_read(os.path.join(base, f"{split}_positive_{REF}.txt")))
    nneg = len(_read(os.path.join(base, f"{split}_negative_{REF}.txt")))
    res = {"pool_pos": npos, "pool_neg": nneg}
    for part in ("train", "test", "validation"):
        pi = _idx(os.path.join(base, f"{split}_positive_{part}_indices.txt"))
        ni = _idx(os.path.join(base, f"{split}_negative_{part}_indices.txt"))
        res[f"{part}_idx_pos"] = len(pi); res[f"{part}_idx_neg"] = len(ni)
        res[f"{part}_oob_pos"] = sum(i >= npos for i in pi); res[f"{part}_oob_neg"] = sum(i >= nneg for i in ni)
    return res


def load(task: str, split: str, feature: str, merge_val: bool = False) -> Split:
    acc = split_accessions(task, split)
    D = descriptor(task, split, feature)
    ref = descriptor(task, split, REF)

    def take(accs):
        keep = [a for a in accs if a in D.index]
        sub = D.loc[keep]
        return keep, sub.drop(columns="y").to_numpy(float), sub["y"].to_numpy(int)

    tr, Xtr, ytr = take(acc["train"])
    te, Xte, yte = take(acc["test"])
    va, Xva, yva = take(acc["validation"]) if acc["validation"] else ([], None, None)
    dropped = sum(len(acc[p]) for p in acc) - len(tr) - len(te) - len(va)
    if merge_val and va:
        Xtr = np.vstack([Xtr, Xva]); ytr = np.concatenate([ytr, yva]); tr = tr + va
        Xva = yva = None; va = []
    return Split(task, split, feature, Xtr, ytr, Xte, yte, Xva, yva, tr, te, va, dropped)


def pool(task: str, split: str, feature: str) -> tuple[list[str], np.ndarray, np.ndarray]:
    """Whole labelled pool for a (task, split) descriptor, regardless of train/test index files."""
    D = descriptor(task, split, feature)
    return D.index.tolist(), D.drop(columns="y").to_numpy(float), D["y"].to_numpy(int)


def load_positional(task: str, split: str, feature: str, merge_val: bool = True):
    """Mimic ProFAB's own loader: index files are applied by row position within *this descriptor's* files.

    Returns (X_train, y_train, X_test, y_test, acc_train, acc_test) where acc_* are the accessions written in the
    selected rows, i.e. the proteins whose features are actually used.
    """
    base = os.path.join(DATA, task)
    out = {}
    for part in ("train", "test", "validation"):
        X, y, acc = [], [], []
        for lab, v in (("positive", 1), ("negative", 0)):
            F = _read(os.path.join(base, f"{split}_{lab}_{feature}.txt"))
            idx = sorted(set(_idx(os.path.join(base, f"{split}_{lab}_{part}_indices.txt"))))
            idx = [i for i in idx if i < len(F)]
            X.append(F.iloc[idx].to_numpy(float)); y += [v] * len(idx); acc += F.index[idx].tolist()
        out[part] = (np.vstack(X) if X else np.empty((0, 0)), np.array(y), acc)
    Xtr, ytr, atr = out["train"]
    if merge_val and len(out["validation"][1]):
        Xtr = np.vstack([Xtr, out["validation"][0]]); ytr = np.r_[ytr, out["validation"][1]]; atr = atr + out["validation"][2]
    Xte, yte, ate = out["test"]
    return Xtr, ytr, Xte, yte, atr, ate
