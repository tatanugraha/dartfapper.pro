#!/usr/bin/env python3
"""Reports the MoRo (mobile) players online on an rAthena server to the dartfapper console.

Runs on the game server, once a minute from cron. Mobile logins are the ones rAthena marked with
login.client_platform = 'mobile' (CA_LOGIN version MORO_CLIENT_VERSION, the same flag Odin uses to skip
phones). Database settings are read from rAthena's conf/inter_athena.conf (+ conf/import/inter_conf.txt);
the server's Mobile RO ingest key is read from KEY_FILE. Without a key file the script does nothing.

  report.py /home/ubuntu/LepakRO2            (cron: * * * * * python3 report.py /home/ubuntu/LepakRO2)
"""
import json, os, re, subprocess, sys, tempfile, urllib.request

CONSOLE = 'https://kafra-guard-owner.tatagpriyanugraha.workers.dev/api/ingest/moro/online'
KEY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ingest.key')

def settings(root):
    values = {}
    for name in ('conf/inter_athena.conf', 'conf/import/inter_conf.txt'):
        try:
            text = open(os.path.join(root, name), encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        for key, value in re.findall(r'^\s*(login_server_(?:ip|port|id|pw|db))\s*:\s*(\S+)', text, re.M):
            values[key] = value
    return values

def players(root):
    db = settings(root)
    with tempfile.NamedTemporaryFile('w', delete=False) as f:
        os.chmod(f.name, 0o600)
        f.write('[client]\nhost=%s\nport=%s\nuser=%s\npassword=%s\n' % (db['login_server_ip'], db['login_server_port'], db['login_server_id'], db['login_server_pw']))
    try:
        sql = ("SELECT c.char_id, c.account_id, l.userid, c.name, c.base_level, l.last_ip FROM `char` c "
               "JOIN login l ON l.account_id = c.account_id WHERE c.online = 1 AND l.client_platform = 'mobile' LIMIT 1000")
        out = subprocess.run(['mysql', '--defaults-extra-file=' + f.name, '-N', '-B', db['login_server_db'], '-e', sql],
                             capture_output=True, text=True, timeout=20, check=True).stdout
    finally:
        os.unlink(f.name)
    rows = []
    for line in out.splitlines():
        char_id, account_id, userid, name, level, ip = line.split('\t')
        rows.append({'charId': int(char_id), 'accountId': int(account_id), 'userid': userid, 'name': name, 'level': int(level), 'ip': ip})
    return rows

def main():
    if not os.path.exists(KEY_FILE):
        return
    key = open(KEY_FILE).read().strip()
    body = json.dumps({'players': players(sys.argv[1] if len(sys.argv) > 1 else '.')}).encode()
    request = urllib.request.Request(CONSOLE, data=body, method='POST',
                                     headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'User-Agent': 'moro-online-report/1'})
    urllib.request.urlopen(request, timeout=15).read()

if __name__ == '__main__':
    main()
