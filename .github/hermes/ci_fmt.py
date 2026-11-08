#!/usr/bin/env python3
"""Gate de formatage LabKit (job CI `fmt`). Bibliothèque standard uniquement.

Contrôle chaque fichier texte suivi : pas de tabulations, pas d'espaces
en fin de ligne, fichier terminé par un saut de ligne. CRLF accepté
(les postes Windows checkoutent en CRLF, la CI tourne sur Linux).
Exclus : dist/ (généré), three.min.js (vendored), design/logo/ (sources).
"""

import os
import subprocess
import sys

EXTENSIONS = (".js", ".mjs", ".css", ".html", ".json", ".md", ".yml",
              ".yaml", ".py", ".bat", ".txt", ".svg")
EXCLUS = ("dist/", "three.min.js", "design/logo/")


def racine_depot():
    try:
        out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, check=True)
        return out.stdout.strip()
    except Exception:
        return os.getcwd()


def fichiers_suivis(root):
    out = subprocess.run(["git", "-C", root, "ls-files"],
                         capture_output=True, text=True, check=True)
    for rel in out.stdout.split():
        chemin = rel.replace("\\", "/")
        if not chemin.endswith(EXTENSIONS):
            continue
        if any(ex in chemin for ex in EXCLUS):
            continue
        yield rel


def controler(path):
    """Retourne la liste des défauts trouvés dans le fichier."""
    defauts = []
    with open(path, "rb") as handle:
        data = handle.read()
    if b"\t" in data:
        defauts.append("tabulation interdite (espaces uniquement)")
    for numero, line in enumerate(data.split(b"\n"), start=1):
        corps = line[:-1] if line.endswith(b"\r") else line
        if corps != corps.rstrip(b" \t"):
            defauts.append("ligne %d : espace en fin de ligne" % numero)
            break
    if not data.endswith(b"\n"):
        defauts.append("saut de ligne final manquant")
    return defauts


def main():
    root = racine_depot()
    total, erreurs = 0, 0
    for rel in fichiers_suivis(root):
        total += 1
        for defaut in controler(os.path.join(root, rel)):
            erreurs += 1
            print("::error file=%s::%s" % (rel, defaut))
    print("%d fichier(s) contrôlé(s) : %d erreur(s)" % (total, erreurs))
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())
