// Adds KAFRA_DATA_KEY (seals Server Owner gate keys in D1) to an existing private worker-secrets.json.
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {join,isAbsolute} from 'node:path';
const root=process.argv[2];if(!root||!isAbsolute(root))throw new Error('Usage: node worker/tools/add-kafra-data-key.mjs <absolute-private-directory>');
const path=join(root,'worker-secrets.json'),secrets=JSON.parse(await readFile(path,'utf8'));
if(secrets.KAFRA_DATA_KEY){console.log('KAFRA_DATA_KEY already present; unchanged (rotating it would orphan stored gate keys).');process.exit(0);}
secrets.KAFRA_DATA_KEY=randomBytes(32).toString('base64url');
await writeFile(path,JSON.stringify(secrets,null,2),{mode:0o600});
console.log('KAFRA_DATA_KEY added. Upload again with wrangler secret bulk.');
