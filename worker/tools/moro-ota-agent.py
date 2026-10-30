#!/usr/bin/env python3
"""OTA agent for one Mobile RO app: reports what its web and web-canary channels serve to the dartfapper console
and runs the actions the console may ask for: promote (canary -> production) and rollback.

Runs on the host that serves the app's OTA files, once a minute from cron. Promote reuses the Remote class of
MobileRO's tools/ota-remote-linux.py (the same checks ota-admin.ps1 uses: canary checksums verified, production
snapshotted to web-releases first); if a promote fails half way the snapshot is copied back. Nothing is signed here:
rollback only applies the rollback publish-web.ps1 signed on the PC for the live bundle (<mobile dir>/web-rollback/
<production version>/: the old manifest re-signed as the next version + from.txt naming the kept bundle). The
server's Mobile RO ingest key is read from KEY_FILE.

  agent.py <mobile dir> <manifest name> <path to ota-remote-linux.py>
  cron: * * * * * python3 agent.py /var/www/lepakro/mobile lepak-web.txt /home/ubuntu/moro-ota-remote-linux.py
"""
import importlib.util, json, os, sys, urllib.request

CONSOLE = 'https://kafra-guard-owner.tatagpriyanugraha.workers.dev/api/ingest/moro/ota'
KEY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ingest.key')

def load_remote(path):
    spec = importlib.util.spec_from_file_location('ota_remote', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.Remote

def channel(remote, folder):
    version = remote.version(folder)
    if version is None:
        return None
    try:
        release = json.load(open(os.path.join(folder, 'release.json'), encoding='utf-8'))
    except (OSError, ValueError):
        release = {}
    return {'version': version, 'tag': release.get('tag'), 'commit': release.get('commit'),
            'builtAt': release.get('builtAt'), 'dirty': release.get('dirty') is True}

def carry_release(source, root, **extra):
    # release.json is not part of the signed bundle; carry it over so the console shows what production now serves.
    try:
        release = json.load(open(os.path.join(source, 'release.json'), encoding='utf-8'))
        release.update(channel='production', **extra)
        temporary = os.path.join(root, 'web', 'release.json.pending')
        with open(temporary, 'w', encoding='utf-8') as f:
            json.dump(release, f, indent=2)
        os.replace(temporary, os.path.join(root, 'web', 'release.json'))
    except (OSError, ValueError):
        pass

def unsigned(text):
    # manifest lines that name the files, without version and signature: what a rollback must match
    return [line for line in text.splitlines() if line and not line.startswith('# sig ') and not line.startswith('version ')]

def prepared(remote, root):
    """(folder, kept version) of the signed rollback ready for the live production bundle, or None."""
    active = remote.version(os.path.join(root, 'web'))
    folder = os.path.join(root, 'web-rollback', str(active))
    try:
        source = int(open(os.path.join(folder, 'from.txt')).read().strip())
        if remote.version(folder) != active + 1:
            return None
    except (OSError, ValueError, TypeError):
        return None
    return folder, source

def rollback_channel(remote, root):
    ready = prepared(remote, root)
    if not ready:
        return None
    kept = os.path.join(root, 'web-releases', str(ready[1]))
    # Before a promote the bundle to go back to is still production itself (it is kept when promote runs).
    folder = kept if os.path.isdir(kept) else os.path.join(root, 'web')
    info = channel(remote, folder)
    return dict(info, version=ready[1]) if info else None

def promote(remote, root):
    canary = os.path.join(root, 'web-canary')
    active = remote.version(os.path.join(root, 'web'))
    try:
        version = remote.promote(canary)
    except Exception:
        # A copy that stopped half way leaves production files that no longer match its manifest; put the kept bundle back.
        kept = os.path.join(root, 'web-releases', str(active))
        if active is not None and os.path.isdir(kept):
            remote.copy(kept, remote.entries(kept), True)
        raise
    carry_release(canary, root)
    return 'promoted version %d' % version

def rollback(remote, root):
    ready = prepared(remote, root)
    if not ready:
        raise ValueError('No signed rollback ready for the live bundle (publish-web.ps1 prepares one)')
    folder, source = ready
    kept = os.path.join(root, 'web-releases', str(source))
    entries = remote.entries(kept)
    signed = open(os.path.join(folder, remote.manifest), encoding='utf-8').read()
    if unsigned(signed) != unsigned(open(os.path.join(kept, remote.manifest), encoding='utf-8').read()):
        raise ValueError('The signed rollback does not match the kept bundle %d' % source)
    active = remote.snapshot()
    open(os.path.join(root, 'web-releases', str(active), 'ROLLED-BACK.txt'), 'w').write('console rollback\n')
    remote.copy(kept, entries, False)
    temporary = os.path.join(root, 'web', remote.manifest + '.pending')
    with open(temporary, 'w', encoding='utf-8') as f:
        f.write(signed)
    os.replace(temporary, os.path.join(root, 'web', remote.manifest))
    carry_release(kept, root, rollbackOf=active)
    return 'rolled back to version %d (served as %d)' % (source, active + 1)

def post(key, body):
    request = urllib.request.Request(CONSOLE, data=json.dumps(body).encode(), method='POST',
                                     headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'User-Agent': 'moro-ota-agent/1'})
    return json.loads(urllib.request.urlopen(request, timeout=15).read() or b'{}')

def main():
    if not os.path.exists(KEY_FILE) or len(sys.argv) != 4:
        return
    key = open(KEY_FILE).read().strip()
    root, manifest, remote_file = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3]
    Remote = load_remote(remote_file)
    remote = Remote(os.path.join(root, 'web'), manifest)
    state = lambda: {'production': channel(remote, os.path.join(root, 'web')), 'canary': channel(remote, os.path.join(root, 'web-canary')),
                     'rollback': rollback_channel(remote, root)}
    action = post(key, state()).get('action')
    if not action:
        return
    try:
        run = {'promote': promote, 'rollback': rollback}.get(action.get('action'))
        if not run:
            raise ValueError('Unsupported action')
        done = {'id': action['id'], 'ok': True, 'message': run(remote, root)}
    except Exception as error:
        done = {'id': action['id'], 'ok': False, 'message': str(error)[:300]}
    post(key, dict(state(), done=done))

if __name__ == '__main__':
    main()
