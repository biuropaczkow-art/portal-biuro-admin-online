import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('./site/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
export function createDemoServer(){
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end('Method not allowed')}
  let route;
  try {route=decodeURIComponent((req.url||'/').split('?')[0]);}catch{res.writeHead(400);return res.end('Bad request')}
  if(route.includes('\\')||route.includes('\0')||route.split('/').some(s=>s==='..'||s.startsWith('.'))){res.writeHead(400);return res.end('Bad request')}
  if(route==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end(req.method==='HEAD'?undefined:'demo-ok')}
  let file;
  if(['/','/demo','/demo/'].includes(route)) file='index.html';
  else if(route.startsWith('/assets/')||['/og.png','/favicon.svg'].includes(route))file=route.slice(1);
  else {res.writeHead(404);return res.end('Not found')}
  try {const data=await readFile(path.join(root,file));res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data)}catch{res.writeHead(404);res.end('Not found')}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxHeadersCount=50;
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||18080),host=process.env.HOST||'127.0.0.1';
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PORT must be 1024..65535');
 const server=createDemoServer();
 server.listen(port,host,()=>console.log(`Demo listening on ${host}:${port}; no accounts or API`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
}
