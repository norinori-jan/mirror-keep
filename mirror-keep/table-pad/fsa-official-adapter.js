(function(){
'use strict';
if(window.TablePadFSA)return;
const VERSION='table_pad_fsa_official_v1';
const PAGE='https://www.fsa.go.jp/status/ginkou_kessan/index.html';
function clean(v,n){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n||1000)}
function abs(href){try{return new URL(href,PAGE).href}catch(e){return ''}}
function pickLatest(doc){const links=[...doc.querySelectorAll('a[href]')];const hits=links.map(a=>({text:clean(a.textContent,300),url:abs(a.getAttribute('href'))})).filter(x=>x.url&&(/令和\s*7年度決算/.test(x.text)||/令和7年度決算/.test(x.text)||/令和\s*8年6月10日/.test(x.text)));return hits[0]||null}
async function fetchLatest(){const r=await fetch(PAGE,{cache:'no-store'});if(!r.ok)throw new Error('金融庁の銀行決算ページに接続できませんでした（HTTP '+r.status+'）');const text=await r.text();const doc=new DOMParser().parseFromString(text,'text/html');const latest=pickLatest(doc);if(!latest)throw new Error('金融庁ページから最新の銀行決算資料を特定できませんでした');const title=clean(latest.text||'令和7年度決算',200);const date=(title.match(/令和\s*8年\s*6月\s*10日/)||[])[0]||'令和8年6月10日';return {schema:VERSION,source:'fsa',sourceName:'金融庁',authority:'金融庁',title:'銀行の決算の状況',category:'金融機関・銀行決算',publication:title,publicationDate:date,documentUrl:latest.url,sourceUrl:PAGE,method:'official-page-link',observedAt:new Date().toISOString()}}
function rows(x){return [['取得日時','情報源','資料','公表日','資料URL','情報源URL','取得方法'],[x.observedAt,'金融庁',x.publication,x.publicationDate,x.documentUrl,x.sourceUrl,x.method]]}
function toOfficial(x){return {schema:VERSION,source:'fsa',sourceName:'金融庁',authority:'金融庁',title:x.title,category:x.category,value:x.publication,unit:'資料',location:'',latitude:null,longitude:null,sourceUrl:x.documentUrl,method:x.method,observedAt:x.observedAt,notes:'金融庁「銀行の決算の状況」から最新公表資料への公式リンクを取得。数値本体の自動抽出は次段階で対応。'}}
window.TablePadFSA={VERSION,PAGE,fetchLatest,rows,toOfficial};
})();
