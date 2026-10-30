import {adminApi} from './kafra-admin.js';
export default {async fetch(request,env){
  const url=new URL(request.url);let response;
  try{
    response=url.pathname.startsWith('/api/')?await adminApi(request,env):await env.ASSETS.fetch(request);
  }catch{response=new Response(JSON.stringify({error:'service_unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});}
  response=new Response(response.body,response);
  response.headers.set('Cache-Control','no-store');
  response.headers.set('X-Content-Type-Options','nosniff');response.headers.set('Referrer-Policy','no-referrer');
  response.headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  response.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  return response;
}};
