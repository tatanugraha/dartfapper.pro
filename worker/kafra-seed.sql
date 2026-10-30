-- Servers that already run a dartfapper product. Safe to re-run: existing rows are left as they are.
-- Ragna Next (Kafra Guard) is the Super Admin's own gate, configured by KAFRA_GATE_URL / KAFRA_GATE_KEY, not a row here.
-- The MoRo ingest key for each server is generated on first save in Servers & owners → Manage.
INSERT OR IGNORE INTO kafra_servers (id,name,moro,created_at) VALUES ('4c6570616b524f00','Lepak RO',1,1793318400000);
INSERT OR IGNORE INTO kafra_servers (id,name,moro,created_at) VALUES ('4f747469524f0000','OTTi RO',1,1793318400000);
