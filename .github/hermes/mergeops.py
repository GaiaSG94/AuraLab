#!/usr/bin/env python3
"""Opérations de fusion fichier du sous-agent Hermes LabKit.

`apply_mode` (ours/theirs/union) et `arbitrate_file` (dernier recours :
la BASE gagne, hunk par hunk, écarts tracés). Bibliothèque standard,
aucun secret manipulé ici (chemins et refs git uniquement).
"""

import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from resolve import split_conflict_hunks


def _g(work, *args, timeout=120):
    print("+ git " + " ".join(args))
    try:
        return subprocess.run(["git"] + list(args), capture_output=True, text=True,
                              errors="replace", cwd=work, timeout=timeout,
                              env={**os.environ, "GIT_EDITOR": "true", "GIT_PAGER": "cat"})
    except subprocess.TimeoutExpired:
        return None


def apply_mode(work, path, mode):
    """Applique ours/theirs/union sur un fichier en conflit. Rend True/False.
    Pendant un rebase, --ours = la BASE et --theirs = la PR."""
    if mode in ("ours", "theirs"):
        r = _g(work, "checkout", "--" + mode, "--", path)
        return r is not None and r.returncode == 0
    if mode == "union":
        ours = _g(work, "show", "HEAD:" + path, timeout=60)
        theirs = _g(work, "show", "REBASE_HEAD:" + path, timeout=60)
        if ours is None or theirs is None:
            return False
        merged = sorted({l.rstrip("\r") for l in (ours.stdout + "\n" + theirs.stdout).splitlines() if l.strip()})
        with open(os.path.join(work, path), "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(merged) + "\n")
        return True
    return False


def arbitrate_file(work, path):
    """Dernier recours : la BASE gagne, hunk par hunk.
    Rend (ok, contenu|None, écarts d'intention)."""
    gaps = []
    try:
        with open(os.path.join(work, path), encoding="utf-8") as fh:
            text = fh.read()
    except Exception as exc:
        print("[arbitrage] %s : lecture impossible (%s)" % (path, exc))
        text = None
    segments, n_hunks = (None, 0) if text is None else split_conflict_hunks(text)
    if segments is not None and n_hunks > 0:
        out_parts, idx = [], 0
        for seg in segments:
            if seg[0] == "clean":
                out_parts.append(seg[1])
                continue
            idx += 1
            _, ours_h, theirs_h, _ = seg
            if ours_h.strip():
                out_parts.append(ours_h)
                gaps.append("`%s` (hunk %d/%d) — base conservée, intention PR écartée" % (path, idx, n_hunks))
            else:
                out_parts.append(theirs_h)
        return True, "\n".join(out_parts), gaps
    for mode, note in (("ours", "version de base"),
                       ("theirs", "contenu PR conservé (rien côté base)")):
        r = _g(work, "checkout", "--" + mode, "--", path)
        if r is not None and r.returncode == 0:
            gaps.append("`%s` — arbitrage fichier entier : %s" % (path, note))
            return True, None, gaps
    r = _g(work, "rm", "-f", "--", path)
    if r is not None and r.returncode == 0:
        gaps.append("`%s` — arbitrage : supprimé côté base, intention PR écartée" % path)
        return True, None, gaps
    return False, None, []
