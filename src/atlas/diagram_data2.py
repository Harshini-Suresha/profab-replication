"""More diagram data: radar, parallel coordinates, ridgeline, network -> merged into site/diagram_data.json"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from acommon import *
import pandas as pd, networkx as nx
from scipy.stats import gaussian_kde
from sklearn.model_selection import StratifiedKFold
from pools import aligned_pool
P = os.path.join(ROOT, "site", "diagram_data.json"); out = json.load(open(P))
bm = pd.read_csv(f"{RES}/benchmark_official_splits.csv")
# radar: mean over classifiers & tasks, per split type, per descriptor
r = bm.groupby(["split", "feature"]).agg(auroc=("auroc", "mean"), mcc=("mcc", "mean")).reset_index()
out["radar"] = {sp: {f: [round(float(r[(r.split == sp) & (r.feature == f)].auroc.iloc[0]), 4), round(float(r[(r.split == sp) & (r.feature == f)].mcc.iloc[0]), 4)] for f in FEATS} for sp in ["random", "target", "temporal"]}
out["radar_feats"] = [FEAT_S[f] for f in FEATS]
# parallel: GO:0000018 AUROC per config over three splits
g = bm[bm.task == "GO_0000018"].pivot_table(index=["feature", "model"], columns="split", values="auroc").reset_index()
out["parallel"] = [dict(f=FEAT_S[x.feature], m=MODEL_S[x.model], v=[round(float(x.random), 4), round(float(x.target), 4), round(float(x.temporal), 4)]) for x in g.itertuples()]
# ridgeline: test->train nn similarity per official split (pooled over tasks)
nn = pd.read_csv(f"{RES}/test_to_train_nn_similarity.csv"); xs = np.linspace(0.2, 1.0, 81); rid = []
for sp in ["random", "target", "temporal"]:
    v = nn[nn.split == sp].nn_sim.to_numpy(); d = gaussian_kde(v, bw_method=0.25)(xs)
    rid.append(dict(split=sp, n=int(len(v)), median=float(np.median(v)), d=[round(float(t), 4) for t in d / d.max()]))
out["ridge"] = dict(x=[round(float(t), 3) for t in xs], rows=rid)
# network: GO:0000018 full pool, proxy similarity >= tau, only proteins that have at least one relative; coloured by random fold
acc, X, y, Z = aligned_pool("GO_0000018"); tau = out["tau"]; S = Z @ Z.T; np.fill_diagonal(S, -1)
fold = np.zeros(len(y), int)
for k, (_, te) in enumerate(StratifiedKFold(5, shuffle=True, random_state=0).split(Z, y)): fold[te] = k
A = S >= tau; deg = A.sum(1); keep = np.where(deg > 0)[0]
G = nx.Graph(); G.add_nodes_from(range(len(keep)))
ii, jj = np.where(np.triu(A[np.ix_(keep, keep)], 1)); G.add_edges_from(zip(ii.tolist(), jj.tolist()))
pos = nx.spring_layout(G, seed=3, k=0.12, iterations=300)
P_ = np.array([pos[i] for i in range(len(keep))]); lo, hi = np.percentile(P_, 1, 0), np.percentile(P_, 99, 0); P_ = np.clip((P_ - lo) / (hi - lo), 0, 1)
fk = fold[keep]; ed = [[int(a), int(b)] for a, b in G.edges()]
out["network"] = dict(nodes=[dict(x=round(float(P_[i, 0]), 4), y=round(float(P_[i, 1]), 4), fold=int(fk[i]), cls=int(y[keep][i])) for i in range(len(keep))], edges=ed,
                      n=int(len(keep)), pool=int(len(y)), comps=int(nx.number_connected_components(G)), cross=int(sum(fk[a] != fk[b] for a, b in ed)))
json.dump(out, open(P, "w")); print(out["network"]["n"], out["network"]["pool"], out["network"]["comps"], len(ed), out["network"]["cross"])
