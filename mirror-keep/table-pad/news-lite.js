(()=>{'use strict';
if(window.__tpNewsLite)return;window.__tpNewsLite=true;
const KEY='tpNewsLite.v2', DAY='tpNewsLite.day.v2', LIMIT='tpNewsLite.limit.v2';
const $=id=>document.getElementById(id);
const today=()=>new Date().toISOString().slice(0,10);
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'')}catch{return f}};
const getDay=()=>{const d=read(DAY,null);return d&&d.day===today()?d:{day:today(),bytes:0,requests:0}};
const getState=()=>read(KEY,{items:[]});
const limit=()=>Number(localStorage.getItem(LIMIT)||500000);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;
function render(){
 const d=getDay(),s=getState(),l=limit();
 $('tpnl-meter').textContent=`本日のAPI応答本文（推定） ${fmt(d.bytes)} / ${fmt(l)}・取得 ${d.requests} 回`;
 $('tpnl-bar').style.width=`${Math.min(100,d.bytes/Math.max(1,l)*100)}%`;
 $('tpnl-count').textContent=`${s.items.length} 件保存`;
 $('tpnl-list').innerHTML=s.items.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,150).map(a=>`<article class="tpnl-item"><small>${esc(a.domain)} · ${esc(a.date)}</small><br><a target="_blank" rel="noopener noreferrer" href="${esc(a.url)}">${esc(a.title)}</a></article>`).join('')||'保存済みニュースはありません。';
}
function mount(){
 if($('tpnl-root'))return;
 const root=document.createElement('section');root.id='tpnl-root';
 root.innerHTML=`<style>#tpnl-root{font:14px/1.5 system-ui,sans-serif;border:1px solid #999;border-radius:12px;padding:16px;margin:18px 0;background:var(--card-bg,#fff);color:var(--text-color,#222)}#tpnl-root *{box-sizing:border-box}#tpnl-root .tpnl-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}#tpnl-root input,#tpnl-root select,#tpnl-root button{font:inherit;padding:7px;max-width:100%}#tpnl-root button{cursor:pointer}#tpnl-root .tpnl-track{height:8px;background:#ddd;border-radius:8px;overflow:hidden}#tpnl-bar{height:100%;width:0;background:#287d62}#tpnl-root .tpnl-item{padding:10px 0;border-bottom:1px solid #ddd;overflow-wrap:anywhere}#tpnl-root small{opacity:.75}</style>
 <h2>低通信量・世界ニュース見張り網</h2><p>見出し・媒体・日時・リンクのみ取得。画像や記事本文は自動取得しません。国内政府系情報は対象外です。</p>
 <div class="tpnl-row"><label>検索語 <input id="tpnl-q" value="world news" maxlength="120"></label><label>期間 <select id="tpnl-hours"><option value="24">24時間</option><option value="48">48時間</option><option value="168">7日間</option></select></label><label>件数 <select id="tpnl-max"><option>10</option><option selected>25</option><option>50</option></select></label></div>
 <div class="tpnl-row"><button id="tpnl-fetch">見出しを取得</button><button id="tpnl-export">JSON書き出し</button><button id="tpnl-clear">保存データ削除</button></div>
 <div class="tpnl-row"><label>1日上限（応答本文の推定） <select id="tpnl-limit"><option value="100000">100 KB</option><option value="250000">250 KB</option><option value="500000">500 KB</option><option value="1000000">1 MB</option><option value="2000000">2 MB</option></select></label></div>
 <div id="tpnl-meter"></div><div class="tpnl-track"><div id="tpnl-bar"></div></div><div class="tpnl-row"><b id="tpnl-count"></b><span id="tpnl-status" role="status"></span></div>
 <p><small>取得元: GDELT。通信量表示はAPI応答本文のみの概算で、TLS/HTTPヘッダー等を含む実通信量ではありません。1回の応答が設定上限を超える可能性があります。世界中の全ニュースを網羅するものではありません。</small></p><div id="tpnl-list"></div>`;
 (document.querySelector('main')||document.querySelector('#app')||document.body).appendChild(root);
 $('tpnl-limit').value=String(limit());$('tpnl-limit').onchange=()=>{localStorage.setItem(LIMIT,$('tpnl-limit').value);render()};
 $('tpnl-fetch').onclick=fetchNews;
 $('tpnl-export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(getState(),null,2)],{type:'application/json'}));a.href=u;a.download='table-pad-world-news.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
 $('tpnl-clear').onclick=()=>{if(confirm('保存したニュース一覧を削除しますか？')){localStorage.removeItem(KEY);render()}};
 render();
}
async function fetchNews(){
 const d=getDay(),l=limit(),status=$('tpnl-status'),btn=$('tpnl-fetch');
 if(d.bytes>=l){status.textContent='本日の設定上限に達しました。';return}
 btn.disabled=true;status.textContent='取得中…';
 try{
  const q=$('tpnl-q').value.trim()||'world news',max=Math.min(50,Math.max(10,Number($('tpnl-max').value)||25)),hours=Number($('tpnl-hours').value)||24;
  const url='https://api.gdeltproject.org/api/v2/doc/doc?query='+encodeURIComponent(q)+'&mode=ArtList&format=json&maxrecords='+max+'&sort=DateDesc&timespan='+hours+'h';
  const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);
  const txt=await res.text(),size=new TextEncoder().encode(txt).length;
  d.bytes+=size;d.requests++;localStorage.setItem(DAY,JSON.stringify(d));
  const data=JSON.parse(txt),s=getState(),m=new Map(s.items.map(x=>[x.url,x]));
  for(const a of (data.articles||[])){if(a.url)m.set(a.url,{title:a.title||'',url:a.url,domain:a.domain||'',date:a.seendate||''})}
  s.items=[...m.values()].slice(-1000);localStorage.setItem(KEY,JSON.stringify(s));
  status.textContent=`${(data.articles||[]).length} 件を確認。応答 ${fmt(size)}${d.bytes>=l?'。設定上限に達したため以降停止':''}`;
  render();
 }catch(e){status.textContent='取得できませんでした: '+e.message}
 finally{btn.disabled=false}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();