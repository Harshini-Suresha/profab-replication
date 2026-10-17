"""Assemble the single-file site: site/dist/index.html (data, styles and scripts inlined)."""
import base64, json, os
import pandas as pd

ROOT = os.path.dirname(os.path.abspath(__file__))
R, S = os.path.join(ROOT, "results"), os.path.join(ROOT, "site")
D = json.load(open(f"{R}/site_data.json"))
D["curves"] = json.load(open(f"{R}/site_curves.json"))
D["audit_partition"] = pd.read_csv(f"{R}/audit_index_partition.csv").round(4).to_dict("records")
keep = ["tasks", "audit_splits", "audit_index", "nn_ecdf", "nn_summary", "benchmark", "split_compare", "cluster_meta", "inflation", "bin_perf",
        "bin_labels", "bin_counts", "pruning", "stock_summary", "kpssm_alignment", "kpssm_positional", "proxy_cross", "proxy_inflation",
        "nn_ecdf_kpssm", "curves", "audit_partition"]
D = {k: D[k] for k in keep}
css = open(f"{S}/style.css").read()
js = "\n".join(open(f"{S}/{f}").read() for f in ["lib.js", "figs_a.js", "figs_b.js", "atlas.js", "diagrams.js", "content.js", "app.js"])
atlas = json.load(open(f"{S}/atlas_index.json"))
imgs = {}
for a in atlas:
    p = f"{S}/atlas/{a['id']}.webp"
    if os.path.exists(p):
        imgs[a["id"]] = "data:image/webp;base64," + base64.b64encode(open(p, "rb").read()).decode()
html = f"""<meta charset="utf-8">
<title>ProFAB Benchmark Replication</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&display=swap">
<style>
{css}
</style>
<div id="root"></div>
<script>
const D = {json.dumps(D, separators=(",", ":"))};
const DG = {json.dumps(json.load(open(f"{S}/diagram_data.json")), separators=(",", ":"))};
const ATLAS = {json.dumps(atlas, separators=(",", ":"))};
const ATLAS_IMG = {json.dumps(imgs, separators=(",", ":"))};
</script>
<script>
{js}
</script>
"""
os.makedirs(f"{S}/dist", exist_ok=True)
open(f"{S}/dist/index.html", "w").write(html)
print("wrote", f"{S}/dist/index.html", round(len(html) / 1024), "KB")
docs = os.path.join(ROOT, "docs")
os.makedirs(docs, exist_ok=True)
open(f"{docs}/index.html", "w").write(html)
print("wrote", f"{docs}/index.html", round(len(html) / 1024), "KB")
