# Stimmen: du statt Sie

Falko (25.10.2026): Im Dorf duzen alle den Spieler. Huberts aufgenommene Sätze, die „Sie“ sagten, sind mit derselben Stimme neu
aufgenommen (`tools/voices/du_lines.py`, GitHub Actions `.github/workflows/stimmen.yml`): `dist/snd/voice/du/*.mp3`, dazu
`manifest.json` – `vm_replace` ersetzt beim Bauen (`viz3/build.py`) die alten Zeilen gleicher `id`, `vm.topics` die Themen-Knöpfe.
