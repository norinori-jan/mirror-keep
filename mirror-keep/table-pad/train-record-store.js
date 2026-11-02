(function(){
'use strict';
if(window.TablePadTrainStore)return;
const KEY='tp_tables_v1',CUR='tp_cur',TITLE='電車・交通記録';
function read(){try{const a=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function write(tables,cur){localStorage.setItem(KEY,JSON.stringify(tables));if(cur)localStorage.setItem(CUR,cur)}
function cleanRows(rows){return(Array.isArray(rows)?rows:[]).map(r=>Array.isArray(r)?r.map(v=>String(v==null?'':v)):[]).filter(r=>r.length)}
function append(rows,title){
 const incoming=cleanRows(rows);if(incoming.length<2)throw new Error('交通記録が空です');
 const tables=read(),name=title||TITLE;
 let t=tables.find(x=>x&&x.title===name);
 if(!t){
   const id='t'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
   t={id,title:name,d:incoming,header:true,at:Date.now()};
   tables.push(t);write(tables,id);return{created:true,added:incoming.length-1,id,title:name};
 }
 if(!Array.isArray(t.d)||!t.d.length){t.d=incoming;t.header=true}
 else{
   const header=t.d[0].map(v=>String(v==null?'':v));
   const inHeader=incoming[0].map(v=>String(v==null?'':v));
   const same=header.length===inHeader.length&&header.every((v,i)=>v===inHeader[i]);
   const body=same?incoming.slice(1):incoming.slice(1).map(r=>{const x=r.slice(0,header.length);while(x.length<header.length)x.push('');return x});
   t.d=t.d.concat(body);
 }
 t.at=Date.now();write(tables,t.id);return{created:false,added:incoming.length-1,id:t.id,title:t.title,totalRows:Math.max(0,t.d.length-1)};
}
function find(title){return read().find(t=>t&&t.title===(title||TITLE))||null}
window.TablePadTrainStore={KEY,CUR,TITLE,append,find};
})();
