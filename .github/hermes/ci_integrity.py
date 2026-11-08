#!/usr/bin/env python3
"""Gate d'intégrité LabKit (job CI `test`). Bibliothèque standard uniquement.

Vérifie : chaque .js/.mjs passe `node --check`, chaque .json se parse,
chaque labo app-*/ contient config.json + lab.js ou game.js.
Exclus : dist/ (généré, couvert par le job build), three.min.js (vendored).
"""

import json
import os
import shutil
import subprocess
import sys

EXCLUS = ("dist/", "three.min.js", "node_modules/")


def racine_depot():
    try:
        out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except Exception:
        return os.getcwd()


def fichiers_suivis(root, suffixes):
    out = subprocess.run(["git", "-C", root, "ls-files"],
                         capture_output=True, text=True, check=True)
    for rel in out.stdout.split():
        chemin = rel.replace("\\", "/")
        if not chemin.endswith(suffixes):
            continue
        if any(ex in chemin for ex in EXCLUS):
            continue
        yield rel


def main():
    root = racine_depot()
    erreurs = 0
    node = shutil.which("node")
    if node is None:
        print("::error::node introuvable sur le PATH")
        return 1

    js = list(fichiers_suivis(root, (".js", ".mjs")))
    for rel in js:
        proc = subprocess.run([node, "--check", os.path.join(root, rel)],
                              capture_output=True, text=True)
        if proc.returncode != 0:
            erreurs += 1
            detail = (proc.stderr.strip().splitlines() or ["erreur"])[0]
            print("::error file=%s::syntaxe : %s" % (rel, detail))
    print("%d fichier(s) JS contrôlé(s)" % len(js))

    jsons = list(fichiers_suivis(root, (".json",)))
    for rel in jsons:
        try:
            with open(os.path.join(root, rel), encoding="utf-8") as handle:
                json.load(handle)
        except Exception as exc:
            erreurs += 1
            print("::error file=%s::JSON invalide : %s" % (rel, exc))
    print("%d fichier(s) JSON contrôlé(s)" % len(jsons))

    labos = sorted(d for d in os.listdir(root)
                   if d.startswith("app-") and os.path.isdir(os.path.join(root, d)))
    if not labos:
        erreurs += 1
        print("::error::aucun labo app-*/ trouvé")
    for labo in labos:
        base = os.path.join(root, labo)
        if not os.path.isfile(os.path.join(base, "config.json")):
            erreurs += 1
            print("::error file=%s::config.json manquant" % labo)
        if not (os.path.isfile(os.path.join(base, "lab.js"))
                or os.path.isfile(os.path.join(base, "game.js"))):
            erreurs += 1
            print("::error file=%s::ni lab.js ni game.js" % labo)
    print("%d labo(s) contrôlé(s)" % len(labos))

    print("total : %d erreur(s)" % erreurs)
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())
