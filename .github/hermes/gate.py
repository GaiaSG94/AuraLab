#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gate Hermes Lite LabKit — fraîcheur exigée AU MOMENT DU MERGE + dispatch resolver.

Règles :
- retard sans conflit  → rebase serveur (PUT /pulls/N/update-branch) ;
  le rebase déclenche `synchronize` qui re-run ce workflow → cycle auto.
- vrai conflit         → DISPATCH du sous-agent (hermes-resolver.yml) qui
  rebase + résout (IA Fireworks puis déterministe) + pousse ; check rouge
  + label `hermes/conflit` en attendant.
- frais + checks requis verts → merge (rebase), une PR à la fois.

Le gate tourne en dry-run (HERMES_LITE_DRY_RUN=1, Mergify pilote les merges) :
le dry-run désactive le MERGE uniquement — le dispatch du résolveur reste
actif (résoudre n'est pas merger). Backoff de re-dispatch : min(15*2^n, 30)
min depuis le dernier rapport, verrou anti-doublon = check ouvert
"Hermes sous-agent (conflits)". [HERMES-NO-CLOSE] : boucle sans limite.
"""

import datetime
import json
import re
import time

API = 'https://api.github.com'
CHECK_NAME = 'hermes-lite/verdict'
LABEL_OK = 'hermes/approuvee'
LABEL_CONFLIT = 'hermes/conflit'
RESOLVER_WORKFLOW = 'hermes-resolver.yml'
RESOLVER_CHECK = 'Hermes sous-agent (conflits)'
LABEL_RESOLVER = 'hermes/sous-agent-conflits'
LABEL_FAILED = 'hermes/resolution-echouee'
LABEL_ESCALADE = 'hermes/intervention-humaine'
ATTEMPT_RE = re.compile(r'<!-- hermes-resolver:attempts=(\d+) -->')
ATTEMPT_AT_RE = re.compile(
    r'<!-- hermes-resolver:at=([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z) -->')
RESOLVER_BACKOFF_BASE_MINUTES = 15
RESOLVER_BACKOFF_MAX_MINUTES = 30
RESOLVER_CHECK_STALE_MINUTES = 180
MAX_RESOLVER_ATTEMPTS = 3


def api(method, url, body=None, token=None):
    import json as _json
    import urllib.request as _ur
    import urllib.error as _ue
    data = _json.dumps(body).encode() if body is not None else None
    req = _ur.Request(API + url, data=data, method=method)
    req.add_header('Authorization', 'Bearer ' + token)
    req.add_header('Accept', 'application/vnd.github+json')
    try:
        with _ur.urlopen(req, timeout=30) as r:
            raw = r.read()
            return r.status, (_json.loads(raw) if raw else None)
    except _ue.HTTPError as e:
        payload = e.read()
        try:
            return e.code, _json.loads(payload)
        except Exception:
            return e.code, payload.decode('utf-8', errors='replace')


def ensure_label(repo, token, name, color, desc):
    api('POST', '/repos/%s/labels' % repo, token=token,
        body={'name': name, 'color': color, 'description': desc})


def set_label(pr, repo, token, name, add):
    num = pr['number']
    has = name in [l['name'] for l in pr.get('labels') or []]
    if add and not has:
        api('POST', '/repos/%s/issues/%d/labels' % (repo, num),
            token=token, body={'labels': [name]})
    elif not add and has:
        api('DELETE', '/repos/%s/issues/%d/labels/%s' % (repo, num, name),
            token=token)


def refresh_branch(repo, token, pr):
    """Rebase serveur d'une PR en retard. Renvoie 'refreshed'/'conflict'/'error'."""
    num = pr['number']
    expected = pr['head']['sha']
    sc, resp = api('PUT', '/repos/%s/pulls/%d/update-branch' % (repo, num),
                   token=token,
                   body={'update_method': 'rebase', 'expected_head_sha': expected})
    if sc == 202:
        return 'refreshed'
    if sc in (409, 422):
        return 'conflict'
    print('[gate] #%d update-branch %s : %s' % (num, sc, resp), flush=True)
    return 'error'


def create_check(repo, token, sha, ok, title, summary):
    api('POST', '/repos/%s/check-runs' % repo, token=token, body={
        'name': CHECK_NAME,
        'head_sha': sha,
        'status': 'completed',
        'conclusion': 'success' if ok else 'failure',
        'output': {'title': title, 'summary': summary},
    })


def required_checks_green(repo, token, pr, required):
    """Statuts de commit requis verts. Liste vide => considéré vert."""
    if not required:
        return True
    sha = pr['head']['sha']
    sc, data = api('GET', '/repos/%s/commits/%s/status' % (repo, sha), token=token)
    if sc != 200 or not data:
        return False
    states = {s['context']: s['state'] for s in data.get('statuses') or []}
    for ctx in required:
        if states.get(ctx) != 'success':
            return False
    return True


def resolver_attempts(repo, token, num):
    sc, comments = api('GET', '/repos/%s/issues/%s/comments?per_page=100' % (repo, num),
                       token=token)
    best = 0
    for c in (comments if isinstance(comments, list) else []):
        m = ATTEMPT_RE.search(c.get('body') or '')
        if m:
            best = max(best, int(m.group(1)))
    return best


def parse_utc(text):
    try:
        return datetime.datetime.strptime(text, '%Y-%m-%dT%H:%M:%SZ').replace(
            tzinfo=datetime.timezone.utc)
    except (TypeError, ValueError):
        return None


def resolver_last_activity(repo, token, num, sha):
    """Dernier rapport du sous-agent (repli : son check terminé)."""
    best = None
    sc, comments = api('GET', '/repos/%s/issues/%s/comments?per_page=100' % (repo, num),
                       token=token)
    for c in (comments if isinstance(comments, list) else []):
        m = ATTEMPT_AT_RE.search(c.get('body') or '')
        if m:
            t = parse_utc(m.group(1))
            if t and (best is None or t > best):
                best = t
    if best is not None:
        return best
    sc, data = api('GET', '/repos/%s/commits/%s/check-runs?per_page=100' % (repo, sha),
                   token=token)
    for chk in (data.get('check_runs', []) if isinstance(data, dict) else []):
        if chk.get('name') != RESOLVER_CHECK or chk.get('status') != 'completed':
            continue
        t = parse_utc(chk.get('completed_at') or '')
        if t and (best is None or t > best):
            best = t
    return best


def resolver_running(repo, token, sha):
    """Un sous-agent est-il déjà en cours (check ouvert récent) sur ce SHA ?"""
    sc, data = api('GET', '/repos/%s/commits/%s/check-runs?per_page=100' % (repo, sha),
                   token=token)
    for chk in (data.get('check_runs', []) if isinstance(data, dict) else []):
        if chk.get('name') != RESOLVER_CHECK or chk.get('status') == 'completed':
            continue
        t = parse_utc(chk.get('started_at') or '')
        if t is None:
            return chk
        age = (datetime.datetime.now(datetime.timezone.utc) - t).total_seconds()
        if age < RESOLVER_CHECK_STALE_MINUTES * 60:
            return chk
    return None


def dispatch_resolver(pr, repo, token):
    """Dispatche le sous-agent sauf backoff/verrou. Rend True si dispatché."""
    num = pr['number']
    head_ref = pr['head']['ref']
    head_sha = pr['head']['sha']
    if (head_ref or '').startswith('mergify/'):
        print('[gate] #%d : branche de file Mergify — pas de dispatch' % num)
        return False
    attempts = resolver_attempts(repo, token, num)
    if attempts:
        print('[gate] #%d : tentative %d après échec(s)' % (num, attempts + 1))
    if attempts >= MAX_RESOLVER_ATTEMPTS:
        # Informatif uniquement : la boucle continue (backoff).
        set_label(pr, repo, token, LABEL_ESCALADE, True)
    delay = min(RESOLVER_BACKOFF_BASE_MINUTES * (2 ** max(attempts, 0)),
                RESOLVER_BACKOFF_MAX_MINUTES)
    last_at = resolver_last_activity(repo, token, num, head_sha)
    if last_at is not None:
        waited = (datetime.datetime.now(datetime.timezone.utc) - last_at).total_seconds()
        if waited < delay * 60:
            print('[gate] #%d : backoff %d min non écoulé — pas de dispatch' % (num, delay))
            return False
    running = resolver_running(repo, token, head_sha)
    if running:
        print('[gate] #%d : sous-agent déjà en cours — pas de doublon' % num)
        return False
    ensure_label(repo, token, LABEL_RESOLVER, '8250df', 'Sous-agent Hermes en cours')
    set_label(pr, repo, token, LABEL_RESOLVER, True)
    sc, _ = api('POST', '/repos/%s/check-runs' % repo, token=token, body={
        'name': RESOLVER_CHECK, 'head_sha': head_sha, 'status': 'in_progress',
        'output': {'title': 'Sous-agent dispatché',
                   'summary': 'Rebase + résolution des conflits en cours.'}})
    if sc not in (200, 201):
        print('[gate] #%d : check-run non créé (%s) — verrou absent' % (num, sc))
    sc, resp = api('POST', '/repos/%s/actions/workflows/%s/dispatches' % (repo, RESOLVER_WORKFLOW),
                   token=token,
                   body={'ref': pr['base']['ref'],
                         'inputs': {'pr_number': str(num), 'head_ref': head_ref,
                                    'base_ref': pr['base']['ref'], 'head_sha': head_sha}})
    if sc != 204:
        print('[gate] #%d : échec dispatch %s : %s' % (num, sc, resp))
        set_label(pr, repo, token, LABEL_RESOLVER, False)
        return False
    print('[gate] #%d : sous-agent dispatché' % num)
    return True


def mark_conflict(pr, repo, token, base_ref, via):
    """Conflit réel : check rouge + label + dispatch du résolveur."""
    num = pr['number']
    sha = pr['head']['sha']
    create_check(repo, token, sha, False,
                 'Conflits avec %s — sous-agent dispatché' % base_ref,
                 'Le sous-agent Hermes rebase et résout (%s). Suivi via le label '
                 '`hermes/conflit` et son rapport sur la PR.' % via)
    set_label(pr, repo, token, LABEL_CONFLIT, True)
    set_label(pr, repo, token, LABEL_OK, False)
    dispatch_resolver(pr, repo, token)
    return 'conflict'


def settle_after_refresh(repo, token, num, required, attempts=10, pause=6, dry=False):
    """Ré-évalue la PR après le rebase serveur, DANS CE RUN (le push bot
    ne déclenche aucun workflow)."""
    for i in range(attempts):
        time.sleep(pause if i else 2)
        sc, pr = api('GET', '/repos/%s/pulls/%d' % (repo, num), token=token)
        if sc != 200 or not isinstance(pr, dict):
            continue
        if pr.get('merged'):
            return 'merged'
        sha = pr['head']['sha']
        base_ref = pr['base']['ref']
        sc, cmp_ = api('GET', '/repos/%s/compare/%s...%s' % (repo, base_ref, sha),
                       token=token)
        behind = cmp_.get('behind_by') if sc == 200 else -1
        behind = behind if isinstance(behind, int) else -1
        if behind > 0:
            continue
        conflicts = (pr.get('mergeable') is False
                     and (pr.get('mergeable_state') or '') == 'dirty')
        if conflicts:
            return mark_conflict(pr, repo, token, base_ref, 'settle après rebase')
        set_label(pr, repo, token, LABEL_OK, True)
        set_label(pr, repo, token, LABEL_RESOLVER, False)
        create_check(repo, token, sha, True, 'PR à jour — merge par le gate',
                     'Fraîche au moment du merge (settle après rebase serveur).')
        if dry:
            return 'dry'
        m = try_merge(repo, token, pr, required)
        print('[gate] #%d : settle merge → %s' % (num, m), flush=True)
        if m != 'waiting':
            return m
    return 'timeout'


def try_merge(repo, token, pr, required):
    """Merge la PR (méthode rebase) si fraîche et checks requis verts."""
    num = pr['number']
    sha = pr['head']['sha']
    sc, cmp_ = api('GET', '/repos/%s/compare/%s...%s'
                   % (repo, pr['base']['ref'], sha), token=token)
    if sc == 200 and cmp_.get('behind_by') not in (0, None):
        return 'behind'
    if not required_checks_green(repo, token, pr, required):
        return 'waiting'
    sc, resp = api('PUT', '/repos/%s/pulls/%d/merge' % (repo, num), token=token,
                   body={'sha': sha, 'merge_method': 'rebase'})
    if sc == 200:
        return 'merged'
    if sc == 409:
        return 'behind'
    print('[gate] #%d merge %s : %s' % (num, sc, resp), flush=True)
    return 'error'


def handle_pr(pr, repo, token, required, dry=False):
    num = pr['number']
    sha = pr['head']['sha']
    base_ref = pr['base']['ref']
    mergeable = pr.get('mergeable')
    mergeable_state = pr.get('mergeable_state') or ''

    sc, cmp_ = api('GET', '/repos/%s/compare/%s...%s' % (repo, base_ref, sha),
                   token=token)
    behind = cmp_.get('behind_by') if sc == 200 else -1
    behind = behind if isinstance(behind, int) else -1
    fresh = behind == 0
    conflicts = (mergeable is False and mergeable_state == 'dirty')

    if conflicts:
        return mark_conflict(pr, repo, token, base_ref, 'conflit détecté')
    set_label(pr, repo, token, LABEL_CONFLIT, False)

    if not fresh:
        if dry:
            print('[gate] #%d : en retard de %s commit(s) (dry-run, Mergify pilote)' % (num, behind))
            return 'dry'
        r = refresh_branch(repo, token, pr)
        print('[gate] #%d : en retard de %s → refresh %s' % (num, behind, r), flush=True)
        if r == 'refreshed':
            return settle_after_refresh(repo, token, num, required, dry=dry)
        if r == 'conflict':
            return mark_conflict(pr, repo, token, base_ref, 'rebase serveur refusé')
        return r

    set_label(pr, repo, token, LABEL_OK, True)
    set_label(pr, repo, token, LABEL_RESOLVER, False)
    create_check(repo, token, sha, True,
                 'PR à jour — merge par le gate',
                 'Fraîche au moment du merge ; %s' %
                 ('checks requis verts' if required else 'aucun check requis configuré'))
    if dry:
        print('[gate] #%d : fraîche — merge possible (dry-run)' % num)
        return 'dry'
    m = try_merge(repo, token, pr, required)
    print('[gate] #%d : merge → %s' % (num, m), flush=True)
    return m


def list_open_prs(repo, token):
    prs, page = [], 1
    while True:
        sc, plist = api('GET', '/repos/%s/pulls?state=open&per_page=100&page=%d'
                        % (repo, page), token=token)
        if sc != 200 or not isinstance(plist, list):
            break
        prs += plist
        if len(plist) < 100:
            break
        page += 1
    return prs


def main():
    import os
    token = os.environ['GH_TOKEN']
    repo = os.environ['GITHUB_REPOSITORY']
    event_name = os.environ['GITHUB_EVENT_NAME']
    required = [s.strip() for s in
                os.environ.get('HERMES_REQUIRED_CHECKS', '').split(',') if s.strip()]
    dry = os.environ.get('HERMES_LITE_DRY_RUN') == '1'

    for lbl in (LABEL_OK, LABEL_CONFLIT):
        ensure_label(repo, token, lbl, '0e8a16' if lbl == LABEL_OK else 'd73a4a',
                     'Posé par hermes-lite')

    with open(os.environ['GITHUB_EVENT_PATH']) as fh:
        event = json.load(fh)

    if event_name == 'workflow_dispatch':
        only = (event.get('inputs') or {}).get('pr_number') or None
        prs = list_open_prs(repo, token)
        if only:
            prs = [p for p in prs if p['number'] == int(only)]
    elif event_name == 'pull_request':
        prs = [event['pull_request']]
    elif event_name == 'check_run':
        sha = event['check_run']['head_sha']
        prs = [p for p in list_open_prs(repo, token)
               if p['head']['sha'] == sha]
    else:
        prs = []

    merged = 0
    for pr in prs:
        if pr.get('draft') or pr.get('state') != 'open':
            continue
        try:
            r = handle_pr(pr, repo, token, required, dry)
            if r == 'merged':
                merged += 1
        except Exception as e:
            print('[gate] #%s exception : %r' % (pr.get('number'), e), flush=True)
    print('[gate] terminé : %d PR traitée(s), %d merge(s)' % (len(prs), merged),
          flush=True)


if __name__ == '__main__':
    main()
