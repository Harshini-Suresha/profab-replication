"""Shared models, metrics and bootstrap utilities."""
from __future__ import annotations

import numpy as np
from scipy.stats import rankdata
from sklearn.base import clone
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

SEED = 42
MODELS = ["logreg", "svm", "knn", "rf", "hgb", "nb", "mlp"]
MODEL_LABEL = {
    "logreg": "Logistic regression", "svm": "SVM (RBF)", "knn": "k-NN", "rf": "Random forest",
    "hgb": "Gradient boosting", "nb": "Gaussian NB", "mlp": "MLP", "nn1": "1-NN (lookup)",
}
FEATURE_LABEL = {
    "aac": "AAC", "paac": "PAAC", "gaac": "GAAC", "ctdt": "CTD-T", "socnumber": "SOC number",
    "ctriad": "Conjoint triad", "kpssm": "k-sep. bigram PSSM",
}


def _scaled(clf):
    return Pipeline([("sc", StandardScaler()), ("clf", clf)])


def base_estimator(name: str, seed: int = SEED, n_jobs: int = 1):
    if name == "logreg":
        return _scaled(LogisticRegression(max_iter=3000, class_weight="balanced", random_state=seed))
    if name == "svm":
        return _scaled(SVC(kernel="rbf", gamma="scale", class_weight="balanced", random_state=seed))
    if name == "knn":
        return _scaled(KNeighborsClassifier(n_neighbors=5, weights="distance"))
    if name == "nn1":
        return _scaled(KNeighborsClassifier(n_neighbors=1))
    if name == "rf":
        return RandomForestClassifier(n_estimators=300, class_weight="balanced_subsample",
                                      n_jobs=n_jobs, random_state=seed)
    if name == "hgb":
        return HistGradientBoostingClassifier(max_iter=200, learning_rate=0.1, early_stopping=True,
                                              class_weight="balanced", random_state=seed)
    if name == "nb":
        return _scaled(GaussianNB())
    if name == "mlp":
        return _scaled(MLPClassifier(hidden_layer_sizes=(128,), alpha=1e-2, early_stopping=True,
                                     max_iter=500, random_state=seed))
    raise ValueError(name)


GRIDS = {
    "logreg": {"clf__C": [0.01, 0.1, 1.0, 10.0]},
    "svm": {"clf__C": [0.1, 1.0, 10.0]},
    "knn": {"clf__n_neighbors": [3, 5, 11, 21]},
}


def fit_model(name: str, X, y, tune: bool = True, seed: int = SEED, n_jobs: int = 1):
    est = base_estimator(name, seed, n_jobs)
    if tune and name in GRIDS:
        cv = StratifiedKFold(3, shuffle=True, random_state=seed)
        gs = GridSearchCV(est, GRIDS[name], scoring="roc_auc", cv=cv, n_jobs=n_jobs)
        gs.fit(X, y)
        return gs.best_estimator_, gs.best_params_
    est = clone(est).fit(X, y)
    return est, {}


def scores(est, X) -> np.ndarray:
    """Continuous score for the positive class."""
    if hasattr(est, "predict_proba"):
        return est.predict_proba(X)[:, 1]
    return est.decision_function(X)


# ----------------------------------------------------------------------------- metrics
def auroc(y, s) -> float:
    y = np.asarray(y); s = np.asarray(s, float)
    n1 = int(y.sum()); n0 = len(y) - n1
    if n1 == 0 or n0 == 0:
        return float("nan")
    r = rankdata(s)
    return float((r[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def auprc(y, s) -> float:
    """Average precision (step-wise, as in scikit-learn)."""
    y = np.asarray(y); s = np.asarray(s, float)
    if y.sum() == 0:
        return float("nan")
    o = np.argsort(-s, kind="mergesort")
    ys = y[o]; ss = s[o]
    tp = np.cumsum(ys); fp = np.cumsum(1 - ys)
    # keep last index of each tied score block
    last = np.r_[np.where(np.diff(ss))[0], len(ss) - 1]
    tp = tp[last]; fp = fp[last]
    prec = tp / (tp + fp); rec = tp / y.sum()
    rec_prev = np.r_[0.0, rec[:-1]]
    return float(np.sum((rec - rec_prev) * prec))


def confusion(y, p):
    y = np.asarray(y); p = np.asarray(p)
    return (int(((y == 1) & (p == 1)).sum()), int(((y == 0) & (p == 1)).sum()),
            int(((y == 0) & (p == 0)).sum()), int(((y == 1) & (p == 0)).sum()))


def mcc_from(tp, fp, tn, fn) -> float:
    d = np.sqrt(float(tp + fp) * (tp + fn) * (tn + fp) * (tn + fn))
    return float((tp * tn - fp * fn) / d) if d > 0 else 0.0


def metrics(y, p, s) -> dict:
    tp, fp, tn, fn = confusion(y, p)
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    spec = tn / (tn + fp) if tn + fp else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return dict(tp=tp, fp=fp, tn=tn, fn=fn, accuracy=(tp + tn) / len(y), balanced_accuracy=(rec + spec) / 2,
                precision=prec, recall=rec, specificity=spec, f1=f1, mcc=mcc_from(tp, fp, tn, fn),
                auroc=auroc(y, s), auprc=auprc(y, s))


def bootstrap_ci(y, p, s, n_boot: int = 500, seed: int = SEED, keys=("mcc", "auroc", "auprc")):
    """Stratified bootstrap percentile 95% CIs."""
    rng = np.random.default_rng(seed)
    y = np.asarray(y); p = np.asarray(p); s = np.asarray(s, float)
    i1 = np.where(y == 1)[0]; i0 = np.where(y == 0)[0]
    out = {k: [] for k in keys}
    for _ in range(n_boot):
        idx = np.r_[rng.choice(i1, len(i1)), rng.choice(i0, len(i0))]
        yy, pp, ss = y[idx], p[idx], s[idx]
        if "mcc" in keys: out["mcc"].append(mcc_from(*confusion(yy, pp)))
        if "auroc" in keys: out["auroc"].append(auroc(yy, ss))
        if "auprc" in keys: out["auprc"].append(auprc(yy, ss))
    return {k: (float(np.nanpercentile(v, 2.5)), float(np.nanpercentile(v, 97.5))) for k, v in out.items()}


# ----------------------------------------------------------------------------- similarity proxy
def centered_unit(X: np.ndarray, mean: np.ndarray | None = None) -> np.ndarray:
    mu = X.mean(0) if mean is None else mean
    Z = X - mu
    return Z / np.linalg.norm(Z, axis=1, keepdims=True).clip(1e-12)


def max_sim_to(Zq: np.ndarray, Zref: np.ndarray, exclude_self: bool = False) -> np.ndarray:
    S = Zq @ Zref.T
    if exclude_self:
        np.fill_diagonal(S, -np.inf)
    return S.max(1)
