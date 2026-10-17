"""Aligned protein pools for the controlled experiments."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import connected_components
import loader as L
from common import centered_unit

CTRL_FEATS = ["aac", "paac", "ctriad", "kpssm"]
SIM_FEAT = "ctriad"


def aligned_pool(task: str, feats=CTRL_FEATS, split: str = "random"):
    """Whole random-split pool restricted to accessions present for every requested descriptor."""
    Ds = {f: L.descriptor(task, split, f) for f in feats}
    common = [a for a in Ds[feats[0]].index if all(a in Ds[f].index for f in feats)]
    X = {f: Ds[f].loc[common].drop(columns="y").to_numpy(float) for f in feats}
    y = Ds[feats[0]].loc[common, "y"].to_numpy(int)
    Z = centered_unit(X[SIM_FEAT])
    return common, X, y, Z


def cluster_groups(Z: np.ndarray, tau: float) -> np.ndarray:
    """Single-linkage groups: connected components of the graph with an edge when similarity >= tau.

    Guarantees that no pair of proteins in different groups has proxy-similarity >= tau, so any
    group-wise fold split leaves no held-out protein with a training neighbour at or above tau.
    """
    S = Z @ Z.T
    np.fill_diagonal(S, -1.0)
    _, lab = connected_components(csr_matrix(S >= tau), directed=False)
    return lab + 1
