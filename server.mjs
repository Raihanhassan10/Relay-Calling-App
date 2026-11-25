import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const rooms = new Map();
const id = () => randomBytes(18).toString('base64url');
const assets = Object.fromEntries(['index.html','call.html','style.css','app.js','home.js'].map(f=>[f,readFileSync(new URL('./public/'+f,import.meta.url))]));
const iceServers = process.env.ICE_SERVERS ? JSON.parse(process.env.ICE_SERVERS) : [{urls:'stun:stun.l.google.com:19302'}];
const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'microphone=(self), camera=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(data));}
async function body(req){let parts=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)throw new Error('Request too large');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString()||'{}');}
function emit(p,type,data={}){p.events.push({seq:++p.seq,type,...data});if(p.events.length>400)p.events.shift();}
function end(room,reason){if(room.ended)return;room.ended=Date.now();for(const p of room.peers)emit(p,'ended',{reason});}
const sweep=setInterval(()=>{const now=Date.now();for(const [key,r] of rooms){if(r.ended){if(now-r.ended>120000)rooms.delete(key);continue;}if(now-r.created>8*3600000||(!r.peers.length&&now-r.created>300000)||r.peers.some(p=>now-p.seen>60000))end(r,'The call has expired or a participant disconnected.');}},15000);sweep.unref();
export const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');const path=url.pathname;
  if(req.method==='GET'){
   if(path==='/health')return json(res,200,{ok:true});
   const f=path==='/'?'index.html':/^\/call\/[\w-]{24}$/.test(path)?'call.html':path.slice(1);
   if(Object.hasOwn(assets,f)){res.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8',...headers});return res.end(assets[f]);}
  }
  if(req.method==='POST'&&path==='/api/rooms'){
   if(rooms.size>=2000)return json(res,503,{error:'Server is busy. Try again shortly.'});
   const key=id();rooms.set(key,{created:Date.now(),peers:[],ended:null});return json(res,201,{id:key});
  }
  const m=path.match(/^\/api\/rooms\/([\w-]{24})\/(join|poll|send|end)$/);
  if(!m)return json(res,404,{error:'Not found'});
  const room=rooms.get(m[1]);if(!room)return json(res,404,{error:'Call not found or expired.'});
  const action=m[2];
  if(action==='join'&&req.method==='POST'){
   if(room.ended)return json(res,410,{error:'This call has ended.'});
   if(room.peers.length>=2)return json(res,409,{error:'This call already has two participants.'});
   const p={token:id(),role:room.peers.length?'guest':'host',events:[],seq:0,seen:Date.now()};room.peers.push(p);
   if(room.peers.length===2)emit(room.peers[0],'peer-ready');
   return json(res,200,{token:p.token,role:p.role,iceServers,peerReady:room.peers.length===2});
  }
  const data=req.method==='POST'?await body(req):{};
  const p=room.peers.find(p=>p.token===(req.headers.authorization?.replace(/^Bearer /,'')||data.token));
  if(!p)return json(res,403,{error:'Invalid participant.'});p.seen=Date.now();
  if(action==='poll'&&req.method==='GET'){
   const after=Math.max(0,Number(url.searchParams.get('after'))||0);p.events=p.events.filter(e=>e.seq>after);return json(res,200,{events:p.events,ended:!!room.ended});
  }
  if(action==='end'&&req.method==='POST'){end(room,'A participant ended the call.');return json(res,200,{ok:true});}
  if(action==='send'&&req.method==='POST'){
   if(room.ended)return json(res,410,{error:'Call ended.'});
   const other=room.peers.find(x=>x!==p);if(!other)return json(res,409,{error:'Waiting for the other participant.'});
   if(data.type==='message'){
    if(!['text','caption'].includes(data.kind)||typeof data.text!=='string'||!data.text.trim()||data.text.length>2000)return json(res,400,{error:'Invalid message.'});
    emit(other,'message',{kind:data.kind,text:data.text.trim()});
   }else if(data.type==='signal'){
    if(!data.signal||typeof data.signal!=='object'||!['offer','answer','candidate'].includes(data.signal.type))return json(res,400,{error:'Invalid signal.'});
    emit(other,'signal',{signal:data.signal});
   }else return json(res,400,{error:'Invalid event.'});
   return json(res,200,{ok:true});
  }
  return json(res,405,{error:'Method not allowed'});
 }catch(e){if(!res.headersSent)json(res,400,{error:'Invalid request.'});else res.end();}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Relay is listening.'));
