#!/usr/bin/env python3
"""Sous-agent Hermes LabKit : rebase + résolution + push (jamais de merge).

Dispatché par hermes-lite sur VRAI conflit : verrous → fast-path → clone →
passes IA/déterministe/arbitrage → validation node → régénération dérivés →
NO-LOSS → push avec lease → ré-armement → rapport. Deadline interne avec
abandon propre avant le kill. [HERMES-NO-CLOSE] : échec = re-dispatch.
"""

import base64
import datetime
import os
import shutil
import subprocess
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ghops
from resolve import (fw_resolve, fw_resolve_hunks, heuristic_resolve,
                     valid_llm_output, find_generators, is_generated,
                     llm_available, llm_skip_reason, too_big_for_whole_file,
                     IA_FILE_CAP, validate_tree, noloss_check)

PROTECTED_REFS = ("main", "master", "production", "develop", "development")
DEADLINE_S = 240
LOOP_MAX_PASSES = 4

GH = ""
REPO = ""
PR_NUMBER = ""
HEAD_REF = ""
BASE_REF = ""
EXPECTED_SHA = ""
PUSH_TOKEN = ""
WORK = ""
REDACT = []
START = time.time()
ARBITRATE_MODE = False
ia_ok, heur_ok, failed_files = [], [], []
regen_required, regen_done = [], []
arbitrage_ok, intent_gaps = [], []
ia_hunks, ia_count = {}, 0
rebased_onto = ""


def scrub(text):
    for s in REDACT:
        if s:
            text = text.replace(s, "***")
    return text

def run(cmd, timeout=300, cwd=None):
    if cwd is None:
        cwd = WORK or None
    print("+ " + scrub(" ".join(cmd)))
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, errors="replace",
                              timeout=timeout, cwd=cwd,
                              env={**os.environ, "GIT_EDITOR": "true", "GIT_PAGER": "cat"})
    except subprocess.TimeoutExpired:
        print("!! timeout après %ss" % timeout)
        return None
    if proc.stdout and proc.stdout.strip():
        print(scrub(proc.stdout[-2500:]))
    if proc.returncode != 0 and proc.stderr and proc.stderr.strip():
        print(scrub(proc.stderr[-2500:]))
    return proc


def gi(*args, **kw):
    kw.setdefault("cwd", WORK)
    return run(["git"] + list(args), **kw)

def _git_ok(*args):
    r = gi(*args)
    return r is not None and r.returncode == 0


def file_content(rev, path):
    proc = run(["git", "show", "%s:%s" % (rev, path)], timeout=60)
    return proc.stdout if proc and proc.returncode == 0 else ""


def apply_mode(path, mode):
    # Pendant un rebase, --ours = la BASE et --theirs = la PR.
    if mode in ("ours", "theirs"):
        return _git_ok("checkout", "--" + mode, "--", path)
    if mode == "union":
        ours = run(["git", "show", "HEAD:" + path], timeout=60)
        theirs = run(["git", "show", "REBASE_HEAD:" + path], timeout=60)
        if ours is None or theirs is None:
            return False
        merged = sorted({l.rstrip("\r") for l in (ours.stdout + "\n" + theirs.stdout).splitlines() if l.strip()})
        with open(os.path.join(WORK, path), "w", encoding="utf-8", newline="\n") as fh:
            fh.write("\n".join(merged) + "\n")
        return True
    return False


def arbitrate_file(path):
    """Dernier recours : la BASE gagne, hunk par hunk. Rend (ok, contenu|None, écarts)."""
    gaps = []
    try:
        with open(os.path.join(WORK, path), encoding="utf-8") as fh:
            text = fh.read()
    except Exception as exc:
        print("[arbitrage] %s : lecture impossible (%s)" % (path, exc))
        text = None
    from resolve import split_conflict_hunks
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
        if _git_ok("checkout", "--" + mode, "--", path):
            gaps.append("`%s` — arbitrage fichier entier : %s" % (path, note))
            return True, None, gaps
    if _git_ok("rm", "-f", "--", path):
        gaps.append("`%s` — arbitrage : supprimé côté base, intention PR écartée" % path)
        return True, None, gaps
    return False, None, []


def resolve_one(path, base_t, ours_t, theirs_t, use_llm, blacklist):
    """Résout UN fichier. Rend 'ia' / 'heur:<mode>' / 'arbitrage' / None."""
    global ia_count
    out = None
    if path in blacklist:
        print("[resolver] %s : IA interdite (suspect)" % path)
    elif use_llm and ia_count < IA_FILE_CAP and llm_available():
        skip = llm_skip_reason(path, base_t, ours_t, theirs_t)
        if skip and too_big_for_whole_file(base_t, ours_t, theirs_t) and not is_generated(path):
            print("[resolver] %s : %s — bascule par hunk" % (path, skip))
            out, n = fw_resolve_hunks(path, lambda p: open(os.path.join(WORK, p), encoding="utf-8").read())
            if out is not None:
                bad = valid_llm_output(path, out, ours_t, theirs_t)
                if bad:
                    print("[resolver] sortie IA (hunks) REFUSÉE pour %s : %s" % (path, bad))
                    out = None
                else:
                    ia_hunks[path] = n
        elif skip:
            print("[resolver] %s : IA écartée (%s)" % (path, skip))
        else:
            out = fw_resolve(path, base_t, ours_t, theirs_t)
            if out is not None:
                bad = valid_llm_output(path, out, ours_t, theirs_t)
                if bad:
                    print("[resolver] sortie IA REFUSÉE pour %s : %s" % (path, bad))
                    out = None
        if out is not None:
            ia_count += 1
    elif use_llm and not llm_available():
        print("[resolver] %s : pas de clé Fireworks — déterministe" % path)
    if out is not None:
        with open(os.path.join(WORK, path), "w", encoding="utf-8", newline="\n") as fh:
            fh.write(out)
        ia_ok.append(path)
        return "ia"
    mode = heuristic_resolve(path)
    if mode and apply_mode(path, mode):
        heur_ok.append("%s (repli: %s)" % (path, mode))
        if is_generated(path):
            regen_required.append(path)
        return "heur:" + mode
    if ARBITRATE_MODE:
        ok_a, out_a, gaps_a = arbitrate_file(path)
        if ok_a:
            if out_a is not None:
                with open(os.path.join(WORK, path), "w", encoding="utf-8", newline="\n") as fh:
                    fh.write(out_a)
            arbitrage_ok.append(path)
            intent_gaps.extend(gaps_a)
            if is_generated(path):
                regen_required.append(path)
            return "arbitrage"
    failed_files.append(path)
    return None


def do_rebase(use_llm, llm_blacklist=None):
    """Reset sur origin/<head> + rebase sur origin/<base> avec résolution."""
    global ia_ok, heur_ok, failed_files, regen_required, rebased_onto
    global arbitrage_ok, intent_gaps, ia_hunks, ia_count
    blacklist = set(llm_blacklist or ())
    ia_ok, heur_ok, failed_files, regen_required = [], [], [], []
    arbitrage_ok, intent_gaps = [], []
    ia_hunks, ia_count = {}, 0
    if os.path.isdir(os.path.join(WORK, ".git", "rebase-merge")) or \
       os.path.isdir(os.path.join(WORK, ".git", "rebase-apply")):
        gi("rebase", "--abort")
    gi("fetch", "--no-tags", "origin", BASE_REF, HEAD_REF, timeout=300)
    tip = run(["git", "rev-parse", "origin/" + BASE_REF], timeout=60)
    rebased_onto = tip.stdout.strip() if tip and tip.returncode == 0 else ""
    if not _git_ok("checkout", "-B", HEAD_REF, "origin/" + HEAD_REF):
        return None
    proc = gi("rebase", "--empty=drop", "origin/" + BASE_REF, timeout=600)
    rounds = 0
    while proc is not None and proc.returncode != 0 and rounds < 12 \
            and (time.time() - START) <= DEADLINE_S:
        rounds += 1
        u = run(["git", "diff", "--name-only", "--diff-filter=U"], timeout=60)
        conflicts = [l.strip() for l in (u.stdout or "").splitlines() if l.strip()] if u and u.returncode == 0 else []
        if not conflicts:
            break
        mb = run(["git", "merge-base", "REBASE_HEAD", "origin/" + BASE_REF], timeout=60)
        base_rev = mb.stdout.strip() if mb and mb.returncode == 0 and mb.stdout.strip() else "origin/" + BASE_REF
        for f in conflicts:
            resolve_one(f, file_content(base_rev, f), file_content("HEAD", f),
                        file_content("REBASE_HEAD", f), use_llm, blacklist)
        if failed_files:
            break
        run(["git", "add", "--"] + conflicts)
        proc = gi("rebase", "--continue", timeout=600)
    return proc


def do_rebase_passes():
    """Boucle IA/déterministe puis arbitrage. Rend (proc, n_passes)."""
    global ARBITRATE_MODE
    proc, passes = None, 0
    while passes < LOOP_MAX_PASSES and (time.time() - START) <= DEADLINE_S:
        passes += 1
        proc = do_rebase(use_llm=(passes not in (2, 4)))
        if proc is not None and proc.returncode == 0:
            return proc, passes
        gi("rebase", "--abort")
        print("[resolver][LOOP] passe %d/%d échouée" % (passes, LOOP_MAX_PASSES))
    if (proc is None or proc.returncode != 0) and (time.time() - START) <= DEADLINE_S:
        passes += 1
        ARBITRATE_MODE = True
        try:
            proc = do_rebase(use_llm=False)
        finally:
            ARBITRATE_MODE = False
        if proc is not None and proc.returncode == 0:
            return proc, passes
        gi("rebase", "--abort")
    return proc, passes


def regen_derived():
    """Régénère les dérivés résolus côté base + commit dédié."""
    global regen_done
    regen_done = []
    if not regen_required:
        return
    scripts = []
    for f in sorted(set(regen_required)):
        for g in find_generators(WORK, os.path.basename(f)):
            if g not in scripts:
                scripts.append(g)
    for g in scripts[:4]:
        r = run(["node", g], timeout=600)
        if r is None or r.returncode != 0:
            print("[regen] %s en échec — signalé « à régénérer »" % g)
    st = run(["git", "status", "--porcelain"], timeout=120)
    changed = [l.strip()[3:].strip() for l in (st.stdout or "").splitlines() if l.strip()] if st else []
    if changed and _git_ok("add", "-A"):
        cm = gi("commit", "-m", "chore(hermes): régénération des dérivés après rebase [HERMES-REGEN]")
        if cm is not None and cm.returncode == 0:
            regen_done.extend(changed)


def push_branch():
    """Push avec lease. Rend True si poussé."""
    if HEAD_REF.startswith("mergify/") or HEAD_REF in PROTECTED_REFS or HEAD_REF == BASE_REF:
        print("[resolver] push refusé : branche protégée ou file Mergify")
        return False
    lease = ("--force-with-lease=refs/heads/%s:%s" % (HEAD_REF, EXPECTED_SHA)
             if EXPECTED_SHA else "--force-with-lease")
    refspec = "%s:%s" % (HEAD_REF, HEAD_REF)
    proc = None
    if PUSH_TOKEN:
        hdr = "AUTHORIZATION: basic " + base64.b64encode(("x-access-token:%s" % PUSH_TOKEN).encode()).decode()
        proc = gi("-c", "http.https://github.com/.extraheader=" + hdr, "push", lease, "origin", refspec, timeout=300)
        if proc is not None and proc.returncode != 0:
            print("[resolver] push via PAT échoué — repli ambiant")
    if proc is None or proc.returncode != 0:
        proc = gi("push", lease, "origin", refspec, timeout=300)
    return proc is not None and proc.returncode == 0


def build_lines(before, after, notes):
    lines = ["Branche `%s` rebasée sur `%s` (`%s` → `%s`)."
             % (HEAD_REF, BASE_REF, before[:8], after[:8])]
    if ia_ok:
        lines.append("**Conflits résolus par IA (Fireworks)** : " + ", ".join(
            "`%s`%s" % (f, " (%d hunks)" % ia_hunks[f] if f in ia_hunks else "") for f in ia_ok))
    if heur_ok:
        lines.append("**Résolus sans IA (déterministe)** : " + ", ".join("`%s`" % f for f in heur_ok))
    if arbitrage_ok:
        lines.append("**Arbitrage déclaré — la base gagne** : " + ", ".join("`%s`" % f for f in arbitrage_ok))
        lines.extend("- écart d'intention : %s" % g for g in intent_gaps[:20])
    if regen_done:
        lines.append("**Dérivés régénérés** (commit dédié) : " + ", ".join("`%s`" % f for f in regen_done[:20]))
    if regen_required:
        lines.append("**À régénérer** (côté base conservé) : " + ", ".join("`%s`" % f for f in sorted(set(regen_required))[:20]))
    lines.extend(notes)
    return lines


def abort(pr, ok, title, lines):
    """Sortie : rapport + check (+ escalade si échec réel). Exit 0 si
    transitoire, 1 si panne réelle (alerte GitHub)."""
    num = pr["number"]
    if not ok:
        lines = list(lines) + ["",
            "_[HERMES-NO-CLOSE] La PR reste ouverte et Hermes re-dispatchera "
            "automatiquement (backoff plafonné), sans limite._"]
    ghops.complete_check(EXPECTED_SHA or (pr.get("head") or {}).get("sha", ""),
                         ok, title, "\n".join(lines))
    ghops.post_report(num, ok, lines, ghops.read_attempts(num) if ok else ghops.read_attempts(num) + 1)
    if not ok:
        try:
            ghops.escalate(num, HEAD_REF, title, lines)
        except Exception as exc:
            print("[resolver][ESCALADE] échec non bloquant : %s" % exc)
    print("[resolver] " + title + " :: " + " | ".join(lines))
    sys.exit(0 if ok else 1)


def validate_with_retries(notes):
    """Validation + rattrapages (blacklist IA, puis sans IA).
    Rend ('ok', note) / ('casse', passe) / ('rouge', note)."""
    ok_v, note_v = validate_tree(WORK)
    if ok_v:
        return "ok", note_v
    if ia_ok:
        notes.append("**Rattrapage** : validation rouge après IA — passe sans IA sur : "
                     + ", ".join("`%s`" % f for f in ia_ok))
        p2 = do_rebase(True, llm_blacklist=list(ia_ok))
        if p2 is None or p2.returncode != 0:
            gi("rebase", "--abort")
            return "casse", "rattrapage"
        regen_derived()
        ok_v, note_v = validate_tree(WORK)
        if ok_v:
            return "ok", note_v
    if ia_ok or heur_ok:
        notes.append("**Dernier rattrapage** : passe complète sans IA.")
        p3 = do_rebase(False)
        if p3 is None or p3.returncode != 0:
            gi("rebase", "--abort")
            return "casse", "dernier rattrapage"
        regen_derived()
        ok_v, note_v = validate_tree(WORK)
        if ok_v:
            return "ok", note_v
    return "rouge", note_v


def fail_push_blocked(pr, title, lines):
    ghops.set_label(pr["number"], ghops.LABEL_RESOLVER, False)
    ghops.set_label(pr["number"], ghops.LABEL_FAILED, True)
    abort(pr, False, title, lines)


def main():
    global GH, REPO, PR_NUMBER, HEAD_REF, BASE_REF, EXPECTED_SHA, PUSH_TOKEN, WORK, REDACT, START
    GH = os.environ["GH_TOKEN"]
    REPO = os.environ["GITHUB_REPOSITORY"]
    PR_NUMBER = os.environ["PR_NUMBER"]
    HEAD_REF = os.environ["HEAD_REF"]
    BASE_REF = os.environ["BASE_REF"]
    EXPECTED_SHA = (os.environ.get("HEAD_SHA") or "").strip()
    PUSH_TOKEN = (os.environ.get("PUSH_TOKEN") or "").strip()
    FWK = (os.environ.get("FW_KEY") or "").strip()
    if FWK:
        os.environ["FIREWORKS_API_KEY"] = FWK
    REDACT = [s for s in (GH, PUSH_TOKEN, FWK) if s]
    REDACT += [base64.b64encode(("x-access-token:%s" % s).encode()).decode()
               for s in (GH, PUSH_TOKEN) if s]
    START = time.time()
    ghops.configure(GH, REPO)
    print("[resolver] PR #%s %s -> %s (IA : %s)" % (
        PR_NUMBER, HEAD_REF, BASE_REF, "Fireworks" if llm_available() else "désactivée (pas de clé)"))

    pr = ghops.api("GET", "/repos/%s/pulls/%s" % (REPO, PR_NUMBER))
    if pr.get("_error") or pr.get("state") != "open":
        print("[resolver] PR introuvable ou fermée — abandon (pas une panne)")
        sys.exit(0)
    if (pr.get("head") or {}).get("repo", {}).get("full_name") not in (None, "", REPO):
        abort(pr, False, "Fork non supporté",
              ["PR issue d'un fork : push réservé aux branches du dépôt."])
    if (pr.get("base") or {}).get("ref") != BASE_REF or (pr.get("head") or {}).get("ref") != HEAD_REF:
        abort(pr, True, "Refs modifiées", ["Refs changées depuis le dispatch — prudence."])
    if EXPECTED_SHA and (pr.get("head") or {}).get("sha") != EXPECTED_SHA:
        abort(pr, True, "Head modifié", ["Head changé depuis le dispatch — re-dispatch à venir."])

    probe = ghops.fastpath_probe(pr["number"], EXPECTED_SHA, BASE_REF)
    if probe == "clean":
        ghops.set_label(pr["number"], ghops.LABEL_RESOLVER, False)
        ghops.complete_check(EXPECTED_SHA, True, "Déjà à jour", "Rien à rebaser.")
        ghops.post_report(pr["number"], True, ["Branche déjà à jour — aucun clone, aucun push."],
                           ghops.read_attempts(pr["number"]))
        sys.exit(0)
    if probe == "serveur":
        ghops.rearm_checks(pr["number"], BASE_REF, HEAD_REF, PUSH_TOKEN)
        ghops.set_label(pr["number"], ghops.LABEL_RESOLVER, False)
        ghops.complete_check(EXPECTED_SHA, True, "Rebase serveur OK", "Sans conflit : update-branch.")
        ghops.post_report(pr["number"], True,
                           ["Retard sans conflit : rebase serveur (update-branch), checks ré-armés."],
                           ghops.read_attempts(pr["number"]))
        sys.exit(0)

    WORK = tempfile.mkdtemp(prefix="hermes-resolver-")
    print("[resolver] workspace : %s" % WORK)
    try:
        r = gi("clone", "--no-tags", "https://github.com/%s.git" % REPO, WORK, timeout=600)
        if r is None or r.returncode != 0:
            abort(pr, False, "Clone impossible", ["Le clone du dépôt a échoué."])
        if gi("checkout", "-B", HEAD_REF, "origin/" + HEAD_REF).returncode != 0:
            abort(pr, False, "Branche introuvable", ["Branche %s introuvable." % HEAD_REF])
        _b = run(["git", "rev-parse", "HEAD"])
        before = _b.stdout.strip() if _b and _b.returncode == 0 else ""
        proc, n_passes = do_rebase_passes()
        if (time.time() - START) > DEADLINE_S:
            abort(pr, True, "Budget temps interne atteint",
                  ["Deadline %ds — abandon propre avant le kill, re-dispatch à venir." % DEADLINE_S])
        if proc is None or proc.returncode != 0:
            gi("rebase", "--abort")
            fail_push_blocked(pr, "Rebase non résoluble après %d passes" % n_passes,
                              ["Non résolus : %s" % ", ".join("`%s`" % f for f in failed_files) if failed_files
                               else "Rebase non abouti.", "Aucun push effectué."])
        regen_derived()
        notes = []
        if not (ia_ok or heur_ok or arbitrage_ok or failed_files):
            notes.append("Fast-path : rebase sans conflit — validation CI après push.")
        else:
            verdict, payload = validate_with_retries(notes)
            if verdict == "casse":
                fail_push_blocked(pr, "Rebase non résoluble (%s)" % payload,
                                  notes + ["%s non abouti — aucun push." % payload.capitalize()])
            if verdict == "rouge":
                fail_push_blocked(pr, "Validation en échec après rebase",
                                  notes + ["Rebase OK mais **validation rouge** — push bloqué :", "```",
                                           payload[-2000:], "```"])
            notes.append(payload)
        _a = run(["git", "rev-parse", "HEAD"])
        after = _a.stdout.strip() if _a and _a.returncode == 0 else ""
        lines = build_lines(before, after, notes)
        pertes = noloss_check(WORK, HEAD_REF, BASE_REF, bool(ia_ok or heur_ok or arbitrage_ok))
        if pertes:
            fail_push_blocked(pr, "Perte de commits détectée — push refusé",
                              ["**Garde-fou NO-LOSS** : branche intacte, aucun push.", ""]
                              + ["- " + x for x in pertes[:10]])
        if (time.time() - START) > DEADLINE_S:
            abort(pr, True, "Budget temps interne atteint",
                  ["Deadline avant push — abandon propre, re-dispatch à venir."])
        if not push_branch():
            fail_push_blocked(pr, "Push refusé",
                              lines + ["", "Push refusé (head distant modifié ou droits)."])
        rearmed = ghops.rearm_checks(pr["number"], BASE_REF, HEAD_REF, PUSH_TOKEN)
        ghops.set_label(pr["number"], ghops.LABEL_RESOLVER, False)
        ghops.set_label(pr["number"], ghops.LABEL_FAILED, False)
        ghops.set_label(pr["number"], ghops.LABEL_ESCALADE, False)
        lines.append("")
        if rearmed:
            lines.append("Checks ré-armés : " + ", ".join("`%s`" % w for w in rearmed) + ".")
        lines.append("Push effectué — la CI tourne sur le nouveau head, puis Hermes ré-évalue.")
        ghops.complete_check(EXPECTED_SHA, True, "Conflits résolus + push (%s)" % after[:8], "\n".join(lines))
        ghops.post_report(pr["number"], True, lines, ghops.read_attempts(pr["number"]))
        print("[resolver] PR #%s : OK (%s)" % (PR_NUMBER, after[:8]))
    finally:
        shutil.rmtree(WORK, ignore_errors=True)


def _sh(cmd, cwd):
    return subprocess.run(cmd, capture_output=True, text=True, errors="replace",
                          cwd=cwd, timeout=120,
                          env={**os.environ, "GIT_EDITOR": "true", "GIT_PAGER": "cat",
                               "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@t",
                               "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@t"})


def selftest():
    """Batterie sans secrets ni réseau (git local). Rend n échecs."""
    global WORK, HEAD_REF, BASE_REF, EXPECTED_SHA
    fails = []

    def check(nom, cond):
        print(("[OK] " if cond else "[KO] ") + nom)
        if not cond:
            fails.append(nom)

    os.environ.pop("FIREWORKS_API_KEY", None)
    tmp = tempfile.mkdtemp(prefix="resolver-selftest-")
    try:
        origin = os.path.join(tmp, "origin")
        os.makedirs(origin)
        _sh(["git", "init", "-b", "main", "."], origin)
        nf = os.path.join(origin, "notes.txt")
        open(nf, "w").write("ligne commune\n")
        _sh(["git", "add", "-A"], origin)
        _sh(["git", "commit", "-m", "base"], origin)
        _sh(["git", "checkout", "-b", "pr"], origin)
        open(nf, "w").write("ligne commune\najout PR\n")
        _sh(["git", "commit", "-am", "pr"], origin)
        _sh(["git", "checkout", "main"], origin)
        open(nf, "w").write("ligne commune\najout base\n")
        _sh(["git", "commit", "-am", "base"], origin)
        WORK = os.path.join(tmp, "work")
        _sh(["git", "clone", origin, WORK], tmp)
        _sh(["git", "fetch", "origin", "main", "pr"], WORK)
        HEAD_REF, BASE_REF, EXPECTED_SHA = "pr", "main", ""
        proc = do_rebase(use_llm=False)
        ok = proc is not None and proc.returncode == 0
        with open(os.path.join(WORK, "notes.txt")) as fh:
            contenu = fh.read()
        check("e2e rebase déterministe (union)", ok and "ajout PR" in contenu and "ajout base" in contenu)
        check("témoin heuristique", any("notes.txt" in h for h in heur_ok))
        _sh(["git", "reset", "--hard", "origin/main"], WORK)
        pertes = noloss_check(WORK, "pr", "main", False)
        check("NO-LOSS détecte le vidage", any("viderait" in p for p in pertes))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    body = ghops.report_body(True, ["ligne"], 2)
    check("marqueurs rapport",
          ghops.MARKER in body and "<!-- hermes-resolver:attempts=2 -->" in body
          and "<!-- hermes-resolver:at=" in body)
    check("rapport échec = re-tentable", "NO-CLOSE" in ghops.report_body(False, ["ligne"], 1))
    print("%d échec(s) sur le selftest resolver.py" % len(fails))
    return len(fails)


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--selftest":
        sys.exit(1 if selftest() else 0)
    if len(sys.argv) == 2 and sys.argv[1] == "--run":
        main()
    else:
        print("usage: resolver.py --run | --selftest")
        sys.exit(2)
