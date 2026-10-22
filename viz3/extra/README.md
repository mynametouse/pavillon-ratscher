# Feature extras

Small assets of one feature, kept with its code (since 23.10.2026) – so the CI and the preview have them without the manual path
(`viz3/deploy_push.sh`):

- `viz3/extra/<feature>/dist/**` – copied into `viz3/dist/` by `build.py` (e.g. `dist/chars/sarah_rb.json`)
- `viz3/extra/<feature>/manifest.json` – merged into the manifests (e.g. `{"charman": {"sarah_rb": "sarah_rb.json"}}`);
  `"credits_add": "<li>…</li>"` is appended to the sources and licences
- `viz3/extra/<feature>/tests.txt` – browser tests of the feature (one `name[:args]` per line, as for `viz3/test/run.py`); the workflow
  `.github/workflows/feat.yml` runs them on `feat/**` branches and keeps `out/` (screenshots, logs) as an artifact

Only small files (each < 5 MB), only what may be public (open licences, own work); no raw data, no keys.
