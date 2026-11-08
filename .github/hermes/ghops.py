#!/usr/bin/env python3
"""Opérations GitHub du sous-agent Hermes LabKit. Bibliothèque standard.

Rapports (marqueurs v1/attempts/at — le gate lit attempts), labels,
check verrou, escalade (label + commentaire, informatif), ré-armement
des workflows, sonde fast-path serveur. Aucun appel git ici.
"""

import datetime
import json
import urllib.error
import urllib.request

API = "https://api.github.com"
MARKER = "<!-- hermes-resolver:v1 -->"
ATTEMPT_MARKER = "<!-- hermes-resolver:attempts=%d -->"
ATTEMPT_AT_MARKER = "<!-- hermes-resolver:at=%s -->"
LABEL_RESOLVER = "hermes/sous-agent-conflits"
LABEL_FAILED = "hermes/resolution-echouee"
LABEL_ESCALADE = "hermes/intervention-humaine"
CHECK_NAME = "Hermes sous-agent (conflits)"
HELP_MARKER = "<!-- hermes-resolver:help -->"
HELP_HANDLE = "@GaiaSG94"

_GH = ""
_REPO = ""


def configure(gh, repo):
    global _GH, _REPO
    _GH, _REPO = gh, repo


def now():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def api(method, path, body=None):
    req = urllib.request.Request(API + path, method=method)
    req.add_header("Authorization", "Bearer " + _GH)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    data = json.dumps(body).encode() if body is not None else None
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data, timeout=60) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        return {"_error": exc.code, "_body": exc.read().decode("utf-8", "replace")[:600]}


def read_attempts(num):
    import re as _re
    rx = _re.compile(r"<!-- hermes-resolver:attempts=(\d+) -->")
    comments = api("GET", "/repos/%s/issues/%s/comments?per_page=50" % (_REPO, num))
    best = 0
    for c in (comments if isinstance(comments, list) else []):
        m = rx.search(c.get("body") or "")
        if m:
            best = max(best, int(m.group(1)))
    return best


def set_label(num, name, add):
    if add:
        api("POST", "/repos/%s/issues/%s/labels" % (_REPO, num), {"labels": [name]})
    else:
        api("DELETE", "/repos/%s/issues/%s/labels/%s" % (_REPO, num, name.replace("/", "%2F")))


def complete_check(sha, ok, title, summary):
    if not sha:
        return
    r = api("GET", "/repos/%s/commits/%s/check-runs?per_page=100" % (_REPO, sha))
    for chk in (r.get("check_runs", []) if isinstance(r, dict) else []):
        if chk.get("name") != CHECK_NAME or chk.get("status") == "completed":
            continue
        api("PATCH", "/repos/%s/check-runs/%s" % (_REPO, chk["id"]), {
            "status": "completed", "conclusion": "success" if ok else "failure",
            "completed_at": now(),
            "output": {"title": title, "summary": (summary or "")[:60000]}})


def report_body(ok, lines, attempts):
    if ok:
        head = "## Hermes sous-agent — Conflits résolus automatiquement\n\n"
    else:
        head = ("## Hermes sous-agent — Résolution impossible automatiquement\n\n"
                "_Tentative %d. [HERMES-NO-CLOSE] Pas un état terminal : Hermes "
                "re-dispatchera (backoff plafonné) tant que la PR reste ouverte._\n\n" % attempts)
    return (head + "\n".join(lines) + "\n\n" + (ATTEMPT_MARKER % attempts) + "\n"
            + (ATTEMPT_AT_MARKER % now()) + "\n" + MARKER + "\n")


def post_report(num, ok, lines, attempts=0):
    body = report_body(ok, lines, attempts)
    comments = api("GET", "/repos/%s/issues/%s/comments?per_page=50" % (_REPO, num))
    for c in (comments if isinstance(comments, list) else []):
        if MARKER in (c.get("body") or ""):
            api("PATCH", "/repos/%s/issues/comments/%s" % (_REPO, c["id"]), {"body": body})
            return
    api("POST", "/repos/%s/issues/%s/comments" % (_REPO, num), {"body": body})


def escalate(num, head_ref, title, lines):
    """Demande d'aide explicite, purement informative (la boucle continue)."""
    set_label(num, LABEL_ESCALADE, True)
    body = ("## Hermes sous-agent — Besoin d'un humain\n\n"
            + "%s : passes de rebase épuisées sur cette PR. La branche `%s` est "
              "**intacte** — rien n'a été poussé.\n\n" % (HELP_HANDLE, head_ref)
            + "**Motif** : " + title + "\n\n" + "\n".join(lines) + "\n\n"
            + "_La PR reste ouverte ; le re-dispatch automatique continue._\n" + HELP_MARKER)
    comments = api("GET", "/repos/%s/issues/%s/comments?per_page=50" % (_REPO, num))
    for c in (comments if isinstance(comments, list) else []):
        if HELP_MARKER in (c.get("body") or ""):
            api("PATCH", "/repos/%s/issues/comments/%s" % (_REPO, c["id"]), {"body": body})
            return
    api("POST", "/repos/%s/issues/%s/comments" % (_REPO, num), {"body": body})


def rearm_checks(num, base_ref, head_ref, push_token):
    """Un push bot ne déclenche aucun workflow : ré-arme explicitement.
    Avec PAT : événements naturels, rien à faire. Rend les workflows relancés."""
    if push_token:
        print("[rearm] PAT présent : événements naturels, ré-armement inutile")
        return []
    targets = [("ci.yml", {"ref": head_ref}),
               ("stale-base-guard.yml", {"ref": head_ref, "inputs": {"pr_number": str(num)}}),
               ("hermes-lite.yml", {"ref": base_ref, "inputs": {"pr_number": str(num)}})]
    done = []
    for wf, body in targets:
        r = api("POST", "/repos/%s/actions/workflows/%s/dispatches" % (_REPO, wf), body)
        if isinstance(r, dict) and r.get("_error"):
            print("[rearm] %s : échec %s" % (wf, r.get("_error")))
        else:
            done.append(wf)
    return done


def fastpath_probe(num, expected_sha, base_ref):
    """Sonde serveur avant le chemin lourd. Rend 'clean' (rien à faire),
    'serveur' (rebase serveur fait), ou 'lourd'."""
    import time as _t
    for delay in (0, 5, 10):
        if delay:
            _t.sleep(delay)
        live = api("GET", "/repos/%s/pulls/%s" % (_REPO, num))
        if not isinstance(live, dict) or live.get("_error") is not None:
            continue
        if live.get("state") != "open":
            return "clean"
        if live.get("mergeable") is None:
            continue
        head = (live.get("head") or {}).get("sha") or ""
        base = (live.get("base") or {}).get("ref") or base_ref
        if expected_sha and head != expected_sha:
            return "lourd"
        cmp_ = api("GET", "/repos/%s/compare/%s...%s" % (_REPO, base, head))
        behind = cmp_.get("behind_by") if isinstance(cmp_, dict) else None
        if not isinstance(behind, int):
            behind = 0 if (isinstance(cmp_, dict) and cmp_.get("status") in ("identical", "ahead")) else -1
        if behind == 0:
            return "clean"
        if behind > 0 and live.get("mergeable") is not False:
            up = api("PUT", "/repos/%s/pulls/%s/update-branch" % (_REPO, num),
                     {"update_method": "rebase", "expected_head_sha": head})
            if not isinstance(up, dict) or up.get("_error") is None:
                return "serveur"
        return "lourd"
    return "lourd"
