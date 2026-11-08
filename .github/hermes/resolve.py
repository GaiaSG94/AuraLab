#!/usr/bin/env python3
"""Resolution de conflits pour Hermes LabKit. Bibliothèque standard uniquement.

Jambe IA directe = Fireworks (pas Agnes) : chat/completions, modèle
`accounts/fireworks/models/deepseek-v4p1-flash-1017`, clé lue dans
FIREWORKS_API_KEY. Sans clé : 100 % déterministe + escalade, jamais
d'échec silencieux.

Politique fichiers (LabKit) :
- dérivés (dist/*.html) : JAMAIS soumis à l'IA, côté base, puis RÉGÉNÉRÉS
  (le générateur est retrouvé par grep du basename dans scripts/).
- vendored (vendor/, *.min.js) : côté base, signalés, jamais régénérés.
- binaires (images, polices, pdf) : côté base + note pour humain.
- union (lignes triées) : .md/.txt/.csv/.gitignore.
- critiques (.github/, *.json, code) : IA ou arbitrage uniquement.

Importable sans effet de bord (le resolveur l'utilise) ; `--selftest`
sans secrets ni réseau (hors node local pour la syntaxe JS).
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request

FW_URL = "https://api.fireworks.ai/inference/v1/chat/completions"
FW_MODEL_DEFAULT = "accounts/fireworks/models/deepseek-v4p1-flash-1017"
FW_TIMEOUT = 120
LLM_MAX_SIDE = 12000
HUNK_CONTEXT_LINES = 30
HUNK_MAX_SIDE = 20000
HUNK_MAX_COUNT = 50
IA_FILE_CAP = 20

DERIVED_PREFIXES = ("dist/",)
VENDORED_MARKERS = ("vendor/", ".min.js")
BINARY_EXTS = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".pdf", ".mp4",
               ".mp3", ".ttf", ".otf", ".woff", ".woff2", ".ico", ".svg")
UNION_EXTS = (".md", ".txt", ".csv", ".gitignore")
CRITICAL_HINTS = (".github/", "config.json")


def fw_model():
    return (os.environ.get("FIREWORKS_MODEL") or "").strip() or FW_MODEL_DEFAULT


def too_big_for_whole_file(*sides):
    return max([len(s or "") for s in sides] or [0]) > LLM_MAX_SIDE


def fw_key():
    return (os.environ.get("FIREWORKS_API_KEY") or "").strip()


def llm_available():
    """La jambe IA peut-elle servir ? (clé présente — aucun appel réseau)."""
    return bool(fw_key())


def is_generated(path):
    low = path.lower().replace("\\", "/")
    return low.startswith(DERIVED_PREFIXES)


def is_vendored(path):
    low = path.lower().replace("\\", "/")
    return any(m in low for m in VENDORED_MARKERS)


def is_binaryish(path):
    return path.lower().endswith(BINARY_EXTS)


def is_union(path):
    low = path.lower()
    return low.endswith(UNION_EXTS)


def is_critical(path):
    return any(h in path for h in CRITICAL_HINTS)


def llm_skip_reason(path, *sides):
    if is_generated(path):
        return "fichier dérivé — régénération, pas réécriture d'IA"
    if is_vendored(path) or is_binaryish(path):
        return "fichier vendored/binaire — côté base"
    biggest = max([len(s or "") for s in sides] or [0])
    if biggest > LLM_MAX_SIDE:
        return "%d car. > %d : fichier entier impossible" % (biggest, LLM_MAX_SIDE)
    return None


def fw_chat(system, user, label, max_tokens=8000):
    """Un appel Fireworks. Rend le contenu dépouillé, ou None."""
    key = fw_key()
    if not key:
        return None
    payload = {"model": fw_model(),
               "messages": [{"role": "system", "content": system},
                            {"role": "user", "content": user}],
               "max_tokens": max_tokens, "temperature": 0.0}
    req = urllib.request.Request(FW_URL, data=json.dumps(payload).encode(),
                                 method="POST")
    req.add_header("Authorization", "Bearer " + key)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=FW_TIMEOUT) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        print("[llm] %s : HTTP %s" % (label, exc.code))
        return None
    except Exception as exc:
        print("[llm] %s : %s" % (label, exc))
        return None
    try:
        out = (data["choices"][0]["message"].get("content") or "").strip()
    except Exception:
        print("[llm] %s : réponse illisible" % label)
        return None
    if not out:
        print("[llm] %s : réponse vide" % label)
        return None
    if out.startswith("```"):
        parts = out.split("```")
        out = parts[1] if len(parts) >= 2 else out
        out = out.split("\n", 1)[1] if "\n" in out else out
    if not out.strip() or any(m in out for m in ("<<<<<<<", ">>>>>>>")) \
            or "\n=======" in out:
        print("[llm] %s : sortie refusée (marqueurs de conflit)" % label)
        return None
    return out[:-1] if out.endswith("\n") else out


SYS_FILE = ("Tu es le sous-agent Hermes (projet LabKit) spécialisé dans la "
            "résolution de conflits de rebase. On te donne un fichier en "
            "conflit : version BASE (ancêtre commun), version A (branche de "
            "base, à conserver par défaut) et version B (la PR). Produis le "
            "contenu final du fichier qui fusionne les intentions de A et B "
            "sans régression et SANS marqueurs de conflit. Règle d'arbitrage : "
            "A fait foi. Quand A et B changent le même comportement, conserve "
            "A et RE-APPLIQUE l'intention de B par-dessus de façon "
            "complémentaire ; si l'intention de B contredit A, c'est A qui "
            "gagne (la base). Réponds UNIQUEMENT avec le contenu complet du "
            "fichier dans un seul bloc de code, sans commentaire ni explication.")

SYS_HUNK = ("Tu es le sous-agent Hermes (projet LabKit). On te donne UN SEUL "
            "hunk en conflit (pas le fichier entier) : version A (branche de "
            "base, à conserver par défaut) et version B (la PR), avec le "
            "contexte environnant en lecture seule. Produis le contenu final "
            "de CE HUNK UNIQUEMENT, qui fusionne les intentions de A et B "
            "sans régression et SANS marqueurs de conflit. Règle d'arbitrage : "
            "A fait foi. Ne reproduis PAS le contexte. Réponds UNIQUEMENT "
            "avec le contenu du hunk dans un seul bloc de code.")


def fw_resolve(path, base_t, ours_t, theirs_t):
    if not llm_available():
        return None
    if is_generated(path) or is_vendored(path) or is_binaryish(path):
        return None
    if max(len(base_t or ""), len(ours_t or ""), len(theirs_t or "")) > LLM_MAX_SIDE:
        return None
    user = ("FICHIER: %s\n\n===== BASE (ancêtre) =====\n%s\n"
            "===== A (base de la PR) =====\n%s\n===== B (PR) =====\n%s"
            % (path, base_t[:40000], ours_t[:40000], theirs_t[:40000]))
    return fw_chat(SYS_FILE, user, path)


def split_conflict_hunks(text):
    """Découpe un fichier marqué git en segments. Rend (segments, n) ou (None, 0).
    segments = ("clean", texte) ou ("conflict", ours, theirs, base|None).
    Supporte les styles merge et diff3."""
    lines = text.split("\n")
    segments, clean_buf = [], []
    i, n, hunks = 0, len(lines), 0
    while i < n:
        if lines[i].startswith("<<<<<<< "):
            if clean_buf:
                segments.append(("clean", "\n".join(clean_buf)))
                clean_buf = []
            i += 1
            ours, theirs, base = [], [], None
            while i < n and not lines[i].startswith("=======") \
                    and not lines[i].startswith("||||||| "):
                ours.append(lines[i])
                i += 1
            if i < n and lines[i].startswith("||||||| "):
                base = []
                i += 1
                while i < n and not lines[i].startswith("======="):
                    base.append(lines[i])
                    i += 1
                base = "\n".join(base)
            if i >= n:
                return None, 0
            i += 1
            while i < n and not lines[i].startswith(">>>>>>> "):
                theirs.append(lines[i])
                i += 1
            if i >= n:
                return None, 0
            i += 1
            segments.append(("conflict", "\n".join(ours), "\n".join(theirs), base))
            hunks += 1
        else:
            if lines[i].startswith(("=======", ">>>>>>> ", "||||||| ")):
                return None, 0
            clean_buf.append(lines[i])
            i += 1
    if clean_buf:
        segments.append(("clean", "\n".join(clean_buf)))
    return segments, hunks


def fw_resolve_hunks(path, read_file):
    """Résolution par hunk, sans limite de taille de fichier.
    read_file(path) -> texte marqué. Rend (contenu, n) ou (None, 0)."""
    if is_generated(path) or not llm_available():
        return None, 0
    try:
        text = read_file(path)
    except Exception as exc:
        print("[llm-hunk] %s : lecture impossible (%s)" % (path, exc))
        return None, 0
    segments, n_hunks = split_conflict_hunks(text)
    if segments is None or n_hunks == 0:
        return None, 0
    if n_hunks > HUNK_MAX_COUNT:
        print("[llm-hunk] %s : %d hunks > %d — abandon" % (path, n_hunks, HUNK_MAX_COUNT))
        return None, 0
    out_parts, prev_tail, idx = [], [], 0
    for si, seg in enumerate(segments):
        if seg[0] == "clean":
            out_parts.append(seg[1])
            prev_tail = seg[1].split("\n")[-HUNK_CONTEXT_LINES:]
            continue
        _, ours_h, theirs_h, base_h = seg
        idx += 1
        if max(len(ours_h), len(theirs_h), len(base_h or "")) > HUNK_MAX_SIDE:
            return None, 0
        next_head = []
        for sj in range(si + 1, len(segments)):
            if segments[sj][0] == "clean":
                next_head = segments[sj][1].split("\n")[:HUNK_CONTEXT_LINES]
                break
        parts = ["FICHIER: %s (hunk %d/%d)" % (path, idx, n_hunks)]
        if base_h:
            parts.append("===== BASE (ancêtre, ce hunk) =====\n%s" % base_h)
        parts.append("===== A (base de la PR, ce hunk) =====\n%s" % ours_h)
        parts.append("===== B (PR, ce hunk) =====\n%s" % theirs_h)
        parts.append("===== CONTEXTE AVANT (ne pas reproduire) =====\n%s" % "\n".join(prev_tail))
        parts.append("===== CONTEXTE APRES (ne pas reproduire) =====\n%s" % "\n".join(next_head))
        resolved = fw_chat(SYS_HUNK, "\n".join(parts), "%s hunk %d/%d" % (path, idx, n_hunks))
        if resolved is None:
            return None, 0
        out_parts.append(resolved)
        prev_tail = resolved.split("\n")[-HUNK_CONTEXT_LINES:]
    return "\n".join(out_parts), n_hunks


def heuristic_resolve(path):
    """Stratégie déterministe ('ours'/'union'/None). Jamais sur critique."""
    low = path.lower().replace("\\", "/")
    if is_generated(path) or is_vendored(path) or is_binaryish(path):
        return "ours"
    if is_critical(path):
        return None
    if is_union(path):
        return "union"
    return None


def valid_llm_output(path, content, *sides):
    """Raison de REFUSER une sortie d'IA, ou None si utilisable."""
    if not content or not content.strip():
        return "sortie vide"
    if any(m in content for m in ("<<<<<<<", ">>>>>>>")) or "\n=======" in content:
        return "marqueurs de conflit résiduels"
    floor = int(min([len(s or "") for s in sides] or [0]) * 0.5)
    if floor > 0 and len(content) < floor:
        return "sortie tronquée (%d car., minimum %d)" % (len(content), floor)
    low = path.lower()
    if low.endswith(".json"):
        try:
            json.loads(content)
        except Exception as exc:
            return "JSON invalide (%s)" % exc
    elif low.endswith((".js", ".mjs", ".cjs")):
        node = shutil.which("node") or "node"
        cand_dir = os.path.join(tempfile.gettempdir(), ".hermes-syntax-check")
        try:
            os.makedirs(cand_dir, exist_ok=True)
            cand = os.path.join(cand_dir, "cand.mjs")
            with open(cand, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(content)
            proc = subprocess.run([node, "--check", cand], capture_output=True,
                                  text=True, errors="replace", timeout=120)
            if proc.returncode != 0:
                last = ((proc.stderr or "").strip().splitlines() or ["?"])[-1]
                return "syntaxe JS invalide (%s)" % last
        except Exception as exc:
            print("[check] %s : contrôle impossible (%s)" % (path, exc))
        finally:
            shutil.rmtree(cand_dir, ignore_errors=True)
    return None


def find_generators(work, basename):
    """Scripts de scripts/ qui citent ce fichier dérivé (au plus 3)."""
    hits = []
    sdir = os.path.join(work, "scripts")
    try:
        names = sorted(os.listdir(sdir))
    except Exception:
        return hits
    for name in names:
        if not name.endswith((".mjs", ".js", ".cjs")) or ".test." in name:
            continue
        fpath = os.path.join(sdir, name)
        try:
            if os.path.getsize(fpath) > 2_000_000:
                continue
            with open(fpath, encoding="utf-8", errors="replace") as fh:
                if basename in fh.read():
                    hits.append("scripts/" + name)
        except Exception:
            continue
        if len(hits) >= 3:
            break
    return hits


def _git(work, *args, timeout=120):
    try:
        return subprocess.run(["git"] + list(args), capture_output=True, text=True,
                              errors="replace", cwd=work, timeout=timeout,
                              env={**os.environ, "GIT_EDITOR": "true", "GIT_PAGER": "cat"})
    except subprocess.TimeoutExpired:
        return None


def validate_tree(work):
    """Validation toolchain LabKit (node direct, pas de npm : pas de
    package.json). Rend (ok, note)."""
    if not os.path.isfile(os.path.join(work, "scripts", "validate-config.mjs")):
        return True, "validation non applicable (pas de validateur)."
    try:
        proc = subprocess.run(["node", "scripts/validate-config.mjs"], capture_output=True,
                              text=True, errors="replace", cwd=work, timeout=300)
    except Exception as exc:
        return False, "validateur : lancement impossible (%s)" % exc
    if proc.returncode == 0:
        return True, "Validation labos : verte sur l'arbre rebasé."
    return False, ((proc.stdout or "") + (proc.stderr or ""))[-2000:]


def noloss_check(work, head_ref, base_ref, resolved_any):
    """Garde-fou NO-LOSS. Rend la liste des pertes (vide = push autorisé).
    Règle 1 : jamais de diff nul sur une PR qui avait un diff.
    Règle 2 : sur rebase pur, chaque patch-id d'origine doit survivre
    (ou provenir de la base) — sauf fichiers résolus (relecture humaine)."""
    def rev(name):
        r = _git(work, "rev-parse", name)
        return r.stdout.strip() if r is not None and r.returncode == 0 else ""

    def patch_ids(revrange):
        log = _git(work, "log", "-p", "--no-merges", "--pretty=format:commit %H",
                   revrange, timeout=300)
        if log is None or log.returncode != 0:
            return None
        pid = subprocess.run(["git", "patch-id", "--stable"], input=log.stdout,
                             capture_output=True, text=True, errors="replace",
                             cwd=work, timeout=120)
        if pid.returncode != 0:
            return None
        return set(l.split()[0] for l in pid.stdout.splitlines() if l.strip())

    head_now, orig_head = rev("HEAD"), rev("origin/" + head_ref)
    mb = _git(work, "merge-base", "origin/" + base_ref, "origin/" + head_ref)
    merge_base = mb.stdout.strip() if mb is not None and mb.returncode == 0 else ""
    diff_had = _git(work, "diff", "--quiet", "origin/" + base_ref, orig_head)
    diff_has = _git(work, "diff", "--quiet", "origin/" + base_ref, head_now)
    had_diff = bool(orig_head) and diff_had is not None and diff_had.returncode != 0
    has_diff = bool(head_now) and diff_has is not None and diff_has.returncode != 0
    pertes = []
    if had_diff and not has_diff:
        pertes.append("le rebase viderait intégralement la PR (diff nul contre `%s`)" % base_ref)
    if orig_head and head_now and merge_base:
        orig_p = patch_ids("origin/%s..%s" % (base_ref, orig_head))
        new_p = patch_ids("origin/%s..%s" % (base_ref, head_now))
        base_p = patch_ids("%s..origin/%s" % (merge_base, base_ref))
        if orig_p is None or new_p is None or base_p is None:
            if not resolved_any:
                pertes.append("vérification des patch-ids impossible")
        else:
            manquants = sorted(orig_p - new_p - base_p)
            if manquants and not resolved_any:
                for pid in manquants:
                    pertes.append("patch `%s` ni dans le head ni dans la base" % pid[:12])
    elif not resolved_any:
        pertes.append("refs illisibles pour la vérification")
    return pertes


def selftest():
    """Batterie sans secrets ni réseau. Rend le nombre d'échecs."""
    fails = []

    def check(nom, cond):
        print(("[OK] " if cond else "[KO] ") + nom)
        if not cond:
            fails.append(nom)

    # 1. Jambe directe = Fireworks (contrat du chantier).
    check("jambe directe = Fireworks",
          FW_URL == "https://api.fireworks.ai/inference/v1/chat/completions"
          and FW_MODEL_DEFAULT == "accounts/fireworks/models/deepseek-v4p1-flash-1017")
    # 2. Clé fw => disponible (aucun appel réseau ici).
    os.environ.pop("FIREWORKS_API_KEY", None)
    sans = llm_available()
    os.environ["FIREWORKS_API_KEY"] = "cle-factice-selftest"
    avec = llm_available()
    os.environ.pop("FIREWORKS_API_KEY", None)
    check("clé fw => disponible", sans is False and avec is True)
    check("sans clé => fw_resolve rend None",
          fw_resolve("a.js", "x", "y", "z") is None)
    # 3. Découpe merge.
    merge = "a\n<<<<<<< HEAD\nours1\n=======\ntheirs1\n>>>>>>> b\nc"
    segs, n = split_conflict_hunks(merge)
    check("découpe merge", n == 1 and segs[0] == ("clean", "a")
          and segs[1][0] == "conflict" and segs[1][1] == "ours1"
          and segs[1][2] == "theirs1" and segs[1][3] is None)
    # 4. Découpe diff3.
    diff3 = "<<<<<<< HEAD\no\n||||||| base\nb\n=======\nt\n>>>>>>> b"
    segs, n = split_conflict_hunks(diff3)
    check("découpe diff3", n == 1 and segs[0][3] == "b")
    # 5. Marqueurs illisibles.
    check("marqueurs illisibles refusés",
          split_conflict_hunks("a\n=======\nb")[0] is None)
    # 6. Validation des sorties.
    check("marqueurs résiduels refusés",
          valid_llm_output("a.js", "x\n<<<<<<< h\ny") is not None)
    check("tronquée refusée",
          valid_llm_output("a.txt", "court", "u" * 100, "v" * 100) is not None)
    check("JSON valide accepté",
          valid_llm_output("c.json", '{"a": 1}', '{"a": 1}') is None)
    check("JSON invalide refusé",
          valid_llm_output("c.json", '{"a": }', '{"a": 1}') is not None)
    if shutil.which("node"):
        check("JS valide accepté",
              valid_llm_output("a.js", "const x = 1;\n", "const x = 1;") is None)
        check("JS invalide refusé",
              valid_llm_output("a.js", "const x = ;\n", "const x = 1;") is not None)
    # 7. Heuristiques.
    check("dérivé -> ours", heuristic_resolve("dist/labkit-eco.html") == "ours")
    check("vendored -> ours",
          heuristic_resolve("app-ponts/vendor/three.min.js") == "ours")
    check("binaire -> ours", heuristic_resolve("doc/logo.png") == "ours")
    check("md -> union", heuristic_resolve("notes.md") == "union")
    check("critique -> None",
          heuristic_resolve(".github/workflows/ci.yml") is None
          and heuristic_resolve("app-eco/config.json") is None)
    # 8. Générateurs (arbre factice).
    tmp = tempfile.mkdtemp(prefix="fw-selftest-")
    try:
        os.makedirs(os.path.join(tmp, "scripts"))
        with open(os.path.join(tmp, "scripts", "gen.mjs"), "w") as fh:
            fh.write("// produit dist/labkit-eco.html\n")
        check("générateur retrouvé",
              find_generators(tmp, "labkit-eco.html") == ["scripts/gen.mjs"])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print("%d échec(s) sur le selftest resolve.py" % len(fails))
    return len(fails)


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--selftest":
        sys.exit(1 if selftest() else 0)
    print("usage: resolve.py --selftest")
    sys.exit(2)
