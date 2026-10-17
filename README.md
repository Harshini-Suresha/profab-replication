# ProFAB Benchmark Replication

Reimplementation of the evaluation in Özdilek et al., "ProFAB: open protein functional annotation benchmark",
Briefings in Bioinformatics 24(2), 2023 (doi:10.1093/bib/bbac627), on the four tasks whose processed features ship
with the ProFAB repository (GO:0000018, GO:1905523, EC 1.2.4, EC 1.2.7).

## Contents
- `site/dist/index.html`  the finished site (single file, works offline except web fonts)
- `figures/`              the 11 figures as 2x PNG (light theme)
- `results/`              every result table as CSV, plus `site_data.json` (all aggregated numbers used by the site)
- `src/`                  loader, models, experiments, aggregation
- `site/*.js, style.css`  site sources; `build_site.py` assembles them

## Data
Not included (MIT licensed, ~80 MB). To rebuild:

    git clone https://github.com/kansil/ProFAB.git
    mkdir -p data && for z in ProFAB/profab/import_dataset/*/*.zip; do unzip -oq "$z" -d data; done

## Run order
    python3 src/audit.py            # split audit, test->train similarity
    python3 src/bench.py            # 392 official-split runs (descriptor x classifier x split x task)
    python3 src/controlled_cv.py    # random vs grouped CV on identical pools
    python3 src/pruning.py          # leakage pruning with size-matched random removal
    python3 src/stock_loader.py     # positional vs accession-keyed reading of the split files
    python3 src/proxy_cross.py      # grouping space x model descriptor
    python3 src/audit_kpssm.py; python3 src/audit_spaces.py
    python3 src/analyze.py; python3 src/analyze2.py; python3 src/analyze3.py
    python3 build_site.py

## Scope and caveats
- Similarity is mean-centred cosine in descriptor space (conjoint triad or k-separated bigram PSSM), a proxy for
  sequence identity. Sequences were not retrievable, so MMseqs2/CD-HIT identity was not used.
- Only the four tasks bundled with the repository were used, not the full ProFAB collection.
- Results were not compared with the paper's reported tables (full text unavailable during the study).
- EC 1.2.7 temporal split excluded: its index files point past the end of the feature files.
- k-separated bigram PSSM files are shifted by one or more rows against the other descriptor files; this study joins
  every descriptor by accession (see `results/audit_kpssm_*.csv`, `results/stock_loader_comparison.csv`).

Contact: harshinisuresha7@gmail.com

Reference-table data: `python src/atlas/diagram_data3.py` (run after `diagram_data.py` and `diagram_data2.py`), then `python build_site.py`.
Additional-analysis data: `python src/atlas/diagram_data4.py` (after the other `diagram_data*.py` scripts), then `python build_site.py`.
