// KAGI / voice-pad -> table-pad transfer adapter
const STORAGE_KEY='tp_set_transfer', MAX_HASH_CHARS=200000, MAX_ITEMS=10000, MAX_TEXT=20000;
function isRecord(v){return v!==null&&typeof v==='object'&&!Array.isArray(v)}
function boundedText(v,f){if(typeof v!=='string')throw new TypeError(f+' must be a string');if(v.length>MAX_TEXT)throw new RangeError(f+' is too long');return v}
export function validateTablePadPayload(p){
 if(!isRecord(p))throw new TypeError('Payload must be a JSON object');
 if(Array.isArray(p.sets)){if(p.sets.length>MAX_ITEMS)throw new RangeError('Too many sets');return{sets:p.sets.map((s,i)=>{if(!isRecord(s)||!Array.isArray(s.items))throw new TypeError('sets['+i+'] is invalid');return{name:boundedText(s.name,'sets['+i+'].name'),items:s.items.map((x,j)=>boundedText(x,'sets['+i+'].items['+j+']'))}})}}
 if(Array.isArray(p.items)){if(p.items.length>MAX_ITEMS)throw new RangeError('Too many items');return{items:p.items.map((x,i)=>{if(!isRecord(x)||!Array.isArray(x.tags))throw new TypeError('items['+i+'] is invalid');return{title:boundedText(x.title,'items['+i+'].title'),tags:x.tags.map((t,j)=>boundedText(t,'items['+i+'].tags['+j+'])')}})}}
 throw new TypeError('Payload must contain either a sets array or an items array')
}
function enc(t){const b=new TextEncoder().encode(t);let s='';for(const x of b)s+=String.fromCharCode(x);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function dec(s){if(!s||s.length>MAX_HASH_CHARS||!/^[A-Za-z0-9_-]+$/.test(s))throw new TypeError('Invalid transfer data');const b=s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4);const bin=atob(b);return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bin,c=>c.charCodeAt(0)))}
export function createTablePadTransferUrl(url,p){const u=new URL(url);u.hash='sets='+enc(JSON.stringify(validateTablePadPayload(p)));return u.toString()}
export function readTablePadTransferFromHash(hash=globalThis.location?.hash||''){const p=new URLSearchParams(String(hash).replace(/^#/,'')),v=p.get('sets');if(!v)return null;return validateTablePadPayload(JSON.parse(dec(v)))}
export function readTablePadTransfer(options={}){const p=readTablePadTransferFromHash(options.hash??globalThis.location?.hash??'');return p?{source:'hash',payload:p}:null}
export function consumeTablePadTransfer(source,options={}){if(source!=='hash')return;const u=new URL(options.url??location.href);u.hash='';(options.history??history).replaceState(null,'',u.toString())}
export const TABLE_PAD_TRANSFER_STORAGE_KEY=STORAGE_KEY;
