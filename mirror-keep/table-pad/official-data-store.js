(function(){
'use strict';
if(window.TablePadOfficialStore)return;
const KEY='tp_tables_v1',CUR='tp_cur';
function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch(e){return[]}}
function write(tables,id){localStorage.setItem(KEY,JSON.stringify(tables));if(id)localStorage.setItem(CUR,id)}
function cleanRows(rows){return(Array.isArray(rows)?rows:[]).map(r=>Array.isArray(r)?r.map(v=>String(v==null?'':v)):[]).filter(r=>r.length)}
function append(rows,title){const incoming=cleanRows(rows);if(incoming.length<2)throw new Error('公的情報が空です');const tables=read(),name=title||'公的情報';let t=tables.find(x=>x&&x.title===name);if(!t){const id='t'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);t={id,title:name,d:incoming,header:true,at:Date.now()};tables.push(t);write(tables,id);return{created:true,added:incoming.length-1,id,title:name,totalRows:incoming.length-1}}const header=Array.isArray(t.d)&&t.d.length?t.d[0].map(String):incoming[0].map(String);const same=header.length===incoming[0].length&&header.every((v,i)=>v===String(incoming[0][i]));const body=(same?incoming.slice(1):incoming.slice(1).map(r=>{const x=r.slice(0,header.length);while(x.length<header.length)x.push('');return x}));if(!Array.isArray(t.d)||!t.d.length)t.d=[header];t.d=t.d.concat(body);t.header=true;t.at=Date.now();write(tables,t.id);return{created:false,added:body.length,id:t.id,title:t.title,totalRows:Math.max(0,t.d.length-1)}}
function find(title){return read().find(t=>t&&t.title===(title||'公的情報'))||null}
window.TablePadOfficialStore={KEY,CUR,append,find};
})();
