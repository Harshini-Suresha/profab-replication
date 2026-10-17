function atlas() {
  const A = ATLAS, cats = ["All", ...["Embeddings", "Heatmaps", "ROC / PR", "Confusion & scores", "Intervals", "Similarity", "Leakage", "Cross-analysis"]];
  const src = (a) => (typeof ATLAS_IMG !== "undefined" && ATLAS_IMG[a.id]) || ("atlas/" + a.id + ".webp");
  let cur = "All", open = -1, vis = A.slice();
  const grid = h("div", { class: "atl-grid" });
  const bar = h("div", { class: "atl-filter", role: "group", "aria-label": "Figure category" });
  const lb = h("div", { class: "atl-lb", hidden: true, role: "dialog", "aria-modal": "true", "aria-label": "Figure viewer" });
  const lbImg = h("img", { alt: "" }), lbT = h("h3", {}), lbC = h("p", {}), lbN = h("span", { class: "atl-n" });
  const btn = (t, f, lab) => h("button", { type: "button", class: "atl-btn", "aria-label": lab, onclick: f }, t);
  const close = () => { lb.hidden = true; open = -1; document.body.style.overflow = ""; };
  const show = (i) => { open = (i + vis.length) % vis.length; const a = vis[open]; lbImg.src = src(a); lbImg.alt = a.title; lbT.textContent = a.id + " · " + a.title; lbC.textContent = a.caption; lbN.textContent = (open + 1) + " / " + vis.length; lb.hidden = false; document.body.style.overflow = "hidden"; };
  lb.append(h("div", { class: "atl-lbbox" }, h("div", { class: "atl-lbtop" }, lbN, btn("‹", () => show(open - 1), "Previous"), btn("›", () => show(open + 1), "Next"), btn("Close", close, "Close")), h("div", { class: "atl-lbimg" }, lbImg), lbT, lbC));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  document.addEventListener("keydown", (e) => { if (lb.hidden) return; if (e.key === "Escape") close(); else if (e.key === "ArrowRight") show(open + 1); else if (e.key === "ArrowLeft") show(open - 1); });
  const render = () => {
    vis = A.filter((a) => cur === "All" || a.category === cur);
    grid.replaceChildren(...vis.map((a, i) => h("figure", { class: "atl-card" }, h("button", { type: "button", class: "atl-thumb", "aria-label": "Open " + a.title, onclick: () => show(i) }, h("img", { src: src(a), loading: "lazy", width: a.w, height: a.h, alt: a.title })), h("figcaption", {}, h("span", { class: "atl-id" }, a.id), a.title))));
    bar.replaceChildren(...cats.map((c) => { const n = c === "All" ? A.length : A.filter((a) => a.category === c).length; return h("button", { type: "button", class: "atl-chip" + (c === cur ? " on" : ""), "aria-pressed": String(c === cur), onclick: () => { cur = c; render(); } }, c + " ", h("span", {}, String(n))); }));
  };
  render();
  return col(P(`${A.length} static figures generated with matplotlib: embeddings of every descriptor space, the full descriptor × classifier grids, ROC and precision–recall curves, confusion matrices and score distributions, bootstrap intervals, similarity distributions, leakage curves and cross-analyses. Click a figure to enlarge; arrow keys move between figures. Every caption states what is plotted and its caveats. The PNG originals (200 dpi) are in the project archive.`), bar, grid, lb);
}
