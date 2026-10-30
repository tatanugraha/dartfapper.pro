// Local-only Worker/D1 adapter for UI verification; never a deployment command.
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,join,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import worker from '../src/kafra-entry.js';
import {localD1} from './local-d1.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const secretRoot=process.argv[2];if(!secretRoot)throw new Error('Private credentials directory required');
const secrets=JSON.parse(await readFile(join(secretRoot,'worker-secrets.json'),'utf8'));
const {vars}=JSON.parse(await readFile(join(root,'worker/wrangler.kafra.jsonc'),'utf8'));
const DB=localD1((await Promise.all(['kafra-schema.sql','kafra-seed.sql'].map(file=>readFile(join(root,'worker',file),'utf8')))).join('\n'));
const assetRoot=join(root,'kafra');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.ttf':'font/ttf'};
const ASSETS={async fetch(request){const path=new URL(request.url).pathname;const name=path==='/'?'index.html':path.slice(1);
  if(!['index.html','style.css','admin.js','logo.svg','UncialAntiqua-Regular.ttf','OFL-UncialAntiqua.txt'].includes(name))return new Response('Not found',{status:404});
  return new Response(await readFile(join(assetRoot,name)),{headers:{'Content-Type':types[extname(name)]??'text/plain'}});
}};
const client=process.argv[3];
const server=createServer(async(req,res)=>{
  try{
    const env={...vars,...secrets,DB,ASSETS,KAFRA_DEV_LOCAL:'1'};
    let activeClient=client;
    try{activeClient=(await readFile(join(secretRoot,'preview-client.txt'),'utf8')).trim();}catch{}
    if(activeClient){try{
      const folder=dirname(activeClient),name=(await readdir(folder)).find(name=>name.startsWith(activeClient.split(/[\\/]/).pop()+'.autogate-')&&name.endsWith('.ini'));
      const ready=(await readFile(join(folder,name))).subarray(2).toString('utf16le');
      env.KAFRA_GATE_URL='http://127.0.0.1:'+ready.match(/Port=(\d+)/)[1];
    }catch{}}
    const bytes=[];for await(const chunk of req)bytes.push(chunk);
    const request=new Request('http://localhost:4178'+req.url,{method:req.method,headers:req.headers,
      ...(req.method==='POST'?{body:Buffer.concat(bytes)}:{})});
    const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500);res.end('Local preview error');}
});
server.listen(4178,'127.0.0.1',()=>console.log('Kafra owner preview: http://localhost:4178 (loopback only)'));
