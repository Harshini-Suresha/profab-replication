"""Shared style, palette and figure registry for the 100-figure atlas."""
import os, sys, json, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RES = os.path.join(ROOT, "results")
OUT = os.path.join(ROOT, "figures_atlas")
IDX = os.path.join(RES, "atlas_index")
CACHE = os.path.join(RES, "atlas_cache")
for d in (OUT, IDX, CACHE):
    os.makedirs(d, exist_ok=True)

PINK = "#fff3f7"
INK, INK2, MUTED, GRID, AXIS = "#0e1218", "#444c5b", "#646c7b", "#f1d3df", "#d3a3b8"
C = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"]  # validated categorical order
SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"]
CMAP = LinearSegmentedColormap.from_list("profab_seq", SEQ)
DIV = LinearSegmentedColormap.from_list("profab_div", ["#2a78d6", "#f0efec", "#e34948"])
SPLIT_C = {"random": C[0], "target": C[1], "temporal": C[2]}
SPLIT_L = {"random": "Random", "target": "Similarity-aware", "temporal": "Temporal"}
FEATS = ["aac", "paac", "gaac", "ctdt", "socnumber", "ctriad", "kpssm"]
FEAT_L = {"aac": "AAC", "paac": "PAAC", "gaac": "GAAC", "ctdt": "CTD-T", "socnumber": "SOC number", "ctriad": "Conjoint triad", "kpssm": "k-sep. bigram PSSM"}
FEAT_S = {"aac": "AAC", "paac": "PAAC", "gaac": "GAAC", "ctdt": "CTD-T", "socnumber": "SOCN", "ctriad": "C-triad", "kpssm": "kPSSM"}
FEAT_C = {f: C[i] for i, f in enumerate(FEATS)}
MODELS = ["logreg", "svm", "knn", "rf", "hgb", "nb", "mlp"]
MODEL_L = {"logreg": "Logistic regression", "svm": "SVM (RBF)", "knn": "k-NN", "rf": "Random forest", "hgb": "Gradient boosting", "nb": "Gaussian NB", "mlp": "MLP", "nn1": "1-NN"}
MODEL_S = {"logreg": "LogReg", "svm": "SVM", "knn": "k-NN", "rf": "RF", "hgb": "HGB", "nb": "NB", "mlp": "MLP", "nn1": "1-NN"}
MODEL_C = {m: C[i] for i, m in enumerate(MODELS)}
TASKS = ["GO_0000018", "GO_1905523", "ecNo_1-2-4", "ecNo_1-2-7"]
TASK_L = {"GO_0000018": "GO:0000018", "GO_1905523": "GO:1905523", "ecNo_1-2-4": "EC 1.2.4", "ecNo_1-2-7": "EC 1.2.7"}
TASK_SPLITS = [("GO_0000018", "random"), ("GO_0000018", "target"), ("GO_0000018", "temporal"), ("GO_1905523", "random"),
               ("ecNo_1-2-4", "random"), ("ecNo_1-2-4", "target"), ("ecNo_1-2-7", "random"), ("ecNo_1-2-7", "target")]
POS_C, NEG_C = C[1], C[0]

plt.rcParams.update({
    "font.family": ["Inter", "DejaVu Sans"], "font.size": 9, "axes.edgecolor": AXIS, "axes.labelcolor": INK2, "axes.titlecolor": INK,
    "xtick.color": MUTED, "ytick.color": MUTED, "text.color": INK, "axes.spines.top": False, "axes.spines.right": False,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8, "axes.axisbelow": True, "figure.facecolor": PINK, "axes.facecolor": PINK,
    "savefig.facecolor": PINK, "axes.titlesize": 10.5, "axes.titleweight": "semibold", "axes.titlelocation": "left", "legend.frameon": False,
    "legend.fontsize": 8.5, "figure.dpi": 100, "savefig.dpi": 200, "axes.labelsize": 9, "xtick.labelsize": 8.5, "ytick.labelsize": 8.5,
    "svg.fonttype": "none",
})


def new(w=6.6, h=4.3, **kw):
    return plt.subplots(figsize=(w, h), constrained_layout=True, **kw)


def subtitle(ax_or_fig, text, y=1.0, fig=None):
    """Muted one-line subtitle under the title of the first axis."""
    ax = ax_or_fig
    t = ax.get_title(loc="left")
    if t:
        ax.set_title(t, loc="left", pad=17)
    ax.text(0, 1.012, text, transform=ax.transAxes, fontsize=8, color=MUTED, va="bottom", ha="left")


class Registry:
    def __init__(self, prefix, category):
        self.prefix, self.category, self.n = prefix, category, 0

    def save(self, fig, title, caption, name=None):
        self.n += 1
        fid = f"{self.prefix}-{self.n:02d}"
        path = os.path.join(OUT, f"{fid}.png")
        fig.savefig(path)
        plt.close(fig)
        json.dump(dict(id=fid, category=self.category, title=title, caption=caption, file=f"{fid}.png"), open(os.path.join(IDX, f"{fid}.json"), "w"))
        print("saved", fid, title, flush=True)
        return fid


def style_ax(ax, grid="y"):
    ax.grid(False)
    if grid in ("x", "both"):
        ax.grid(axis="x", color=GRID)
    if grid in ("y", "both"):
        ax.grid(axis="y", color=GRID)
