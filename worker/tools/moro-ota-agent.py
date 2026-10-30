#!/usr/bin/env python3
"""OTA agent for one Mobile RO app: reports what its web and web-canary channels serve to the dartfapper console
and runs the one action the console may ask for, promote (canary -> production).

Runs on the host that serves the app's OTA files, once a minute from cron. Promote reuses the Remote class of
MobileRO's tools/ota-remote-linux.py (the same checks ota-admin.ps1 uses: canary checksums verified, production
snapshotted to web-releases first). The bundle is already signed on the PC, so nothing is signed here; rollback
needs a new signature and stays a PC command. The server's Mobile RO ingest key is read from KEY_FILE.

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

def promote(remote, root):
    canary = os.path.join(root, 'web-canary')
    version = remote.promote(canary)
    # release.json is not part of the signed bundle; carry it over so the console shows what production now serves.
    try:
        release = json.load(open(os.path.join(canary, 'release.json'), encoding='utf-8'))
        release['channel'] = 'production'
        temporary = os.path.join(root, 'web', 'release.json.pending')
        with open(temporary, 'w', encoding='utf-8') as f:
            json.dump(release, f, indent=2)
        os.replace(temporary, os.path.join(root, 'web', 'release.json'))
    except (OSError, ValueError):
        pass
    return 'promoted version %d' % version

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
    state = lambda: {'production': channel(remote, os.path.join(root, 'web')), 'canary': channel(remote, os.path.join(root, 'web-canary'))}
    action = post(key, state()).get('action')
    if not action:
        return
    try:
        if action.get('action') != 'promote':
            raise ValueError('Unsupported action')
        done = {'id': action['id'], 'ok': True, 'message': promote(remote, root)}
    except Exception as error:
        done = {'id': action['id'], 'ok': False, 'message': str(error)[:300]}
    post(key, dict(state(), done=done))

if __name__ == '__main__':
    main()
