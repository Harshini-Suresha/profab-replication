"""Atlas EMB-01..28: PCA / t-SNE / UMAP of descriptor spaces, and PCA of official train/test splits."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acommon import *
import pandas as pd
import loader as L
from pools import aligned_pool
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score

R = Registry("EMB", "Embeddings")
aud = pd.read_csv(f"{RES}/audit_splits.csv").set_index(["task", "split"])


def embed(task, feat, method, X):
    f = f"{CACHE}/emb_{task}_{feat}_{method}.npz"
    if os.path.exists(f):
        d = np.load(f); return d["E"], d["extra"]
    Z = StandardScaler().fit_transform(X)
    if method == "pca":
        p = PCA(2, random_state=0).fit(Z); E = p.transform(Z); extra = p.explained_variance_ratio_
    elif method == "tsne":
        P = PCA(min(50, Z.shape[1]), random_state=0).fit_transform(Z)
        E = TSNE(2, perplexity=30, init="pca", learning_rate="auto", random_state=0).fit_transform(P); extra = np.zeros(2)
    else:
        import umap
        E = umap.UMAP(n_neighbors=15, min_dist=0.1, random_state=0).fit_transform(Z); extra = np.zeros(2)
    np.savez(f, E=E, extra=extra); return E, extra


def scatter_classes(ax, E, y):
    for lab, col, a, z in ((0, NEG_C, 0.45, 1), (1, POS_C, 0.75, 2)):
        m = y == lab
        ax.scatter(E[m, 0], E[m, 1], s=13, c=col, alpha=a, linewidths=0, zorder=z, label=("Annotated (positive)" if lab else "Not annotated (negative)") + f", n={m.sum()}")


METH = {"pca": "PCA", "tsne": "t-SNE", "umap": "UMAP"}
JOBS = [("ctriad", "pca"), ("ctriad", "tsne"), ("ctriad", "umap"), ("kpssm", "pca"), ("kpssm", "umap")]
for feat, method in JOBS:
    for task in TASKS:
        acc, X, y, _ = aligned_pool(task)
        E, extra = embed(task, feat, method, X[feat])
        sil = silhouette_score(E, y)
        fig, ax = new(6.0, 4.6)
        scatter_classes(ax, E, y)
        ax.grid(False)
        ax.set_xlabel(f"{METH[method]} 1" + (f" ({100 * extra[0]:.1f}% variance)" if method == "pca" else ""))
        ax.set_ylabel(f"{METH[method]} 2" + (f" ({100 * extra[1]:.1f}% variance)" if method == "pca" else ""))
        if method != "pca":
            ax.set_xticks([]); ax.set_yticks([])
        ax.set_title(f"{TASK_L[task]} · {METH[method]} of {FEAT_L[feat]}")
        subtitle(ax, f"{len(y)} proteins, {100 * y.mean():.0f}% annotated; standardised features")
        ax.legend(loc="best", markerscale=1.6)
        cap = (f"{METH[method]} projection of all {len(y)} proteins in the {TASK_L[task]} pool, described by {FEAT_L[feat]} ({X[feat].shape[1]} dimensions). "
               f"Silhouette of the two classes in the 2-D map: {sil:.2f}. ")
        cap += (f"The first two components explain {100 * extra[0]:.1f}% and {100 * extra[1]:.1f}% of variance. " if method == "pca" else "Axes have no units, and distances between far-apart clusters are not meaningful. ")
        cap += "Positives are drawn on top of negatives."
        R.save(fig, f"{TASK_L[task]}: {METH[method]} of {FEAT_L[feat]}", cap)

# train/test geometry of every official split
R2 = R
for task, split in TASK_SPLITS:
    sp = L.load(task, split, "ctriad", merge_val=True)
    X = np.vstack([sp.X_train, sp.X_test]); y = np.r_[sp.y_train, sp.y_test]; is_te = np.r_[np.zeros(len(sp.y_train), bool), np.ones(len(sp.y_test), bool)]
    Z = StandardScaler().fit_transform(X); p = PCA(2, random_state=0).fit(Z); E = p.transform(Z)
    fig, ax = new(6.0, 4.6)
    ax.scatter(E[~is_te, 0], E[~is_te, 1], s=9, c="#b9bfcb", alpha=0.5, linewidths=0, label=f"Training, n={(~is_te).sum()}")
    for lab, col in ((0, NEG_C), (1, POS_C)):
        m = is_te & (y == lab)
        ax.scatter(E[m, 0], E[m, 1], s=24, c=col, alpha=0.9, edgecolors="white", linewidths=0.5, label=f"Test {'positive' if lab else 'negative'}, n={m.sum()}", zorder=3)
    ax.grid(False)
    ax.set_xlabel(f"PC 1 ({100 * p.explained_variance_ratio_[0]:.1f}% variance)"); ax.set_ylabel(f"PC 2 ({100 * p.explained_variance_ratio_[1]:.1f}% variance)")
    ax.set_title(f"{TASK_L[task]} · {SPLIT_L[split]} split in conjoint-triad PCA space")
    nn = aud.loc[(task, split), "nn_median"]
    subtitle(ax, f"Median test→train similarity {nn:.2f}; PCA fitted on training and test proteins together")
    ax.legend(loc="best", markerscale=1.2)
    R.save(fig, f"{TASK_L[task]}: where the {SPLIT_L[split].lower()} test set sits", f"Training proteins (grey) and test proteins (coloured by class) of the official {SPLIT_L[split].lower()} split of {TASK_L[task]}, projected onto the first two principal components of conjoint-triad features. "
           f"The median conjoint-triad similarity from a test protein to its closest training protein is {nn:.2f}. A test set that overlaps the training cloud everywhere is the easier case; one that occupies regions training does not is the shifted case.")
print("EMB done", R.n)
