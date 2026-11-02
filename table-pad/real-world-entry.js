(function(){
'use strict';
if(window.TablePadRealWorld)return;
const SOURCES={
 stock:{icon:'📈',title:'株価チッカー',desc:'ティッカーから時系列データを取得して表へ変換',url:'https://stooq.com/q/d/l/?s={ticker}&d1={date}&d2={date}&i=d',placeholder:'aapl.us',help:'Stooq CSVを使う入口。例: aapl.us / 7203.jp。取得元を「情報源」列に残します。',kind:'stock'},
 news:{icon:'🌍',title:'世界ニュース',desc:'世界のニュースをイベント表へ変換',url:'https://api.gdeltproject.org/api/v2/doc/doc?query={query}&mode=artlist&format=json&maxrecords=50&sort=datedesc',placeholder:'Japan economy',help:'GDELTの公開ニュース検索を入口にし、媒体・日時・見出し・URLを記録します。重要な数値は原典へ戻します。',kind:'news'},
 weather:{icon:'🌡',title:'気象庁',desc:'気象庁の公開JSONを表へ変換',url:'https://www.jma.go.jp/bosai/forecast/data/forecast/{code}.json',placeholder:'130000',help:'気象庁の地域コードを指定。例 130000=東京。',kind:'weather'},
 train:{icon:'🚆',title:'電車・交通',desc:'公式運行情報を共通交通データへ変換して表へ',url:'',placeholder:'鉄道会社名 / 路線 / 公式URL',help:'「電車版」は通勤時間中にiPhoneで作る開発作業という意味と、電車そのもののデータを扱う入口という二つの意味を持たせます。公式情報をコピーし、路線アダプタで共通交通データへ正規化します。',kind:'train'}
};
function esc(s){return String(s==null?'':s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&#92;','"':'&quot;'}[c]))}
function style(){if(document.getElementById('tpRweStyle'))return;const s=document.createElement('style');s.id='tpRweStyle';s.textContent='#tpRwe{position:fixed;inset:0;background:#000b;z-index:110;display:none;padding:18px;overflow:auto}#tpRwe.on{display:block}.rwe-card{max-width:900px;margin:20px auto;background:#181b24;border:1px solid #323a4d;border-radius:16px;padding:16px;color:#eef1f7}.rwe-head{display:flex;gap:8px;align-items:center}.rwe-head h2{flex:1;margin:0;font-size:20px}.rwe-tabs{display:flex;gap:7px;overflow:auto;margin:12px 0}.rwe-tabs button{white-space:nowrap}.rwe-tabs .on{background:#4A9EFF;border-color:#4A9EFF;color:#fff}.rwe-meta{color:#9aa3b8;font-size:13px;line-height:1.6}.rwe-input{width:100%;font:inherit;background:#222735;color:#eef1f7;border:1px solid #323a4d;border-radius:10px;padding:10px;margin:7px 0}.rwe-actions{display:flex;gap:7px;flex-wrap:wrap}.rwe-actions button{flex:1;min-width:180px}.rwe-note{background:#11151e;border:1px solid #303849;border-radius:10px;padding:10px;margin:9px 0;font-size:13px;line-height:1.6}.rwe-status{margin-top:10px;color:#F5C842;font-size:13px}.rwe-source{font-size:12px;overflow-wrap:anywhere;color:#9aa3b8}.rwe-table{max-height:260px;overflow:auto;margin-top:10px;border:1px solid #323a4d;border-radius:10px}.rwe-table table{border-collapse:collapse;min-width:100%}.rwe-table td,.rwe-table th{padding:6px 8px;border-right:1px solid #323a4d;border-bottom:1px solid #323a4d;white-space:nowrap;font-size:12px}.rwe-table th{background:#222735;color:#F5C842}';document.head.appendChild(s)}
function ensure(){style();if(document.getElementById('tpRwe'))return;const d=document.createElement('div');d.id='tpRwe';d.innerHTML='<div class="rwe-card"><div class="rwe-head"><h2>🌍 現実データを取得する</h2><button data-rwe-close>×</button></div><div class="rwe-meta">現実 → 情報源 → データ取得 → 表への変換 → 記録</div><div class="rwe-tabs" id="rweTabs"></div><div id="rweBody"></div><div id="rweStatus" class="rwe-status"></div></div>';document.body.appendChild(d);d.addEventListener('click',e=>{if(e.target.closest('[data-rwe-close]')||e.target===d)d.classList.remove('on');const b=e.target.closest('[data-rwe-kind]');if(b)render(b.dataset.rweKind);if(e.target.closest('#rweGet'))get();if(e.target.closest('#rweOpen'))openSource();if(e.target.closest('#rwePaste'))pasteImport()});Object.keys(SOURCES).forEach(k=>{const b=document.createElement('button');b.dataset.rweKind=k;b.textContent=SOURCES[k].icon+' '+SOURCES[k].title;document.getElementById('rweTabs').appendChild(b)});render('stock')}
function render(k){const x=SOURCES[k];document.querySelectorAll('[data-rwe-kind]').forEach(b=>b.classList.toggle('on',b.dataset.rweKind===k));let input;if(k==='news')input='<input id="rweQ" class="rwe-input" value="Japan economy" placeholder="検索語">';else if(k==='train')input='<input id="rweV" class="rwe-input" value="" placeholder="'+esc(x.placeholder)+'"><textarea id="rweRaw" class="rwe-input" rows="6" placeholder="公式運行情報をコピーして貼り付ける（文章 / CSV / JSON）"></textarea>';else input='<input id="rweV" class="rwe-input" value="" placeholder="'+esc(x.placeholder)+'">';const url=x.url?'<div class="rwe-source">取得先テンプレート：'+esc(x.url)+'</div>':'';document.getElementById('rweBody').innerHTML='<h3>'+x.icon+' '+esc(x.title)+'</h3><p class="rwe-meta">'+esc(x.desc)+'</p>'+input+url+'<div class="rwe-note">'+esc(x.help)+'</div><div class="rwe-actions"><button class="pri" id="rweGet">'+(k==='train'?'正規化して表にする':'取得して表にする')+'</button><button id="rweOpen">公式・取得先を開く</button><button id="rwePaste">コピーしたデータを表にする</button></div><div id="rwePreview"></div>';document.getElementById('rweStatus').textContent=''}
function dateStamp(d){return d.toISOString().slice(0,10).replace(/-/g,'')}
function today(){return dateStamp(new Date())}
function buildUrl(x,v){
 if(x.kind==='news')return x.url.replace('{query}',encodeURIComponent(v||'Japan'));
 if(x.kind==='stock'){
  let ticker=String(v||'aapl.us').trim().toLowerCase();
  if(/^\\d{4,5}$/.test(ticker))ticker += '.jp';
  const end=new Date();const start=new Date(end);start.setDate(start.getDate()-365);
  return 'https://stooq.com/q/d/l/?s='+encodeURIComponent(ticker)+'&d1='+dateStamp(start)+'&d2='+dateStamp(end)+'&i=d';
 }
 return x.url.replace('{ticker}',encodeURIComponent(v||'aapl.us')).replace('{date}',today()).replace('{code}',encodeURIComponent(v||'130000'))
}
async function fetchWithFallback(url,kind){
 try{
  const r=await fetch(url,{mode:'cors',cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status);
  return kind==='news'||kind==='weather'?await r.json():await r.text();
 }catch(primary){
  if(kind==='stock'){
   const proxy='https://api.allorigins.win/raw?url='+encodeURIComponent(url);
   const r=await fetch(proxy,{mode:'cors',cache:'no-store'});
   if(!r.ok)throw new Error('直接取得と中継取得に失敗（HTTP '+r.status+'）。取得先を開いてCSVをコピーしてください。');
   return await r.text();
  }
  throw primary;
 }
}
function openSource(){const k=current(),x=SOURCES[k];if(x.kind==='train'){window.open('https://www.mlit.go.jp/tetudo/','_blank','noopener');return}const v=document.getElementById(x.kind==='news'?'rweQ':'rweV').value.trim();window.open(buildUrl(x,v),'_blank','noopener')}
function current(){const b=document.querySelector('[data-rwe-kind].on');return b?b.dataset.rweKind:'stock'}
async function get(){const k=current(),x=SOURCES[k];if(k==='train'){const raw=document.getElementById('rweRaw').value.trim();if(!raw){setStatus('公式運行情報を貼り付けてください');return}if(!window.TablePadTransport){setStatus('交通アダプタがまだ読み込まれていません');return}const operator=document.getElementById('rweV').value.trim();const result=window.TablePadTransport.importOfficial(raw,{operator,sourceName:operator||'鉄道公式情報',sourceUrl:'',method:'official-copy'});showPreview(result.rows,'transport');window.__tpRweRows=result.rows;window.__tpRweTitle='電車・運行情報';setStatus(result.items.length+'件を共通交通データへ正規化しました。');return}const v=document.getElementById(x.kind==='news'?'rweQ':'rweV').value.trim();if(!v){setStatus('値を入れてください');return}const u=buildUrl(x,v);setStatus('取得中…');try{const payload=await fetchWithFallback(u,x.kind);let rows;if(x.kind==='stock')rows=stockRows(payload,u);else if(x.kind==='news')rows=newsRows(payload,u);else rows=weatherRows(payload,u);if(!rows.length)throw new Error('表にできるデータがありません。銘柄コード（例 6146 または 7203.jp）を確認してください。');showPreview(rows,u);window.__tpRweRows=rows;window.__tpRweTitle=x.title+' '+v;setStatus((rows.length-1)+'件を取得しました。プレビュー下の「表へ追加」で記録できます。')}catch(e){setStatus('自動取得に失敗しました。通信制限または中継サービスの一時障害の可能性があります。「公式・取得先を開く」からCSVを開き、内容をコピーして「コピーしたデータを表にする」を試してください。詳細: '+(e&&e.message||e))}}
function stockRows(t,u){
 const lines=String(t||'').trim().split(/\r?\n/).filter(Boolean);if(lines.length<2)return[];
 const rawHead=csv(lines[0]).map(x=>String(x).trim().toLowerCase());
 const ix={date:rawHead.indexOf('date'),open:rawHead.indexOf('open'),high:rawHead.indexOf('high'),low:rawHead.indexOf('low'),close:rawHead.indexOf('close'),volume:rawHead.indexOf('volume')};
 if(ix.date<0||ix.close<0)return[];
 const out=[['日付','始値','高値','安値','終値','出来高','情報源','取得日時']];
 for(const line of lines.slice(1)){
  const a=csv(line);if(!a[ix.date]||a[ix.close]==null)continue;
  out.push([a[ix.date],a[ix.open]??'',a[ix.high]??'',a[ix.low]??'',a[ix.close]??'',a[ix.volume]??'',u,new Date().toISOString()]);
 }
 return out;
}
function csv(s){const a=[];let q=false,v='';for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'&&s[i+1]==='"'){v+='"';i++;continue}if(c==='"'){q=!q;continue}if(c===','&&!q){a.push(v);v='';continue}v+=c}a.push(v);return a}
function newsRows(j,u){const a=j&&Array.isArray(j.articles)?j.articles:[];return [['日時','地域/言語','媒体','見出し','記事URL','情報源','取得日時'],...a.map(x=>[x.seendate||x.datetime||'',x.sourcecountry||x.language||'',x.domain||x.source||'',x.title||'',x.url||'',x.domain||u,new Date().toISOString()])].slice(0,51)}
function weatherRows(j,u){const out=[['発表日時','地域','予報日時','天気','降水確率','最高気温','最低気温','情報源','取得日時']];(j||[]).forEach(p=>(p.timeSeries||[]).forEach(ts=>{const t=ts.timeDefines||[];const a=(ts.areas||[]);a.forEach(z=>{const w=z.weathers||[],q=z.pops||[],hi=z.tempsMax||[],lo=z.tempsMin||[];t.forEach((d,i)=>out.push([p.reportDatetime||'',z.area&&z.area.name||'',d,w[i]||'',q[i]||'',hi[i]||'',lo[i]||'',u,new Date().toISOString()]))})}));return out.slice(0,201)}
function showPreview(rows,u){const p=document.getElementById('rwePreview');p.innerHTML='<div class="rwe-table"><table><thead><tr>'+rows[0].map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.slice(1,8).map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><div class="rwe-actions" style="margin-top:8px"><button class="pri" id="rweAdd">表へ追加</button></div>';document.getElementById('rweAdd').onclick=()=>{if(typeof window.newTable==='function'){window.newTable(window.__tpRweTitle||'取得データ',rows);setStatus('表を作成しました。情報源URLと取得日時も記録しています。')}else setStatus('表作成関数が利用できません。コピーして貼り付けてください。')}}
async function pasteImport(){const t=prompt('コピーしたCSV/TSVを貼り付けてください');if(!t)return;const lines=t.trim().split(/\r?\n/).map(x=>x.split(/\t|,/));if(!lines.length)return;if(typeof window.newTable==='function')window.newTable('外部データ（貼り付け）',lines);setStatus('コピーしたデータを表にしました。情報源URLは元データに残してください。')}
function setStatus(m){document.getElementById('rweStatus').textContent=m}
function open(){ensure();document.getElementById('tpRwe').classList.add('on')}
function inject(){if(document.getElementById('tpRweBtn'))return;const b=document.createElement('button');b.id='tpRweBtn';b.textContent='🌍 現実データ取得';b.title='株価・ニュース・気象・交通などを表へ';b.addEventListener('click',open);const h=document.querySelector('header');if(h)h.appendChild(b)}
window.TablePadRealWorld={open,SOURCES};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();
