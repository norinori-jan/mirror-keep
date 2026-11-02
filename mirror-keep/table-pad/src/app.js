(function(){
'use strict';
const KEY='tp_tables_v1', CUR='tp_cur';
let tables=[], cur=null, sel={r:0,c:0}, hist=[], vr=null;
const $=id=>document.getElementById(id);
function uid(){return 't'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function load(){try{tables=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){tables=[]} cur=localStorage.getItem(CUR);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(tables));localStorage.setItem(CUR,cur||'')}catch(e){}}
function T(){return tables.find(t=>t.id===cur)}
function mk(title,rows,cols){const d=[];for(let r=0;r<rows;r++){d.push(Array(cols).fill(''))}return{id:uid(),title:title||'新しい表',d,header:true,at:Date.now()}}
function toast(m){const t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',1800)}
function push(){const t=T();if(!t)return;hist.push(JSON.stringify(t));if(hist.length>40)hist.shift()}
function touch(){const t=T();if(t){t.at=Date.now()}save()}
function colName(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}

function renderTabs(){
  $('tabs').innerHTML=tables.map(t=>'<button data-id="'+t.id+'" class="'+(t.id===cur?'on':'')+'">'+esc(t.title||'無題')+'</button>').join('');
}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function render(){renderTable();applyView()}
function renderTable(){
  renderTabs();
  const t=T(); const tb=$('tb');
  const has=!!t;
  ['rUp','rDn','cLf','cRt','aR','aC','dR','dC','vc','hdr','cp','ps','un','dT','sT'].forEach(i=>$(i).disabled=!has);
  $('title').style.display=has?'':'none'; $('wrap').style.display=has?'':'none';
  if(!t){tb.innerHTML='';$('hint').textContent='「＋ 新しい表」で表を作れます';return}
  $('title').value=t.title;
  const RC=400;sel.r=Math.min(sel.r,t.d.length-1,RC-1);sel.c=Math.min(sel.c,t.d[0].length-1);
  let h='<tr><th class="corner"></th>';
  for(let c=0;c<t.d[0].length;c++)h+='<th class="ch'+(c===sel.c?' on':'')+'" data-ch="'+c+'">⋮⋮ '+colName(c)+'</th>';
  h+='</tr>';
  t.d.forEach((row,r)=>{if(r>=RC)return;
    h+='<tr class="'+(t.header&&r===0?'hd':'')+'"><th class="h'+(r===sel.r?' on':'')+'" data-rh="'+r+'">'+(r+1)+'</th>';
    row.forEach((v,c)=>{h+='<td data-r="'+r+'" data-c="'+c+'" class="'+(r===sel.r&&c===sel.c?'sel':(r===sel.r?'selr':(c===sel.c?'selc':'')))+'"><input value="'+esc(v)+'" data-r="'+r+'" data-c="'+c+'" enterkeyhint="next"></td>'});
    h+='</tr>'});
  tb.innerHTML=h;
  $('hdr').textContent=t.header?'1行目=見出し ✓':'1行目=見出し';
  $('hint').textContent='選んだ場所：'+(sel.r+1)+'行 '+colName(sel.c)+'列　／　左の番号・上のABCを押したまま動かすと移動できます'+(t.d.length>RC?'　※表は先頭'+RC+'行だけ表示（グラフ・ダッシュは全'+t.d.length+'行）':'');
}
// 編集
$('tb').addEventListener('focusin',e=>{const i=e.target;if(i.tagName!=='INPUT')return;const r=+i.dataset.r,c=+i.dataset.c;if(r!==sel.r||c!==sel.c){sel={r,c};markSel()}});
function markSel(){document.querySelectorAll('#tb td').forEach(td=>{const r=+td.dataset.r,c=+td.dataset.c;td.className=(r===sel.r&&c===sel.c)?'sel':(r===sel.r?'selr':(c===sel.c?'selc':''))});
  document.querySelectorAll('#tb th.h').forEach(h=>h.classList.toggle('on',+h.dataset.rh===sel.r));
  document.querySelectorAll('#tb th.ch').forEach(h=>h.classList.toggle('on',+h.dataset.ch===sel.c));
  $('hint').textContent='選んだ場所：'+(sel.r+1)+'行 '+colName(sel.c)+'列　／　左の番号・上のABCを押したまま動かすと移動できます'}
let editSnap=false;
$('tb').addEventListener('input',e=>{const i=e.target;if(i.tagName!=='INPUT')return;const t=T();if(!editSnap){push();editSnap=true;clearTimeout(editSnap.h);setTimeout(()=>editSnap=false,1500)}t.d[+i.dataset.r][+i.dataset.c]=i.value;touch()});
$('tb').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();const t=T();const r=+e.target.dataset.r+1,c=+e.target.dataset.c;if(r>=t.d.length){push();t.d.push(Array(t.d[0].length).fill(''));touch();sel={r,c};render()}else sel={r,c};focusSel()}});
function focusSel(){const i=document.querySelector('#tb input[data-r="'+sel.r+'"][data-c="'+sel.c+'"]');if(i){i.focus();i.scrollIntoView({block:'nearest',inline:'nearest'})}markSel()}
// 行列操作
function mv(arr,a,b){if(b<0||b>=arr.length||a===b)return false;const x=arr.splice(a,1)[0];arr.splice(b,0,x);return true}
function moveRow(a,b){const t=T();if(mv(t.d,a,b)){sel.r=b;touch();render();return true}return false}
function moveCol(a,b){const t=T();if(b<0||b>=t.d[0].length||a===b)return false;t.d.forEach(r=>mv(r,a,b));sel.c=b;touch();render();return true}
$('rUp').onclick=()=>{push();moveRow(sel.r,sel.r-1)||hist.pop()};$('rDn').onclick=()=>{push();moveRow(sel.r,sel.r+1)||hist.pop()};
$('cLf').onclick=()=>{push();moveCol(sel.c,sel.c-1)||hist.pop()};$('cRt').onclick=()=>{push();moveCol(sel.c,sel.c+1)||hist.pop()};
$('aR').onclick=()=>{const t=T();push();t.d.splice(sel.r+1,0,Array(t.d[0].length).fill(''));sel.r++;touch();render();focusSel()};
$('aC').onclick=()=>{const t=T();push();t.d.forEach(r=>r.splice(sel.c+1,0,''));sel.c++;touch();render();focusSel()};
$('dR').onclick=()=>{const t=T();if(t.d.length<=1){toast('最後の1行は消せません');return}if(!confirm((sel.r+1)+'行目を削除しますか？'))return;push();t.d.splice(sel.r,1);touch();render()};
$('dC').onclick=()=>{const t=T();if(t.d[0].length<=1){toast('最後の1列は消せません');return}if(!confirm(colName(sel.c)+'列を削除しますか？'))return;push();t.d.forEach(r=>r.splice(sel.c,1));touch();render()};
$('hdr').onclick=()=>{const t=T();push();t.header=!t.header;touch();render()};
$('un').onclick=()=>{if(!hist.length){toast('戻せる操作がありません');return}const t=T(),old=JSON.parse(hist.pop());Object.assign(t,old);touch();render();toast('元に戻しました')};
$('title').oninput=()=>{const t=T();t.title=$('title').value;touch();renderTabs()};
// 表の追加・切替・削除
$('bNew').onclick=()=>{const t=mk('新しい表',4,3);t.d[0]=['項目','内容','メモ'];tables.push(t);cur=t.id;hist=[];sel={r:1,c:0};save();render();focusSel()};
$('tabs').onclick=e=>{const b=e.target.closest('[data-id]');if(!b)return;cur=b.dataset.id;hist=[];sel={r:0,c:0};save();render()};
$('dT').onclick=()=>{const t=T();if(!confirm('「'+t.title+'」を削除しますか？（元に戻せません）'))return;tables=tables.filter(x=>x!==t);cur=tables[0]?tables[0].id:null;save();render()};
// ドラッグ移動（行番号／列ラベルを押したまま動かす）
let drag=null;
$('tb').addEventListener('pointerdown',e=>{
  const rh=e.target.closest('th[data-rh]'),ch=e.target.closest('th[data-ch]');
  if(rh){drag={k:'r',i:+rh.dataset.rh,to:+rh.dataset.rh,moved:false}}else if(ch){drag={k:'c',i:+ch.dataset.ch,to:+ch.dataset.ch,moved:false}}else return;
  if(drag.k==='r'){sel.r=drag.i}else sel.c=drag.i; markSel(); try{e.target.setPointerCapture(e.pointerId)}catch(x){}
});
$('tb').addEventListener('pointermove',e=>{
  if(!drag)return;drag.moved=true;
  const el=document.elementFromPoint(e.clientX,e.clientY);if(!el)return;
  document.querySelectorAll('.drop,.dropc').forEach(x=>x.classList.remove('drop','dropc'));
  if(drag.k==='r'){const td=el.closest('tr');const h=td&&td.querySelector('th[data-rh]');if(h){drag.to=+h.dataset.rh;td.querySelectorAll('td').forEach(x=>x.classList.add('drop'))}}
  else{const c=el.closest('[data-c],[data-ch]');if(c){drag.to=+(c.dataset.c!==undefined?c.dataset.c:c.dataset.ch);document.querySelectorAll('#tb [data-c="'+drag.to+'"]').forEach(x=>x.classList.add('dropc'))}}
});
function endDrag(){if(!drag)return;document.querySelectorAll('.drop,.dropc').forEach(x=>x.classList.remove('drop','dropc'));const d=drag;drag=null;if(d.moved&&d.to!==d.i){push();d.k==='r'?moveRow(d.i,d.to):moveCol(d.i,d.to);toast('移動しました')}}
$('tb').addEventListener('pointerup',endDrag);$('tb').addEventListener('pointercancel',()=>{drag=null});
// コピー（TSV＝Excel/Numbers/Sheetsにそのまま貼れる）／貼り付け
function tsv(t){return t.d.map(r=>r.map(v=>/[\t\n"]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v).join('\t')).join('\n')}
function md(t){const w=t.d[0].length;const rows=t.d.map(r=>'| '+r.map(v=>v.replace(/\|/g,'\\|').replace(/\n/g,' ')).join(' | ')+' |');rows.splice(1,0,'|'+Array(w).fill(' --- ').join('|')+'|');return rows.join('\n')}
$('cp').onclick=async()=>{const t=T();const s=tsv(t);try{await navigator.clipboard.writeText(s);toast('コピーしました（Excel等にそのまま貼れます）')}catch(e){openDlg('コピーしてください',s)}};
function parseTSV(s){const rows=[];let row=[],cur='',q=false;for(let i=0;i<s.length;i++){const ch=s[i];if(q){if(ch==='"'){if(s[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}else if(ch==='"'&&cur==='')q=true;else if(ch==='\t'){row.push(cur);cur=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&s[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur=''}else cur+=ch}
  if(cur!==''||row.length){row.push(cur);rows.push(row)}return rows}
function importText(s,asNew){
  let rows=/\t/.test(s)?parseTSV(s):s.split(/\r?\n/).filter(x=>x!=='').map(l=>/^\s*\|/.test(l)?l.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim()):l.split(','));
  rows=rows.filter(r=>!(r.length&&r.every(x=>/^:?-{3,}:?$/.test(x.trim()))));
  if(!rows.length)return false;const w=Math.max(...rows.map(r=>r.length));rows=rows.map(r=>{r=r.slice();while(r.length<w)r.push('');return r});
  if(asNew){const t=mk('貼り付けた表',1,1);t.d=rows;tables.push(t);cur=t.id;hist=[];sel={r:0,c:0}}else{const t=T();push();for(let i=0;i<rows.length;i++){const rr=sel.r+i;while(t.d.length<=rr)t.d.push(Array(t.d[0].length).fill(''));for(let j=0;j<w;j++){const cc=sel.c+j;if(cc>=t.d[0].length)t.d.forEach(x=>x.push(''));t.d[rr][cc]=rows[i][j]}}}
  save();render();return true}
function openDlg(h,v,ok){$('dh').textContent=h;$('dta').value=v||'';$('dlg').returnValue='';$('dlg').showModal();$('dok').onclick=()=>{$('dlg').close();ok&&ok($('dta').value)};$('dx').onclick=()=>$('dlg').close()}
$('ps').onclick=async()=>{let s='';try{s=await navigator.clipboard.readText()}catch(e){}
  if(s&&s.trim()){const t=T();if(importText(s,false))toast('貼り付けました（選んだ場所から）');return}
  openDlg('表のデータを貼り付けてください（Excel・CSV・Markdownの表）','',v=>{v&&importText(v,false)})};
// 入出力（全表のバックアップ）
$('bSto').onclick=async()=>{
 const KB=n=>n<1024?n+'B':n<1048576?(n/1024).toFixed(n<10240?1:0)+'KB':(n/1048576).toFixed(2)+'MB';
 const L=['table-pad 保存量 '+new Date().toLocaleString('ja-JP')+' '+location.origin];
 let tot=0;const keys=[];
 try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i),v=localStorage.getItem(k)||'';const sz=(k.length+v.length)*2;tot+=sz;keys.push([k,sz])}}catch(e){L.push('localStorage を読めません')}
 keys.sort((a,b)=>b[1]-a[1]);
 L.push('localStorage 合計 '+KB(tot)+'（目安の上限5MBの '+Math.round(tot/5242880*100)+'%） キー数='+keys.length);
 keys.slice(0,15).forEach(x=>L.push('  '+x[0]+' '+KB(x[1])));
 L.push('表の数 '+tables.length);
 tables.forEach((t,i)=>{let sz=0;try{sz=JSON.stringify(t).length*2}catch(e){}L.push('  表'+(i+1)+' '+KB(sz)+' 行='+((t.d&&t.d.length)||0)+' 列='+((t.d&&t.d[0]&&t.d[0].length)||0))});
 try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();L.push('端末全体 使用 '+KB(e.usage||0)+' / 見積上限 '+KB(e.quota||0))}
  if(navigator.storage&&navigator.storage.persisted){L.push('消えにくい設定 persisted='+await navigator.storage.persisted())}}catch(e){}
 try{const dbs=indexedDB.databases?await indexedDB.databases():[];L.push('IndexedDB '+dbs.length+'個'+(dbs.length?' '+dbs.map(d=>d.name).join(', '):''))}catch(e){}
 $('stoOut').textContent=L.join('\n');$('stoMsg').textContent='';$('sto').showModal()};
$('stoX').onclick=()=>$('sto').close();
$('stoCp').onclick=async()=>{try{await navigator.clipboard.writeText($('stoOut').textContent);$('stoMsg').textContent='コピーしました'}catch(e){$('stoMsg').textContent='コピーできません。文字を長押しで選んでコピーしてください'}};
$('bIO').onclick=()=>{openDlg('全ての表（JSON）。バックアップはここからコピー、復元はここに貼って OK',JSON.stringify(tables),v=>{try{const a=JSON.parse(v);if(!Array.isArray(a))throw 0;const by=new Map(tables.map(t=>[t.id,t]));a.forEach(t=>{if(t&&t.id&&Array.isArray(t.d))by.set(t.id,t)});tables=[...by.values()];if(!cur&&tables[0])cur=tables[0].id;save();render();toast('読み込みました')}catch(e){toast('読み込めませんでした')}})};
// 声で入れる（文字にしてセルへ。音声は残さない）
$('vc').onclick=()=>{
  if(vr){try{vr.onend=null;vr.stop()}catch(e){}vr=null;$('vc').textContent='🎙 声で入れる';return}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){focusSel();toast('キーボードのマイク🎙で話すと文字になります');return}
  const r=new SR();r.lang='ja-JP';r.continuous=true;r.interimResults=false;
  r.onresult=ev=>{for(let i=ev.resultIndex;i<ev.results.length;i++){if(!ev.results[i].isFinal)continue;const s=ev.results[i][0].transcript.trim();if(!s)continue;const t=T();push();t.d[sel.r][sel.c]=s;touch();
      // 次のセルへ（右端なら次の行の先頭）
      let nr=sel.r,nc=sel.c+1;if(nc>=t.d[0].length){nc=0;nr++;if(nr>=t.d.length)t.d.push(Array(t.d[0].length).fill(''))}sel={r:nr,c:nc};render();document.querySelector('#tb td.sel')?.scrollIntoView({block:'nearest',inline:'nearest'})}};
  r.onerror=ev=>{if(ev.error==='not-allowed'||ev.error==='service-not-allowed'){vr=null;$('vc').textContent='🎙 声で入れる';toast('マイクが許可されていません。キーボードの🎙をお使いください')}};
  r.onend=()=>{if(vr===r){try{r.start()}catch(e){vr=null;$('vc').textContent='🎙 声で入れる'}}};
  vr=r;try{r.start();$('vc').textContent='⏹ とめる（話すと次のセルへ進みます）'}catch(e){vr=null}
};

// ===================== ビュー切替 =====================
let VIEW='t';
function applyView(){
  const t=T();const has=!!t;
  document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.v===VIEW));
  const tv=VIEW==='t';
  $('wrap').style.display=(tv&&has)?'':'none';$('hint').style.display=tv?'':'none';$('bar').style.display=tv?'':'none';
  $('cv').hidden=!(VIEW==='c'&&has);$('fv').hidden=!(VIEW==='f'&&has);$('dv').hidden=!(VIEW==='d'&&has);$('lv').hidden=!(VIEW==='l'&&has);$('sv').hidden=!(VIEW==='s'&&has);$('xv').hidden=!(VIEW==='x'&&has);$('zv').hidden=!(VIEW==='z'&&has);$('rv').hidden=VIEW!=='r';
  if(has&&VIEW==='c')renderChart();if(has&&VIEW==='f')renderFlow();if(has&&VIEW==='d')renderDash();if(has&&VIEW==='l')renderList();if(has&&VIEW==='s')renderStock();if(has&&VIEW==='x')renderCalc();if(has&&VIEW==='z')renderSets();
}
$('views').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;VIEW=b.dataset.v;applyView();if(VIEW==='r')renderResources($('rSearch').value);window.scrollTo(0,0)};

// ===================== 情報源リンク集・ニュース検索 =====================
const RESOURCE_LINKS = [
 {cat:'表の基本',name:'MDN：HTML の表の基本',desc:'行・列・見出し・セル結合など、表の基礎を学ぶ。',url:'https://developer.mozilla.org/ja/docs/Learn_web_development/Core/Structuring_content/HTML_table_basics'},
 {cat:'公式リファレンス',name:'MDN：HTML table 要素',desc:'table、thead、tbody、th、td などの公式リファレンス。',url:'https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Elements/table'},
 {cat:'アクセシビリティ',name:'MDN：表のアクセシビリティ',desc:'見出し、caption、行・列の関連付けを分かりやすくする。',url:'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Table_accessibility'},
 {cat:'アクセシビリティ',name:'W3C WAI：Tables Tutorial',desc:'誰にとっても理解しやすい表を作るためのチュートリアル。',url:'https://www.w3.org/WAI/tutorials/tables/'},
 {cat:'見やすい表',name:'Mass.gov：HTML テーブル作成ガイド',desc:'ウェブアプリの表、並び替え、データの読みやすさを考える。',url:'https://www.mass.gov/info-details/creating-html-tables-for-websites-and-applications'},
 {cat:'スタイル・デザイン',name:'MDN：CSS テーブルスタイル',desc:'罫線、余白、見出しなど、表の見た目を整える。',url:'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/HTML_table_basics#styling_our_table'},
 {cat:'CSV・データ取込',name:'RFC 4180：CSV 形式の一般的な仕様',desc:'CSV のフィールド、引用符、改行の扱いを確認する。',url:'https://www.rfc-editor.org/rfc/rfc4180'},
 {cat:'データ整理',name:'Data.gov：公開データ',desc:'表に取り込んで整理・分析する公開データを探す。',url:'https://data.gov/'},
 {cat:'表計算',name:'Microsoft Support：Excel ヘルプ',desc:'表の整形、並び替え、フィルターなどの操作を調べる。',url:'https://support.microsoft.com/excel'},
 {cat:'表計算',name:'Google ドキュメント エディタ ヘルプ',desc:'Google スプレッドシートでの表・データ整理のヘルプ。',url:'https://support.google.com/docs/?hl=ja'},
 {cat:'データ可視化',name:'Datawrapper Academy',desc:'表やグラフを読みやすく伝えるための実践ガイド。',url:'https://academy.datawrapper.de/'},
 {cat:'ウェブ標準',name:'WHATWG HTML Living Standard',desc:'HTML の表要素について標準仕様を確認する。',url:'https://html.spec.whatwg.org/multipage/tables.html'},
 {cat:'世界ニュース',name:'The New York Times：トップニュース',desc:'米国・世界・政治・経済のニュース。記事全文の閲覧は購読条件によります。',url:'https://www.nytimes.com/'},
 {cat:'世界ニュース',name:'The New York Times：World',desc:'世界各地の国際ニュース。',url:'https://www.nytimes.com/section/world'},
 {cat:'世界ニュース',name:'The Guardian：World',desc:'国際ニュース。個人利用向けRSSも提供。',url:'https://www.theguardian.com/world'},
 {cat:'世界ニュース',name:'The Guardian：RSS feeds（公式案内）',desc:'セクションや記事一覧のRSS配信についての公式説明。',url:'https://www.theguardian.com/help/feeds'},
 {cat:'世界ニュース',name:'Reuters：World',desc:'世界の速報・国際情勢。',url:'https://www.reuters.com/world/'},
 {cat:'世界ニュース',name:'Associated Press（AP）',desc:'国際・米国ニュースと報道写真。',url:'https://apnews.com/'},
 {cat:'世界ニュース',name:'BBC News：World',desc:'国際ニュースと解説。',url:'https://www.bbc.com/news/world'},
 {cat:'世界ニュース',name:'Al Jazeera：News',desc:'中東を含む世界各地のニュース。',url:'https://www.aljazeera.com/news/'},
 {cat:'世界ニュース',name:'DW：News',desc:'ドイツ発の国際ニュース。',url:'https://www.dw.com/en/top-stories/s-9097'},
 {cat:'日本語ニュース',name:'NHK WORLD-JAPAN',desc:'日本発の国際ニュース。英語など多言語で提供。',url:'https://www3.nhk.or.jp/nhkworld/'},
 {cat:'世界ニュース',name:'Google News：世界ニュース',desc:'複数媒体のニュースを横断して探す。',url:'https://news.google.com/'},
 {cat:'株式・金融ニュース',name:'CNBC：Markets',desc:'米国株・市場・企業・経済のニュース。',url:'https://www.cnbc.com/markets/'},
 {cat:'株式・金融ニュース',name:'Yahoo Finance',desc:'株式・企業ニュース、決算、相場情報。',url:'https://finance.yahoo.com/'},
 {cat:'株式・金融ニュース',name:'MarketWatch',desc:'市場・投資・経済ニュース。',url:'https://www.marketwatch.com/'},
 {cat:'株式・金融ニュース',name:'Financial Times',desc:'世界経済・企業・金融市場。記事閲覧に購読が必要な場合があります。',url:'https://www.ft.com/'},
 {cat:'株式・金融ニュース',name:'Bloomberg Markets',desc:'世界市場・金融・企業ニュース。',url:'https://www.bloomberg.com/markets'},
 {cat:'株式・金融ニュース',name:'Investing.com',desc:'世界市場、株式、為替、経済カレンダー。',url:'https://www.investing.com/'},
 {cat:'企業の一次資料',name:'SEC EDGAR / Investor.gov',desc:'米国上場企業の年次・四半期報告など公式提出書類。',url:'https://www.investor.gov/introduction-investing/getting-started/researching-investments/using-edgar-research-investments'},
 {cat:'API・自動収集',name:'The Guardian Open Platform API',desc:'Guardianの記事データをプログラムから検索するAPI。APIキーが必要。',url:'https://open-platform.theguardian.com/documentation/'},
 {cat:'API・自動収集',name:'NewsAPI Documentation',desc:'複数ニュース媒体の記事検索API。APIキーが必要。',url:'https://newsapi.org/docs'},
 {cat:'API・自動収集',name:'Alpha Vantage：News & Sentiment API',desc:'銘柄・市場テーマに関する金融ニュースとセンチメント。APIキーが必要で機能に利用条件あり。',url:'https://www.alphavantage.co/documentation/#news-sentiment'},
 {cat:'API・自動収集',name:'The New York Times Developer Portal',desc:'NYTの記事検索などの開発者向けAPI情報。利用条件とAPIキーを要確認。',url:'https://developer.nytimes.com/'},
 {cat:'API・自動収集',name:'Google Translate',desc:'記事URLの翻訳や、ブラウザーの翻訳機能を補助する。翻訳品質・利用可否はページにより異なる。',url:'https://translate.google.com/'},
 {cat:'API・自動収集',name:'Google News RSS検索',desc:'検索語を含むニュースのRSSフィード。提供内容・利用条件はGoogle側の仕様に依存。',url:'https://news.google.com/rss'},
];
let RESOURCE_VISIBLE = RESOURCE_LINKS.map((_,i)=>i);
const RESOURCE_SELECTED = new Set();
function renderResources(query=''){
 const q=String(query).trim().toLocaleLowerCase();
 RESOURCE_VISIBLE=RESOURCE_LINKS.map((x,i)=>({x,i})).filter(o=>(o.x.cat+' '+o.x.name+' '+o.x.desc).toLocaleLowerCase().includes(q)).map(o=>o.i);
 const chosen=RESOURCE_SELECTED;
 $('rCards').innerHTML=RESOURCE_VISIBLE.map(i=>{const x=RESOURCE_LINKS[i];const translated='https://translate.google.com/translate?sl=auto&tl=ja&u='+encodeURIComponent(x.url);return '<article class="resource-card"><label class="resource-pick"><input type="checkbox" data-resource-pick value="'+i+'" '+(chosen.has(i)?'checked':'')+'><span>コピー対象に選ぶ</span></label><span class="resource-tag">'+esc(x.cat)+'</span><h3>'+esc(x.name)+'</h3><p>'+esc(x.desc)+'</p><div style="display:flex;flex-wrap:wrap;gap:12px"><a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">原文・公式サイト ↗</a><a href="'+esc(translated)+'" target="_blank" rel="noopener noreferrer">日本語翻訳で開く ↗</a></div></article>';}).join('')||'<p style="padding:12px;color:var(--dim)">該当する情報源がありません。</p>';
 $('rSummary').textContent='表示 '+RESOURCE_VISIBLE.length+' / 全 '+RESOURCE_LINKS.length+' 件。選択中 '+RESOURCE_SELECTED.size+' 件。原文リンクと日本語翻訳リンクを表示します。記事本文の取得・翻訳・要約の自動化は、各社APIと利用条件を別途確認する必要があります。';
}
async function copyResourceText(items){
 if(!items.length){$('rSummary').textContent='先にカードの「コピー対象に選ぶ」にチェックしてください。';return;}
 const text=items.map(x=>x.name+'\n'+x.url).join('\n\n');
 try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);}else{throw new Error('clipboard unavailable');}}
 catch(e){const box=$('rCopyFallback');box.value=text;box.style.position='fixed';box.style.left='12px';box.style.top='12px';box.style.width='90%';box.style.height='140px';box.style.zIndex='99999';box.focus();box.select();let ok=false;try{ok=document.execCommand('copy');}catch(_){}if(!ok){$('rSummary').textContent='自動コピーできませんでした。画面上のテキスト欄を長押しして「コピー」してください。';return;}box.style.left='-9999px';}
 $('rSummary').textContent=items.length+' 件のリンクをコピーしました。メモ・辞書アプリなどに移動して貼り付けてください。';
}
function runNewsSearch(provider){
 const q=String($('newsQuery').value||'').trim();
 if(!q){$('newsQuery').focus();$('rSummary').textContent='先に検索キーワードを入力してください。';return;}
 const u='https://news.google.com/search?q='+encodeURIComponent(q);
 window.open(u,'_blank','noopener,noreferrer');
}
$('rSearch').addEventListener('input',e=>renderResources(e.target.value));
$('rSelectVisible').addEventListener('click',()=>{RESOURCE_VISIBLE.forEach(i=>RESOURCE_SELECTED.add(i));renderResources($('rSearch').value);});
$('rClear').addEventListener('click',()=>{RESOURCE_SELECTED.clear();renderResources($('rSearch').value);});
$('rCopySelected').addEventListener('click',()=>{copyResourceText(Array.from(RESOURCE_SELECTED).sort((a,b)=>a-b).map(i=>RESOURCE_LINKS[i]));});
$('rCopyVisible').addEventListener('click',()=>copyResourceText(RESOURCE_VISIBLE.map(i=>RESOURCE_LINKS[i])));
$('rCards').addEventListener('change',e=>{if(e.target.matches('[data-resource-pick]')){const i=Number(e.target.value);if(e.target.checked)RESOURCE_SELECTED.add(i);else RESOURCE_SELECTED.delete(i);$('rSummary').textContent='表示 '+RESOURCE_VISIBLE.length+' / 全 '+RESOURCE_LINKS.length+' 件。選択中 '+RESOURCE_SELECTED.size+' 件。選択したリンクはまとめてコピーできます。';}});
document.querySelectorAll('[data-news-search]').forEach(b=>b.addEventListener('click',()=>runNewsSearch(b.dataset.newsSearch)));
$('newsQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runNewsSearch('google');}});

// ===================== データの読み取り =====================
const PAL=['#3987e5','#d95926','#199e70','#c98500','#d55181','#008300','#9085e9'],OTHER='#8a8f9c',INK='#eef1f7',DIM='#9aa3b8',GRID='#2c3345',SURF='#181b24';
function num(s){let x=String(s==null?'':s).trim();let neg=false;if(/^[△▲]/.test(x)){neg=true;x=x.slice(1)}else if(/^\(.*\)$/.test(x)){neg=true;x=x.slice(1,-1)}
  x=x.replace(/[,，\s¥￥円%％$]/g,'');if(x===''||!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(x))return null;const f=parseFloat(x);return neg?-f:f}
const ERA={'令和':2018,'R':2018,'平成':1988,'H':1988,'昭和':1925,'S':1925};
function dparse(s){s=String(s==null?'':s).trim();{const e=s.match(/^(令和|平成|昭和|[RHS])\s*(元|\d+)[年.\/-](\d{1,2})[月.\/-](\d{1,2})日?/);if(e)return{y:ERA[e[1]]+(e[2]==='元'?1:+e[2]),m:+e[3],d:+e[4]}}let m=s.match(/^(\d{4})[-\/年.](\d{1,2})(?:[-\/月.](\d{1,2}))?/);if(m)return{y:+m[1],m:+m[2],d:+(m[3]||1)};m=s.match(/^(\d{1,2})[\/月](\d{1,2})日?$/);if(m)return{y:0,m:+m[1],d:+m[2]};return null}
function ctype(body,i){const v=body.map(r=>String(r[i]==null?'':r[i]).trim()).filter(x=>x!=='');if(!v.length)return'text';
  if(v.filter(x=>dparse(x)&&num(x)===null).length/v.length>=0.8)return'date';
  if(v.filter(x=>num(x)!==null).length/v.length>=0.8)return'num';return'text'}
function info(t){const h=t.header,w=t.d[0].length;const body=t.d.slice(h?1:0);
  const names=t.d[0].map((v,i)=>(h&&String(v).trim())?String(v).trim():colName(i)+'列');
  const types=names.map((_,i)=>ctype(body,i));
  const uniq=names.map((_,i)=>[...new Set(body.map(r=>String(r[i]==null?'':r[i]).trim()).filter(x=>x!==''))]);
  return{names,body,types,uniq,w}}
function fmt(n){if(n==null||isNaN(n))return'';const a=Math.abs(n);if(a>=1e8)return+(n/1e8).toPrecision(3)+'億';if(a>=1e4)return+(n/1e4).toPrecision(3)+'万';
  return a>=100?Math.round(n).toLocaleString('ja-JP'):(+n.toPrecision(3)).toLocaleString('ja-JP')}
function aggName(a){return{sum:'合計',avg:'平均',count:'件数',max:'最大',min:'最小'}[a]}

// ===================== おすすめ（何で見せると一番伝わるか） =====================
function recommend(t){
  const I=info(t),dateC=I.types.indexOf('date'),nums=I.types.map((x,i)=>x==='num'?i:-1).filter(i=>i>=0);
  const texts=I.types.map((x,i)=>x==='text'&&I.uniq[i].length>=2&&I.uniq[i].length<=I.body.length?i:-1).filter(i=>i>=0);
  const v={cat:-1,val:-1,agg:'sum',type:'bar',ser:-1,sort:'val',gran:'m',sl:{}};
  if(dateC>=0&&nums.length){v.cat=dateC;v.val=nums[0];v.type='line';v.sort='orig';
    const ds=I.body.map(r=>dparse(r[dateC])).filter(Boolean);const span=ds.length?(Math.max(...ds.map(g=>g.y*12+g.m))-Math.min(...ds.map(g=>g.y*12+g.m))):0;v.gran=span>=24?'y':(span>=2?'m':'d');
    if(span>=24)v.gran='m'}
  else if(texts.length&&(nums.length||true)){v.cat=texts[0];v.val=nums.length?nums[0]:-1;v.agg=nums.length?'sum':'count';
    const n=I.uniq[v.cat].length,len=Math.max(0,...I.uniq[v.cat].map(x=>x.length));v.type=(n>8||len>5)?'hbar':'bar'}
  else if(nums.length>=2){v.type='scatter';v.cat=nums[0];v.val=nums[1]}
  else if(nums.length===1){v.cat=0;v.val=nums[0];v.type='bar';v.sort='orig'}
  else{v.cat=0;v.agg='count'}
  return v}
function whyText(t,v,R){
  const I=info(t),cn=v.cat>=0?I.names[v.cat]:'',vn=v.val>=0?I.names[v.val]:'件数';
  const NW={stack:['積み上げ棒グラフ','合計の大小と、その<b>内訳</b>を同時に見る</b>ときに向いています。'+(v.ser<0?'<br>⚠ 「色分け」を選ぶと内訳が積み上がります。':'<br>ℹ 一番下以外の内訳は、大きさの比較が少し難しくなります。')],
    stack100:['100%積み上げ','合計ではなく<b>構成比（割合）</b>が、分類ごとにどう違うかを比べるのに向いています。<br>ℹ 全体の大きさは見えません。大きさも知りたいときは「積み上げ」を使います。'],
    area:['面グラフ','<b>時間の流れの中での量のかたまり</b>を見るのに向いています。'+(I.types[v.cat]!=='date'?'<br>⚠ 分類が日付ではないので、折れ線や棒のほうが読みやすいかもしれません。':'')],
    pareto:['パレート図','大きい順の棒と、<b>累積の割合（折れ線）</b>で「少数の項目が大半を占めているか」を見ます。<br>ℹ 点線は80%。「上位◯項目で8割」が分かると、先に手を付ける所が決まります。'],
    wf:['増減（ウォーターフォール）','項目ごとの<b>プラス・マイナス</b>を順に積み重ね、最後の合計になるまでを見ます。損益・差額・増減の内訳に向いています。'],
    heat:['ヒートマップ','2つの分類（行と列）が<b>交差するところの大きさ</b>を色の濃さで見ます。'+(v.ser<0?'<br>⚠ 「色分け（2つ目の分類）」を選んでください。':'')],
    hist:['度数分布（ヒストグラム）','「'+cn+'」の値が<b>どのあたりに多く集まっているか</b>（ばらつき・偏り・外れ値）を見ます。']};
  if(NW[v.type]){const x=NW[v.type];return '📌 <b>'+x[0]+'</b>：'+(v.type==='hist'?'':'「'+cn+'」ごとの「'+vn+'」'+(v.agg==='count'?'':'の'+aggName(v.agg))+'。')+'<br>'+x[1]}
  if(v.type==='scatter')return '📌 <b>散布図</b>：「'+cn+'」と「'+vn+'」の<b>関係（比例しているか・外れ値はないか）</b>を見るなら、点の散らばりが一番です。';
  const head=R&&R.cats.length?'':'';
  const base={bar:'<b>棒グラフ</b>',hbar:'<b>横棒グラフ</b>',line:'<b>折れ線グラフ</b>',pie:'<b>円グラフ</b>'}[v.type];
  let m='📌 いまは '+base+'：「'+cn+'」ごとの「'+vn+'」'+(v.agg==='count'?'':'の'+aggName(v.agg))+'を見ています。';
  const nC=R?R.cats.length:0;
  if(v.type==='line'&&I.types[v.cat]!=='date')m+='<br>⚠ 分類が日付ではないので、線でつなぐと「順番」の意味が出ません。<b>棒グラフ</b>がおすすめです。';
  else if(v.type==='pie'&&nC>6)m+='<br>⚠ 円は6つを超えると読み取れません。<b>横棒グラフ</b>がおすすめです。';
  else if(v.type==='pie')m+='<br>ℹ 円は「全体の中の割合」を見るときだけ有効です。大小の比較は<b>棒</b>のほうが正確です。';
  else if(v.type==='bar'&&I.types[v.cat]==='date')m+='<br>ℹ 日付の分類なので、<b>折れ線</b>にすると「増えているか／減っているか」が分かりやすくなります。';
  else if(v.type==='bar'&&nC>8)m+='<br>ℹ 項目が'+nC+'個と多いので、<b>横棒</b>にすると名前が読みやすくなります。';
  else if(v.type==='line')m+='<br>✔ 時間の流れを見るなら折れ線が最適です。';
  else m+='<br>✔ 項目どうしの大小を比べるなら、棒が最適です。';
  return m}

// ===================== 集計 =====================
function bk(I,r,col,gran){const raw=String(r[col]==null?'':r[col]).trim();if(I.types[col]==='date'){const g=dparse(raw);if(!g)return'(不明)';const p2=n=>String(n).padStart(2,'0');return gran==='y'?String(g.y):(gran==='m'?g.y+'-'+p2(g.m):g.y+'-'+p2(g.m)+'-'+p2(g.d))}return raw||'(空)'}
function compute(t,v){
  const I=info(t);
  let rows=I.body.filter(r=>Object.keys(v.sl).every(k=>{const a=v.sl[k];return !a||!a.length||a.includes(String(r[k]==null?'':r[k]).trim())}));
  if(v.xf&&v.xf.length)rows=rows.filter(r=>v.xf.every(f=>f.vals.includes(bk(I,r,f.col,f.gran))));
  const out={n:rows.length,all:I.body.length};
  if(v.type==='hist'){const xs=rows.map(r=>num(r[v.cat])).filter(z=>z!=null).sort((a,b)=>a-b);out.n=xs.length;if(xs.length<2){out.n=0;return out}
    const mn=xs[0],mx=xs[xs.length-1],mean=xs.reduce((p,c)=>p+c,0)/xs.length,med=xs.length%2?xs[(xs.length-1)/2]:(xs[xs.length/2-1]+xs[xs.length/2])/2;
    const sc=niceScale(mn,mx,Math.max(5,Math.min(20,Math.ceil(Math.sqrt(xs.length))))),nb=Math.max(1,sc.ticks.length-1),st=nb?(sc.hi-sc.lo)/nb:1;
    out.bins=Array.from({length:nb},(_,i)=>({lo:sc.lo+i*st,hi:sc.lo+(i+1)*st,n:0}));xs.forEach(x=>{out.bins[Math.min(nb-1,Math.max(0,Math.floor((x-sc.lo)/st)))].n++});
    out.stats={min:mn,max:mx,mean,med};return out}
  if(v.type==='scatter'){out.pts=rows.map(r=>({x:num(r[v.cat]),y:num(r[v.val]),s:v.ser>=0?String(r[v.ser]).trim()||'(空)':'',l:String(r[0]||'')})).filter(p=>p.x!=null&&p.y!=null);
    out.series=[...new Set(out.pts.map(p=>p.s))];return out}
  const isDate=I.types[v.cat]==='date';
  const keyOf=r=>{const raw=String(r[v.cat]==null?'':r[v.cat]).trim();if(isDate){const g=dparse(raw);if(!g)return'(不明)';const p2=n=>String(n).padStart(2,'0');return v.gran==='y'?String(g.y):(v.gran==='m'?g.y+'-'+p2(g.m):g.y+'-'+p2(g.m)+'-'+p2(g.d))}return raw||'(空)'};
  const G=new Map(),order=[];
  rows.forEach(r=>{const k=keyOf(r),sn=v.ser>=0?(String(r[v.ser]).trim()||'(空)'):'';if(!G.has(k)){G.set(k,new Map());order.push(k)}const m=G.get(k);if(!m.has(sn))m.set(sn,[]);
    m.get(sn).push(v.agg==='count'||v.val<0?1:num(r[v.val]))});
  const ag=a=>{if(v.agg==='count'||v.val<0)return a.length;const x=a.filter(z=>z!=null);if(!x.length)return null;
    return v.agg==='sum'?x.reduce((p,c)=>p+c,0):v.agg==='avg'?x.reduce((p,c)=>p+c,0)/x.length:v.agg==='max'?Math.max(...x):Math.min(...x)};
  let series=[...new Set(rows.map(r=>v.ser>=0?(String(r[v.ser]).trim()||'(空)'):''))];
  const val=(c,sn)=>{const m=G.get(c);return m&&m.has(sn)?ag(m.get(sn)):null};
  const tot=c=>series.reduce((p,sn)=>p+(val(c,sn)||0),0);
  let cats=order.slice();
  const ps=v.type==='pareto';
  if(!ps&&(isDate||v.sort==='name'))cats.sort(isDate?(a,b)=>a<b?-1:a>b?1:0:(a,b)=>a.localeCompare(b,'ja'));
  else if(ps||v.sort==='val')cats.sort((a,b)=>tot(b)-tot(a));
  if(series.length>6){const st=series.map(sn=>[sn,cats.reduce((p,c)=>p+(val(c,sn)||0),0)]).sort((a,b)=>b[1]-a[1]);series=st.slice(0,6).map(x=>x[0]);out.cut=st.length-6}
  out.capped=cats.length>40;if(out.capped)cats=cats.slice(0,40);
  out.cats=cats;out.series=series;out.val=val;out.tot=tot;return out}

// ===================== 描画 =====================
function niceScale(min,max,n){if(min===max){max=min+1}const span=max-min,step0=span/n,p=Math.pow(10,Math.floor(Math.log10(step0))),f=step0/p,st=(f<=1?1:f<=2?2:f<=5?5:10)*p;
  const lo=Math.floor(min/st)*st,hi=Math.ceil(max/st)*st,ticks=[];for(let x=lo;x<=hi+st/2;x+=st)ticks.push(+x.toPrecision(12));return{lo,hi,ticks}}
const tr=(s,n)=>String(s).length>n?String(s).slice(0,n-1)+'…':String(s);
const X=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
let LASTSVG=null;
function legendHtml(items){return '<div class="legend">'+items.map((it,i)=>'<span><i style="background:'+it.c+'"></i>'+X(it.n)+'</span>').join('')+'</div>'}
function drawChart(t,v,R,box){
  const W=Math.max(260,(box||$('chartBox')).clientWidth-16);let svg='',H=300,legend='';
  const vn=v.val>=0&&v.agg!=='count'?info(t).names[v.val]:'件数';
  const ser=R.series||[];const col=i=>i<6?PAL[i]:OTHER;
  const tip=(a,b,k)=>' data-tip="'+X(a+'　'+b)+'" '+(k==null?'':'data-k="'+X(k)+'" ');
  if(!R.n||(R.cats&&!R.cats.length)||(R.pts&&!R.pts.length)){return '<div style="padding:30px;text-align:center;color:'+DIM+'">表示できるデータがありません。<br>表に数字を入れるか、絞り込みを解除してください。</div>'}
  if(v.type==='scatter'){
    const xs=R.pts.map(p=>p.x),ys=R.pts.map(p=>p.y),sx=niceScale(Math.min(...xs),Math.max(...xs),4),sy=niceScale(Math.min(...ys),Math.max(...ys),4);
    const L=48,Rr=12,Tp=12,B=36;H=300;const px=x=>L+(x-sx.lo)/(sx.hi-sx.lo)*(W-L-Rr),py=y=>Tp+(1-(y-sy.lo)/(sy.hi-sy.lo))*(H-Tp-B);
    svg+=sy.ticks.map(y=>'<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+py(y)+'" y2="'+py(y)+'" stroke="'+GRID+'"/><text x="'+(L-6)+'" y="'+(py(y)+4)+'" fill="'+DIM+'" font-size="11" text-anchor="end">'+fmt(y)+'</text>').join('');
    svg+=sx.ticks.map(x=>'<text x="'+px(x)+'" y="'+(H-B+16)+'" fill="'+DIM+'" font-size="11" text-anchor="middle">'+fmt(x)+'</text>').join('');
    svg+='<text x="'+(W/2)+'" y="'+(H-4)+'" fill="'+DIM+'" font-size="12" text-anchor="middle">'+X(info(t).names[v.cat])+'</text><text x="12" y="'+(Tp+4)+'" fill="'+DIM+'" font-size="12">'+X(vn)+'</text>';
    svg+=R.pts.map(p=>{const si=Math.max(0,ser.indexOf(p.s));return '<circle cx="'+px(p.x)+'" cy="'+py(p.y)+'" r="6" fill="'+col(si)+'" fill-opacity=".85" stroke="'+SURF+'" stroke-width="2"'+tip((p.l||'')+(p.s?' ／ '+p.s:''),fmt(p.x)+' , '+fmt(p.y))+'/>'}).join('');
    if(ser.length>1)legend=legendHtml(ser.map((n,i)=>({n,c:col(i)})));
    {const n=R.pts.length;if(n>=3){const mx=xs.reduce((p,c)=>p+c,0)/n,my=ys.reduce((p,c)=>p+c,0)/n;let sxx=0,sxy=0,syy=0;R.pts.forEach(p=>{sxx+=(p.x-mx)*(p.x-mx);sxy+=(p.x-mx)*(p.y-my);syy+=(p.y-my)*(p.y-my)});
      if(sxx>0&&syy>0){const a=sxy/sxx,b0=my-a*mx,r=sxy/Math.sqrt(sxx*syy),x0=Math.min(...xs),x1=Math.max(...xs),cl=y=>Math.max(sy.lo,Math.min(sy.hi,y));
        svg+='<line x1="'+px(x0)+'" y1="'+py(cl(a*x0+b0))+'" x2="'+px(x1)+'" y2="'+py(cl(a*x1+b0))+'" stroke="'+PAL[3]+'" stroke-width="2.5" stroke-dasharray="6 5"/>';
        const ar=Math.abs(r);legend+='<div style="padding:4px;font-size:14px;color:var(--gold)">点線＝傾向線。相関 r = '+r.toFixed(2)+'（'+(ar>=.7?'強い':ar>=.4?'ややある':'ほとんどない')+(ar>=.4?(r>0?'正の関係：一方が増えると他方も増える':'負の関係：一方が増えると他方は減る'):'')+'）</div><div style="padding:0 4px;font-size:12px;color:var(--dim)">※ 関係があっても、原因とは限りません</div>'}}}
    return '<svg id="csvg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+svg+'</svg>'+legend}
  if(v.type==='pie'){
    let items=R.cats.map(c=>({n:c,v:Math.max(0,R.tot(c))})).filter(x=>x.v>0);items.sort((a,b)=>b.v-a.v);
    if(items.length>7){const rest=items.slice(6).reduce((p,c)=>p+c.v,0);items=items.slice(0,6).concat([{n:'その他',v:rest}])}
    const total=items.reduce((p,c)=>p+c.v,0);if(!total)return '<div style="padding:30px;text-align:center;color:'+DIM+'">円グラフにできる正の値がありません</div>';
    const cx=W/2,cy=130,r=105,ri=58;let a0=-Math.PI/2;H=260;
    items.forEach((it,i)=>{const a1=a0+it.v/total*Math.PI*2,big=a1-a0>Math.PI?1:0,c=(i===6||it.n==='その他')?OTHER:PAL[i];
      const pt=(a,rr)=>(cx+Math.cos(a)*rr).toFixed(1)+' '+(cy+Math.sin(a)*rr).toFixed(1);
      const d=items.length===1?'M'+pt(0,r)+' A'+r+' '+r+' 0 1 1 '+pt(Math.PI,r)+' A'+r+' '+r+' 0 1 1 '+pt(0,r)+' L'+pt(0,ri)+' A'+ri+' '+ri+' 0 1 0 '+pt(Math.PI,ri)+' A'+ri+' '+ri+' 0 1 0 '+pt(0,ri)+'Z':
        'M'+pt(a0,r)+' A'+r+' '+r+' 0 '+big+' 1 '+pt(a1,r)+' L'+pt(a1,ri)+' A'+ri+' '+ri+' 0 '+big+' 0 '+pt(a0,ri)+'Z';
      svg+='<path d="'+d+'" fill="'+c+'" stroke="'+SURF+'" stroke-width="2"'+tip(it.n,fmt(it.v)+'（'+(it.v/total*100).toFixed(1)+'%）',it.n==='その他'?null:it.n)+'/>';a0=a1});
    svg+='<text x="'+cx+'" y="'+(cy-2)+'" fill="'+INK+'" font-size="22" font-weight="700" text-anchor="middle">'+fmt(total)+'</text><text x="'+cx+'" y="'+(cy+18)+'" fill="'+DIM+'" font-size="12" text-anchor="middle">'+X(vn)+'</text>';
    legend=legendHtml(items.map((it,i)=>({n:it.n+' '+(it.v/total*100).toFixed(0)+'%',c:it.n==='その他'?OTHER:PAL[i]})));
    return '<svg id="csvg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+svg+'</svg>'+legend}
  if(NEWT.includes(v.type))return drawX(t,v,R,box,W);
  const nC=R.cats.length,all=[];R.cats.forEach(c=>ser.forEach(sn=>{const x=R.val(c,sn);if(x!=null)all.push(x)}));
  let mn=Math.min(0,...all),mx=Math.max(0,...all);const sc=niceScale(mn,mx,4);
  if(v.type==='hbar'){
    const L=Math.min(110,Math.max(50,...R.cats.map(c=>Math.min(c.length,8)*12+10))),Rr=44,Tp=8,rowH=Math.max(ser.length*16+10,28);H=Tp+nC*rowH+26;
    const px=x=>L+(x-sc.lo)/(sc.hi-sc.lo)*(W-L-Rr);
    svg+=sc.ticks.map(x=>'<line x1="'+px(x)+'" x2="'+px(x)+'" y1="'+Tp+'" y2="'+(H-22)+'" stroke="'+GRID+'"/><text x="'+px(x)+'" y="'+(H-6)+'" fill="'+DIM+'" font-size="11" text-anchor="middle">'+fmt(x)+'</text>').join('');
    R.cats.forEach((c,i)=>{const y0=Tp+i*rowH;svg+='<text x="'+(L-6)+'" y="'+(y0+rowH/2+4)+'" fill="'+INK+'" font-size="12" text-anchor="end">'+X(tr(c,8))+'</text>';
      ser.forEach((sn,j)=>{const x=R.val(c,sn);if(x==null)return;const bh=Math.min(18,(rowH-8)/ser.length-2),by=y0+4+j*(bh+2),x0=px(0),x1=px(x);
        svg+='<rect x="'+Math.min(x0,x1)+'" y="'+by+'" width="'+Math.max(1,Math.abs(x1-x0))+'" height="'+bh+'" rx="3" fill="'+col(j)+'"'+tip(c+(sn?' ／ '+sn:''),fmt(x),c)+'/>';
        if(ser.length===1)svg+='<text x="'+(Math.max(x0,x1)+4)+'" y="'+(by+bh-3)+'" fill="'+INK+'" font-size="11">'+fmt(x)+'</text>'})});
    svg+='<line x1="'+px(0)+'" x2="'+px(0)+'" y1="'+Tp+'" y2="'+(H-22)+'" stroke="'+DIM+'"/>'}
  else{
    const L=44,Rr=10,Tp=12,rot=nC>5,B=rot?58:30;H=300;const py=y=>Tp+(1-(y-sc.lo)/(sc.hi-sc.lo))*(H-Tp-B),band=(W-L-Rr)/nC,cxp=i=>L+band*(i+.5);
    svg+=sc.ticks.map(y=>'<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+py(y)+'" y2="'+py(y)+'" stroke="'+GRID+'"/><text x="'+(L-6)+'" y="'+(py(y)+4)+'" fill="'+DIM+'" font-size="11" text-anchor="end">'+fmt(y)+'</text>').join('');
    const every=Math.ceil(nC/(v.type==='line'?6:12));
    R.cats.forEach((c,i)=>{if(i%every)return;const x=cxp(i),y=H-B+14;svg+=rot?'<text transform="translate('+x+','+y+') rotate(-40)" fill="'+INK+'" font-size="11" text-anchor="end">'+X(tr(c,7))+'</text>':'<text x="'+x+'" y="'+y+'" fill="'+INK+'" font-size="12" text-anchor="middle">'+X(tr(c,7))+'</text>'});
    if(v.type==='line'){
      ser.forEach((sn,j)=>{let d='',pts=[],pen=false;R.cats.forEach((c,i)=>{const x=R.val(c,sn);if(x==null){pen=false;return}d+=(pen?'L':'M')+cxp(i).toFixed(1)+' '+py(x).toFixed(1)+' ';pen=true;pts.push([i,c,x])});
        svg+='<path d="'+d.trim()+'" fill="none" stroke="'+col(j)+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
        pts.forEach(([i,c,x])=>{svg+='<circle cx="'+cxp(i)+'" cy="'+py(x)+'" r="'+(nC>20?3:4.5)+'" fill="'+col(j)+'" stroke="'+SURF+'" stroke-width="2"'+tip(c+(sn?' ／ '+sn:''),fmt(x),c)+'/>'})});
      // 当たり判定（透明の縦帯）
      R.cats.forEach((c,i)=>{svg+='<rect x="'+(cxp(i)-band/2)+'" y="'+Tp+'" width="'+band+'" height="'+(H-Tp-B)+'" fill="transparent"'+tip(c,ser.map(sn=>(sn?sn+'：':'')+fmt(R.val(c,sn))).join('　'),c)+'/>'})}
    else{
      const gw=Math.min(band*.78,48*ser.length),bw=gw/ser.length-(ser.length>1?2:0);
      R.cats.forEach((c,i)=>{ser.forEach((sn,j)=>{const x=R.val(c,sn);if(x==null)return;const bx=cxp(i)-gw/2+j*(gw/ser.length),y0=py(0),y1=py(x);
        svg+='<rect x="'+bx+'" y="'+Math.min(y0,y1)+'" width="'+Math.max(2,bw)+'" height="'+Math.max(1,Math.abs(y1-y0))+'" rx="3" fill="'+col(j)+'"'+tip(c+(sn?' ／ '+sn:''),fmt(x),c)+'/>';
        if(ser.length===1&&nC<=8)svg+='<text x="'+(bx+bw/2)+'" y="'+(Math.min(y0,y1)-4)+'" fill="'+INK+'" font-size="11" text-anchor="middle">'+fmt(x)+'</text>'})});
      svg+='<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+py(0)+'" y2="'+py(0)+'" stroke="'+DIM+'"/>'}}
  if(ser.length>1)legend=legendHtml(ser.map((n,i)=>({n,c:col(i)})).concat(R.cut?[{n:'（他'+R.cut+'件は省略）',c:OTHER}]:[]));
  return '<svg id="csvg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+svg+'</svg>'+legend+(R.capped?'<div style="color:'+DIM+';font-size:12px;padding:4px">※ 項目が多いので先頭の40件だけ表示しています。絞り込みで減らせます</div>':'')}

const NEWT=['stack','stack100','area','pareto','wf','heat','hist'];
// ===================== 追加のグラフ（積み上げ・面・パレート・増減・ヒートマップ・度数分布） =====================
function drawX(t,v,R,box,W){
  const I=info(t),vn=v.val>=0&&v.agg!=='count'?I.names[v.val]:'件数',ser=R.series||[],col=i=>i<6?PAL[i]:OTHER;
  const tip=(a,b,k)=>' data-tip="'+X(a+'　'+b)+'" '+(k==null?'':'data-k="'+X(k)+'" ');
  const nC=(R.cats||[]).length;let svg='',legend='',H=300;
  const msg=s=>'<div style="padding:30px;text-align:center;color:'+DIM+'">'+s+'</div>';
  const wrap=()=>'<svg id="csvg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'">'+svg+'</svg>'+legend;
  const frame=(sc,o)=>{o=o||{};const cs=o.cats||R.cats,n=cs.length,L=o.L||44,Rr=o.R||10,Tp=12,rot=n>5,B=rot?58:30;
    const py=y=>Tp+(1-(y-sc.lo)/(sc.hi-sc.lo))*(H-Tp-B),band=(W-L-Rr)/n,cxp=i=>L+band*(i+.5);let s='';
    s+=sc.ticks.map(y=>'<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+py(y)+'" y2="'+py(y)+'" stroke="'+GRID+'"/><text x="'+(L-6)+'" y="'+(py(y)+4)+'" fill="'+DIM+'" font-size="11" text-anchor="end">'+(o.tf||fmt)(y)+'</text>').join('');
    const every=Math.ceil(n/(o.every||12));
    cs.forEach((c,i)=>{if(i%every)return;const x=cxp(i),y=H-B+14;s+=rot?'<text transform="translate('+x+','+y+') rotate(-40)" fill="'+INK+'" font-size="11" text-anchor="end">'+X(tr(c,7))+'</text>':'<text x="'+x+'" y="'+y+'" fill="'+INK+'" font-size="12" text-anchor="middle">'+X(tr(c,7))+'</text>'});
    return{s,py,band,cxp,L,Rr,Tp,B}};
  const legSer=()=>{if(ser.length>1&&ser[0]!=='')legend=legendHtml(ser.map((n,i)=>({n,c:col(i)})).concat(R.cut?[{n:'（他'+R.cut+'件は省略）',c:OTHER}]:[]))};

  if(v.type==='stack'||v.type==='stack100'){
    const pct=v.type==='stack100',tt=c=>ser.reduce((p,sn)=>p+Math.abs(R.val(c,sn)||0),0);
    let mx=0,mn=0;R.cats.forEach(c=>{let p=0,n=0;ser.forEach(sn=>{const x=R.val(c,sn)||0;if(x>=0)p+=x;else n+=x});mx=Math.max(mx,p);mn=Math.min(mn,n)});
    const sc=pct?niceScale(0,1,4):niceScale(mn,mx,4),f=frame(sc,{tf:pct?(y=>Math.round(y*100)+'%'):null});svg+=f.s;
    const bw=Math.min(f.band*.7,56);
    R.cats.forEach((c,i)=>{let up=0,dn=0;const T0=pct?tt(c):1;
      ser.forEach((sn,j)=>{const x0=R.val(c,sn);if(x0==null)return;const x=pct?(T0?x0/T0:0):x0;let y0,y1;if(x>=0){y0=up;up+=x;y1=up}else{y0=dn;dn+=x;y1=dn}
        svg+='<rect x="'+(f.cxp(i)-bw/2)+'" y="'+Math.min(f.py(y0),f.py(y1))+'" width="'+bw+'" height="'+Math.max(1,Math.abs(f.py(y0)-f.py(y1)))+'" fill="'+col(j)+'" stroke="'+SURF+'" stroke-width="1"'+tip(c+(sn?' ／ '+sn:''),fmt(x0)+(pct&&T0?'（'+Math.round(x0/T0*100)+'%）':''),c)+'/>'});
      if(!pct&&nC<=10)svg+='<text x="'+f.cxp(i)+'" y="'+(f.py(up)-4)+'" fill="'+INK+'" font-size="11" text-anchor="middle">'+fmt(up+dn)+'</text>'});
    svg+='<line x1="'+f.L+'" x2="'+(W-f.Rr)+'" y1="'+f.py(0)+'" y2="'+f.py(0)+'" stroke="'+DIM+'"/>';legSer();
    if(ser.length<2||ser[0]==='')legend='<div style="color:'+DIM+';font-size:12px;padding:4px">※「② 色分け」を選ぶと、内訳が積み上がります</div>';
    return wrap()}

  if(v.type==='area'){
    if(nC<2)return msg('面グラフは2つ以上の点が必要です。棒グラフにしてみてください。');
    const stacked=ser.length>1;let mx=0,mn=0;
    R.cats.forEach(c=>{if(stacked){let s=0;ser.forEach(sn=>{s+=Math.max(0,R.val(c,sn)||0)});mx=Math.max(mx,s)}else{const x=R.val(c,ser[0])||0;mx=Math.max(mx,x);mn=Math.min(mn,x)}});
    const sc=niceScale(mn,mx,4),f=frame(sc,{every:6});svg+=f.s;
    const base=R.cats.map(()=>0);
    ser.forEach((sn,j)=>{const up=R.cats.map((c,i)=>{const x=R.val(c,sn)||0;return base[i]+(stacked?Math.max(0,x):x)});
      let d='M'+f.cxp(0).toFixed(1)+' '+f.py(base[0]).toFixed(1)+' ';up.forEach((u,i)=>{d+='L'+f.cxp(i).toFixed(1)+' '+f.py(u).toFixed(1)+' '});
      for(let i=nC-1;i>=0;i--)d+='L'+f.cxp(i).toFixed(1)+' '+f.py(base[i]).toFixed(1)+' ';
      svg+='<path d="'+d+'Z" fill="'+col(j)+'" fill-opacity="'+(stacked?'.75':'.35')+'" stroke="none"/>';
      let ln='';up.forEach((u,i)=>{ln+=(i?'L':'M')+f.cxp(i).toFixed(1)+' '+f.py(u).toFixed(1)+' '});
      svg+='<path d="'+ln.trim()+'" fill="none" stroke="'+col(j)+'" stroke-width="2" stroke-linejoin="round"/>';
      up.forEach((u,i)=>{base[i]=u})});
    R.cats.forEach((c,i)=>{svg+='<rect x="'+(f.cxp(i)-f.band/2)+'" y="'+f.Tp+'" width="'+f.band+'" height="'+(H-f.Tp-f.B)+'" fill="transparent"'+tip(c,ser.map(sn=>(sn?sn+'：':'')+fmt(R.val(c,sn))).join('　'),c)+'/>'});
    svg+='<line x1="'+f.L+'" x2="'+(W-f.Rr)+'" y1="'+f.py(0)+'" y2="'+f.py(0)+'" stroke="'+DIM+'"/>';legSer();return wrap()}

  if(v.type==='pareto'){
    const vals=R.cats.map(c=>Math.max(0,R.tot(c))),total=vals.reduce((p,c)=>p+c,0);
    if(!total)return msg('パレート図にできる正の値がありません');
    const sc=niceScale(0,Math.max(...vals),4),f=frame(sc,{R:40});svg+=f.s;
    const bw=Math.min(f.band*.7,48),ph=H-f.Tp-f.B,yy=p=>f.Tp+(1-p)*ph;let cum=0,pts='',k80=-1,circ='';
    R.cats.forEach((c,i)=>{const x=vals[i],y1=f.py(x),y0=f.py(0);
      svg+='<rect x="'+(f.cxp(i)-bw/2)+'" y="'+y1+'" width="'+bw+'" height="'+Math.max(1,y0-y1)+'" rx="3" fill="'+PAL[0]+'"'+tip(c,fmt(x)+'（'+(x/total*100).toFixed(1)+'%）',c)+'/>';
      cum+=x;const p=cum/total;if(k80<0&&p>=.8)k80=i;pts+=(i?'L':'M')+f.cxp(i).toFixed(1)+' '+yy(p).toFixed(1)+' ';
      circ+='<circle cx="'+f.cxp(i)+'" cy="'+yy(p)+'" r="4" fill="'+PAL[3]+'" stroke="'+SURF+'" stroke-width="2"'+tip(c,'累積 '+(p*100).toFixed(1)+'%',c)+'/>'});
    svg+='<path d="'+pts.trim()+'" fill="none" stroke="'+PAL[3]+'" stroke-width="2"/>'+circ;
    [0,.2,.4,.6,.8,1].forEach(p=>{svg+='<text x="'+(W-f.Rr+4)+'" y="'+(yy(p)+4)+'" fill="'+PAL[3]+'" font-size="11">'+Math.round(p*100)+'%</text>'});
    svg+='<line x1="'+f.L+'" x2="'+(W-f.Rr)+'" y1="'+yy(.8)+'" y2="'+yy(.8)+'" stroke="'+PAL[3]+'" stroke-dasharray="4 4" stroke-opacity=".6"/>';
    legend='<div class="legend"><span><i style="background:'+PAL[0]+'"></i>'+X(vn)+'（棒）</span><span><i style="background:'+PAL[3]+'"></i>累積の割合（折れ線）</span></div>'+(k80>=0?'<div style="padding:4px;font-size:14px;color:var(--gold)">上位 '+(k80+1)+' 項目で、全体の '+(vals.slice(0,k80+1).reduce((p,c)=>p+c,0)/total*100).toFixed(0)+'% を占めます</div>':'');
    return wrap()}

  if(v.type==='wf'){
    const steps=[];let run=0;R.cats.forEach(c=>{const d=R.tot(c);steps.push({c,a:run,b:run+d,d});run+=d});
    const cats2=R.cats.concat(['合計']),allv=[0,run].concat(steps.map(s=>s.b),steps.map(s=>s.a));
    const sc=niceScale(Math.min(...allv),Math.max(...allv),4),f=frame(sc,{cats:cats2}),bw=Math.min(f.band*.7,48);svg+=f.s;
    steps.forEach((s,i)=>{const y0=f.py(s.a),y1=f.py(s.b),pos=s.d>=0;
      svg+='<rect x="'+(f.cxp(i)-bw/2)+'" y="'+Math.min(y0,y1)+'" width="'+bw+'" height="'+Math.max(1,Math.abs(y1-y0))+'" rx="3" fill="'+(pos?PAL[2]:PAL[1])+'"'+tip(s.c,(pos?'+':'')+fmt(s.d)+'　→　'+fmt(s.b),s.c)+'/>';
      if(nC<=10)svg+='<text x="'+f.cxp(i)+'" y="'+(Math.min(y0,y1)-4)+'" fill="'+INK+'" font-size="11" text-anchor="middle">'+(pos?'+':'')+fmt(s.d)+'</text>';
      svg+='<line x1="'+(f.cxp(i)+bw/2)+'" x2="'+(f.cxp(i+1)-bw/2)+'" y1="'+y1+'" y2="'+y1+'" stroke="'+DIM+'" stroke-dasharray="3 3"/>'});
    const yt=f.py(run),y0=f.py(0);
    svg+='<rect x="'+(f.cxp(nC)-bw/2)+'" y="'+Math.min(yt,y0)+'" width="'+bw+'" height="'+Math.max(1,Math.abs(yt-y0))+'" rx="3" fill="'+PAL[0]+'"'+tip('合計',fmt(run))+'/>';
    svg+='<text x="'+f.cxp(nC)+'" y="'+(Math.min(yt,y0)-4)+'" fill="'+INK+'" font-size="11" text-anchor="middle">'+fmt(run)+'</text>';
    svg+='<line x1="'+f.L+'" x2="'+(W-f.Rr)+'" y1="'+f.py(0)+'" y2="'+f.py(0)+'" stroke="'+DIM+'"/>';
    legend='<div class="legend"><span><i style="background:'+PAL[2]+'"></i>増える</span><span><i style="background:'+PAL[1]+'"></i>減る</span><span><i style="background:'+PAL[0]+'"></i>合計</span></div><div style="color:'+DIM+';font-size:12px;padding:4px">※ 左から順に積み重ねた結果が右端の「合計」です。並び順は「② 並び順」で変えられます</div>';
    return wrap()}

  if(v.type==='heat'){
    if(ser.length<2||ser[0]==='')return msg('ヒートマップには「② 色分け（2つ目の分類）」が必要です。<br>色分けの列を選んでください。');
    let mx=0;R.cats.forEach(c=>ser.forEach(sn=>{const x=R.val(c,sn);if(x!=null)mx=Math.max(mx,Math.abs(x))}));
    const L=Math.min(110,Math.max(50,...R.cats.map(c=>Math.min(c.length,8)*12+10))),Tp=48,cw=(W-L-6)/ser.length,ch=34;H=Tp+nC*ch+8;
    ser.forEach((sn,j)=>{const x=L+cw*(j+.5);svg+=cw<56?'<text transform="translate('+x+','+(Tp-6)+') rotate(-40)" fill="'+INK+'" font-size="11">'+X(tr(sn,7))+'</text>':'<text x="'+x+'" y="'+(Tp-8)+'" fill="'+INK+'" font-size="12" text-anchor="middle">'+X(tr(sn,8))+'</text>'});
    R.cats.forEach((c,i)=>{const y=Tp+i*ch;svg+='<text x="'+(L-6)+'" y="'+(y+ch/2+4)+'" fill="'+INK+'" font-size="12" text-anchor="end">'+X(tr(c,8))+'</text>';
      ser.forEach((sn,j)=>{const x=R.val(c,sn);if(x==null){svg+='<rect x="'+(L+cw*j+1)+'" y="'+(y+1)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" rx="4" fill="'+SURF+'" stroke="'+GRID+'"/>';return}
        const a=mx?(.1+.85*Math.abs(x)/mx):.1,rgb=x<0?'255,107,107':'74,158,255';
        svg+='<rect x="'+(L+cw*j+1)+'" y="'+(y+1)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" rx="4" fill="rgba('+rgb+','+a.toFixed(2)+')"'+tip(c+' ／ '+sn,fmt(x),c)+'/>';
        if(cw>=44)svg+='<text x="'+(L+cw*(j+.5))+'" y="'+(y+ch/2+4)+'" fill="'+INK+'" font-size="11" text-anchor="middle" pointer-events="none">'+fmt(x)+'</text>'})});
    legend='<div style="color:'+DIM+';font-size:12px;padding:4px">色が濃いほど大きい値です（最大 '+fmt(mx)+'）。赤はマイナス。</div>';return wrap()}

  if(v.type==='hist'){
    const bins=R.bins,st=R.stats,maxn=Math.max(...bins.map(b=>b.n)),sc=niceScale(0,maxn,4);
    const L=40,Rr=10,Tp=16,B=34;H=280;const py=y=>Tp+(1-(y-sc.lo)/(sc.hi-sc.lo))*(H-Tp-B),w=(W-L-Rr)/bins.length,lo=bins[0].lo,hi=bins[bins.length-1].hi,px=x=>L+(x-lo)/(hi-lo)*(W-L-Rr);
    svg+=sc.ticks.map(y=>'<line x1="'+L+'" x2="'+(W-Rr)+'" y1="'+py(y)+'" y2="'+py(y)+'" stroke="'+GRID+'"/><text x="'+(L-6)+'" y="'+(py(y)+4)+'" fill="'+DIM+'" font-size="11" text-anchor="end">'+Math.round(y)+'</text>').join('');
    bins.forEach((b,i)=>{svg+='<rect x="'+(L+i*w+1)+'" y="'+py(b.n)+'" width="'+Math.max(1,w-2)+'" height="'+Math.max(0,py(0)-py(b.n))+'" rx="2" fill="'+PAL[0]+'"'+tip(fmt(b.lo)+' 〜 '+fmt(b.hi),b.n+'件（'+(b.n/R.n*100).toFixed(1)+'%）')+'/>'});
    const every=Math.ceil(bins.length/6);bins.forEach((b,i)=>{if(i%every)return;svg+='<text x="'+(L+i*w)+'" y="'+(H-B+16)+'" fill="'+DIM+'" font-size="11" text-anchor="middle">'+fmt(b.lo)+'</text>'});
    svg+='<text x="'+(W-Rr)+'" y="'+(H-B+16)+'" fill="'+DIM+'" font-size="11" text-anchor="end">'+fmt(hi)+'</text>';
    [[st.mean,'平均',PAL[3]],[st.med,'中央値',PAL[2]]].forEach(([x,n,c],k)=>{svg+='<line x1="'+px(x)+'" x2="'+px(x)+'" y1="'+Tp+'" y2="'+(H-B)+'" stroke="'+c+'" stroke-width="2" stroke-dasharray="5 4"/><text x="'+px(x)+'" y="'+(Tp-3-k*0)+'" fill="'+c+'" font-size="11" text-anchor="'+(px(x)>W/2?'end':'start')+'">'+n+' '+fmt(x)+'</text>'});
    svg+='<text x="'+(W/2)+'" y="'+(H-4)+'" fill="'+DIM+'" font-size="12" text-anchor="middle">'+X(I.names[v.cat])+'</text>';
    legend='<div style="padding:4px;font-size:14px;color:var(--gold)">'+R.n+'件 ／ 最小 '+fmt(st.min)+' ／ 最大 '+fmt(st.max)+' ／ 平均 '+fmt(st.mean)+' ／ 中央値 '+fmt(st.med)+'</div>'+(Math.abs(st.mean-st.med)>(st.max-st.min)*.1?'<div style="color:'+DIM+';font-size:12px;padding:0 4px">平均と中央値が離れています。大きい（小さい）値に引っ張られている可能性があります。</div>':'');
    return wrap()}
  return msg('このグラフは表示できません')}

function prepType(I,v,k){
  const txt=I.names.map((_,i)=>i).filter(i=>I.types[i]==='text'&&i!==v.cat&&I.uniq[i].length>=2&&I.uniq[i].length<=8),nums=I.types.map((x,i)=>x==='num'?i:-1).filter(i=>i>=0);
  if(k==='hist'){if(!nums.length){toast('度数分布には数字の列が必要です');return false}if(I.types[v.cat]!=='num')v.cat=nums.includes(v.val)?v.val:nums[0];v.ser=-1;v.type=k;return true}
  if(k==='scatter'){v.type=k;return true}
  if(I.types[v.cat]==='num'){const c=I.names.map((_,i)=>i).find(i=>I.types[i]!=='num'&&I.uniq[i].length>=2);if(c==null){toast('分類にできる列がありません');return false}v.cat=c;if(v.ser===v.cat)v.ser=-1}
  if(k==='stack'||k==='stack100'||k==='heat'){
    if(v.ser<0||v.ser===v.cat||I.types[v.ser]!=='text'){const tx=I.names.map((_,i)=>i).filter(i=>I.types[i]==='text'&&i!==v.cat&&I.uniq[i].length>=2&&I.uniq[i].length<=8);
      if(!tx.length){toast('「色分け」にできる列（2〜8種類の文字の列）がありません');return false}v.ser=tx[0];toast('色分けを「'+I.names[v.ser]+'」にしました')}}
  if((k==='area'||k==='line')&&I.types[v.cat]==='date')v.sort='orig';
  v.type=k;return true}
function fillSel(el,opts,val){el.innerHTML=opts.map(([k,l])=>'<option value="'+k+'">'+X(l)+'</option>').join('');el.value=String(val)}
const TYPES=[['rec','✨ おすすめ'],['bar','棒'],['hbar','横棒'],['line','折れ線'],['pie','円'],['scatter','散布図'],['stack','積み上げ'],['stack100','100%積み上げ'],['area','面'],['pareto','パレート'],['wf','増減(ウォーターフォール)'],['heat','ヒートマップ'],['hist','度数分布']];
function renderChart(){
  const t=T();if(!t)return;if(!t.view)t.view=recommend(t);const v=t.view,I=info(t);
  if(v.cat<0||v.cat>=I.w||v.val>=I.w){t.view=recommend(t);}
  const V=t.view;
  const allCols=I.names.map((n,i)=>[i,n+(I.types[i]==='num'?'（数）':I.types[i]==='date'?'（日付）':'')]);
  fillSel($('vCat'),allCols,V.cat);
  fillSel($('vVal'),[[-1,'件数だけ数える']].concat(I.names.map((n,i)=>[i,n]).filter(([i])=>I.types[i]==='num')),V.val);
  $('vAgg').value=V.agg;$('vSort').value=V.sort;$('vGran').value=V.gran;
  fillSel($('vSer'),[[-1,'なし']].concat(allCols.filter(([i])=>I.types[i]==='text'&&i!==V.cat&&I.uniq[i].length<=8&&I.uniq[i].length>=2)),V.ser);
  $('granBox').style.display=I.types[V.cat]==='date'?'':'none';
  $('vAgg').disabled=V.val<0;
  const rec=recommend(t);
  $('ctype').innerHTML=TYPES.map(([k,l])=>'<button class="chip'+(k==='rec'?' rec':'')+((k===V.type)?' on':'')+'" data-ct="'+k+'">'+l+(k==='rec'?'：'+({bar:'棒',hbar:'横棒',line:'折れ線',scatter:'散布図'}[rec.type]):'')+'</button>').join('');
  // スライサー
  let sh='';I.names.forEach((n,i)=>{if(I.types[i]==='num'||I.types[i]==='date'||I.uniq[i].length<2||I.uniq[i].length>12)return;const cur=V.sl[i]||[];
    sh+='<div style="margin-bottom:8px"><div style="font-size:12px;color:var(--dim);margin-bottom:4px">'+X(n)+(cur.length?'　<b style="color:var(--gold)">'+cur.length+'個選択中</b>':'')+'</div><div class="chips">'+I.uniq[i].map((u,k)=>'<button class="chip'+(cur.includes(u)?' on':'')+'" data-sl="'+i+'" data-su="'+k+'">'+X(tr(u,10))+'</button>').join('')+'</div></div>'});
  $('slicers').innerHTML=sh||'<div style="color:var(--dim);font-size:13px">絞り込める列（2〜12種類の文字の列）がありません</div>';
  $('slClr').style.display=Object.keys(V.sl).some(k=>(V.sl[k]||[]).length)?'':'none';
  const R=compute(t,V);$('slCnt').textContent=R.all+'件中 '+R.n+'件';
  $('why').innerHTML=whyText(t,V,R);$('tip').textContent='棒・点・線をタップすると数字が出ます';
  $('chartBox').innerHTML=drawChart(t,V,R);
}
function chg(f){const t=T();if(!t.view)t.view=recommend(t);f(t.view);touch();renderChart()}
$('ctype').onclick=e=>{const b=e.target.closest('[data-ct]');if(!b)return;const t=T(),k=b.dataset.ct;
  if(k==='rec'){const r=recommend(t);r.sl=(t.view&&t.view.sl)||{};t.view=r;touch();renderChart();return}
  chg(v=>{const I=info(t);if(k!=='scatter'){if(!prepType(I,v,k))return}else v.type=k;if(k==='scatter'){const nums=I.types.map((x,i)=>x==='num'?i:-1).filter(i=>i>=0);if(nums.length<2){toast('散布図には数字の列が2つ必要です');v.type='bar';return}if(I.types[v.cat]!=='num')v.cat=nums.find(i=>i!==v.val)??nums[0];if(v.val<0||v.val===v.cat)v.val=nums.find(i=>i!==v.cat)}
    else if(v.type!=='scatter'&&I.types[v.cat]==='num'&&I.types.indexOf('text')>=0){}})};
$('vCat').onchange=()=>chg(v=>{v.cat=+$('vCat').value;if(v.ser===v.cat)v.ser=-1;const I=info(T());if(I.types[v.cat]==='date'&&v.sort==='val')v.sort='orig'});
$('vVal').onchange=()=>chg(v=>{v.val=+$('vVal').value;if(v.val<0)v.agg='count';else if(v.agg==='count')v.agg='sum'});
$('vAgg').onchange=()=>chg(v=>v.agg=$('vAgg').value);$('vSer').onchange=()=>chg(v=>v.ser=+$('vSer').value);
$('vSort').onchange=()=>chg(v=>v.sort=$('vSort').value);$('vGran').onchange=()=>chg(v=>v.gran=$('vGran').value);
$('vNext').onclick=()=>chg(v=>{const I=info(T()),c=I.names.map((_,i)=>i).filter(i=>I.types[i]!=='num'&&I.uniq[i].length>=2);if(!c.length){toast('切り替えられる分類の列がありません');return}
  const k=c.indexOf(v.cat);v.cat=c[(k+1)%c.length];if(v.ser===v.cat)v.ser=-1;if(v.type==='scatter')v.type='bar';if(I.types[v.cat]==='date'&&v.type==='bar')v.type='line';else if(I.types[v.cat]!=='date'&&v.type==='line')v.type='bar';v.sort=I.types[v.cat]==='date'?'orig':'val';
  toast('分類：'+I.names[v.cat])});
$('slicers').onclick=e=>{const b=e.target.closest('[data-sl]');if(!b)return;const i=+b.dataset.sl,u=info(T()).uniq[i][+b.dataset.su];chg(v=>{const a=v.sl[i]||[];v.sl[i]=a.includes(u)?a.filter(x=>x!==u):a.concat([u])})};
$('slClr').onclick=()=>chg(v=>v.sl={});
$('chartBox').addEventListener('click',e=>{const el=e.target.closest('[data-tip]');$('tip').textContent=el?el.getAttribute('data-tip'):'棒・点・線をタップすると数字が出ます'});
$('chartBox').addEventListener('mouseover',e=>{const el=e.target.closest('[data-tip]');if(el)$('tip').textContent=el.getAttribute('data-tip')});

// ===================== 画像保存 =====================
function savePng(svgEl,name){
  if(!svgEl){toast('保存する図がありません');return}
  const w=+svgEl.getAttribute('width')||svgEl.viewBox.baseVal.width,h=+svgEl.getAttribute('height')||svgEl.viewBox.baseVal.height;
  let x=new XMLSerializer().serializeToString(svgEl);if(!/xmlns=/.test(x))x=x.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"');
  x=x.replace(/^<svg([^>]*)>/,'<svg$1><rect width="100%" height="100%" fill="'+SURF+'"/>');
  const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=w*2;c.height=h*2;const g=c.getContext('2d');g.scale(2,2);g.drawImage(img,0,0,w,h);
    c.toBlob(async b=>{const f=new File([b],name+'.png',{type:'image/png'});try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f]});return}}catch(e){}
      const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name+'.png';a.click();toast('画像を保存しました')})};
  img.onerror=()=>toast('画像にできませんでした');img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x)}
$('cPng').onclick=()=>savePng($('csvg'),(T().title||'graph')+'-graph');


// ===================== ダッシュボード（連動する複数グラフ） =====================
const openEd=new Set();let lastTip='';
function isCat(I,i){return I.types[i]==='date'||(I.types[i]==='text'&&I.uniq[i].length>=2&&I.uniq[i].length<=12)}
function autoCards(t){const I=info(t),cards=[];const nums=I.types.map((x,i)=>x==='num'?i:-1).filter(i=>i>=0),val=nums.length?nums[0]:-1;
  const mkc=o=>Object.assign({id:uid(),type:'bar',cat:-1,val:val,agg:val>=0?'sum':'count',ser:-1,sort:'val',gran:'m',sl:{}},o);
  const d=I.types.indexOf('date');
  if(d>=0){const ds=I.body.map(r=>dparse(r[d])).filter(Boolean);const span=ds.length?(Math.max(...ds.map(g=>g.y*12+g.m))-Math.min(...ds.map(g=>g.y*12+g.m))):0;cards.push(mkc({cat:d,type:'line',sort:'orig',gran:span>=36?'y':(span>=2?'m':'d')}))}
  I.names.forEach((n,i)=>{if(cards.length>=4||I.types[i]!=='text'||I.uniq[i].length<2||I.uniq[i].length>12)return;const len=Math.max(0,...I.uniq[i].map(x=>x.length));cards.push(mkc({cat:i,type:(I.uniq[i].length>6||len>5)?'hbar':'bar'}))});
  if(!cards.length){const r=recommend(t);cards.push(mkc({cat:Math.max(0,r.cat),val:r.val,agg:r.agg,type:r.type==='scatter'?'bar':r.type,sort:r.sort,gran:r.gran}))}
  return cards}
function dashOf(t){const I=info(t);if(!t.dash)t.dash={cards:autoCards(t),xf:[]};const D=t.dash;
  D.cards=D.cards.filter(c=>c.cat>=0&&c.cat<I.w&&c.val<I.w);D.xf=(D.xf||[]).filter(f=>f.col<I.w&&(f.src==='sl'||D.cards.some(c=>c.id===f.src)));
  if(!D.cards.length)D.cards=autoCards(t);return D}
function cardTitle(I,c){if(c.type==='hist')return I.names[c.cat]+'の分布（度数）';const cn=I.names[c.cat],vn=c.val>=0&&c.agg!=='count'?I.names[c.val]:'件数';return cn+'ごとの'+vn+(c.agg==='count'||c.val<0?'':'（'+aggName(c.agg)+'）')+(I.types[c.cat]==='date'?'　'+{y:'年',m:'月',d:'日'}[c.gran]+'ごと':'')}
function dKpi(t,D,I){let rows=I.body;if(D.xf.length)rows=rows.filter(r=>D.xf.every(f=>f.vals.includes(bk(I,r,f.col,f.gran))));
  const nums=I.types.map((x,i)=>x==='num'?i:-1).filter(i=>i>=0).slice(0,2);
  let h='<div class="kpi"><small>件数</small><b>'+rows.length.toLocaleString('ja-JP')+'</b><small>/ 全'+I.body.length.toLocaleString('ja-JP')+'件</small></div>';
  nums.forEach(i=>{const x=rows.map(r=>num(r[i])).filter(z=>z!=null);h+='<div class="kpi"><small>'+X(tr(I.names[i],9))+' 合計</small><b>'+fmt(x.reduce((a,b)=>a+b,0))+'</b></div>'});
  return h}
function drawCard(t,D,I,c){const box=document.getElementById('db-'+c.id);if(!box)return;
  const v=Object.assign({},c,{sl:c.sl||{},xf:D.xf.filter(f=>f.src!==c.id)});const R=compute(t,v);box.innerHTML=drawChart(t,v,R,box);
  const own=D.xf.find(f=>f.src===c.id);if(own)box.querySelectorAll('[data-k]').forEach(el=>{el.style.opacity=own.vals.includes(el.dataset.k)?'1':'.28'})}
function renderDash(){const t=T();if(!t)return;const D=dashOf(t),I=info(t);
  $('dkpi').innerHTML=dKpi(t,D,I);
  // 現在の絞り込み
  const nm=f=>f.src==='sl'?'スライサー':null;
  $('dfil').innerHTML=D.xf.length?D.xf.map((f,i)=>'<button class="fchip" data-xr="'+i+'">'+X(I.names[f.col])+'：'+X(f.vals.slice(0,3).map(z=>tr(z,8)).join('、')+(f.vals.length>3?' ほか'+(f.vals.length-3):''))+' ✕</button>').join('')+'<button data-xr="all">全部解除</button>':'<span style="color:var(--dim);font-size:13px">絞り込みなし（グラフをタップすると連動します）</span>';
  // スライサー
  let sh='';I.names.forEach((n,i)=>{if(!isCat(I,i)||I.types[i]==='date')return;const f=D.xf.find(x=>x.src==='sl'&&x.col===i),cur=f?f.vals:[];
    sh+='<div style="margin-bottom:8px"><div style="font-size:12px;color:var(--dim);margin-bottom:4px">'+X(n)+'</div><div class="chips">'+I.uniq[i].map((u,k)=>'<button class="chip'+(cur.includes(u)?' on':'')+'" data-sl="'+i+'" data-su="'+k+'">'+X(tr(u,10))+'</button>').join('')+'</div></div>'});
  $('dslb').innerHTML=sh||'<span style="color:var(--dim);font-size:13px">絞り込める文字の列がありません</span>';
  // カード
  const allCols=I.names.map((n,i)=>[i,n+(I.types[i]==='num'?'（数）':I.types[i]==='date'?'（日付）':'')]);
  const numCols=[[-1,'件数だけ数える']].concat(I.names.map((n,i)=>[i,n]).filter(([i])=>I.types[i]==='num'));
  const opt=(arr,val)=>arr.map(([k,l])=>'<option value="'+k+'"'+(String(k)===String(val)?' selected':'')+'>'+X(l)+'</option>').join('');
  $('dcards').innerHTML=D.cards.map((c,ci)=>{const ed=openEd.has(c.id);
    return '<div class="dc" data-id="'+c.id+'"><div class="dh"><b>'+X(cardTitle(I,c))+'</b><button data-act="up">▲</button><button data-act="dn">▼</button><button data-act="ed">⚙</button><button data-act="del" class="dng">✕</button></div>'
    +(ed?'<div class="ded"><div class="chips" style="margin-bottom:6px">'+[['bar','棒'],['hbar','横棒'],['line','折れ線'],['pie','円'],['stack','積み上げ'],['stack100','100%'],['area','面'],['pareto','パレート'],['wf','増減'],['heat','ヒート'],['hist','度数分布']].map(([k,l])=>'<button class="chip'+(c.type===k?' on':'')+'" data-ct="'+k+'">'+l+'</button>').join('')+'</div>'
      +'<div class="ctl"><div><label>分類</label><select data-f="cat">'+opt(allCols,c.cat)+'</select></div><div><label>値</label><select data-f="val">'+opt(numCols,c.val)+'</select></div>'
      +'<div><label>集計</label><select data-f="agg">'+opt([['sum','合計'],['avg','平均'],['count','件数'],['max','最大'],['min','最小']],c.agg)+'</select></div>'
      +'<div><label>色分け</label><select data-f="ser">'+opt([[-1,'なし']].concat(allCols.filter(([i])=>I.types[i]==='text'&&i!==c.cat&&I.uniq[i].length>=2&&I.uniq[i].length<=8)),c.ser)+'</select></div>'
      +(I.types[c.cat]==='date'?'<div><label>日付のまとめ方</label><select data-f="gran">'+opt([['y','年ごと'],['m','月ごと'],['d','日ごと']],c.gran)+'</select></div>':'')+'</div></div>':'')
    +'<div class="dbox" id="db-'+c.id+'"></div></div>'}).join('');
  D.cards.forEach(c=>drawCard(t,D,I,c));$('dtip').textContent=lastTip||'';
}
function dChange(f){const t=T(),D=dashOf(t);f(D,info(t));touch();renderDash()}
$('dcards').addEventListener('click',e=>{const t=T();if(!t)return;const D=dashOf(t),I=info(t);const dc=e.target.closest('.dc');if(!dc)return;const id=dc.dataset.id,ci=D.cards.findIndex(c=>c.id===id),c=D.cards[ci];
  const k=e.target.closest('[data-k]');
  if(k){lastTip=k.getAttribute('data-tip')||'';const key=k.dataset.k;let f=D.xf.find(x=>x.src===id);
    if(!f){f={src:id,col:c.cat,gran:I.types[c.cat]==='date'?c.gran:null,vals:[key]};D.xf.push(f)}
    else if(f.vals.includes(key)){f.vals=f.vals.filter(z=>z!==key);if(!f.vals.length)D.xf=D.xf.filter(x=>x!==f)}else f.vals.push(key);
    touch();renderDash();return}
  const a=e.target.closest('[data-act]');
  if(a){const act=a.dataset.act;
    if(act==='ed'){openEd.has(id)?openEd.delete(id):openEd.add(id);renderDash()}
    else if(act==='del'){if(D.cards.length<=1){toast('最後の1枚は消せません');return}dChange(D=>{D.cards=D.cards.filter(x=>x.id!==id);D.xf=D.xf.filter(x=>x.src!==id)})}
    else if(act==='up'||act==='dn'){const j=ci+(act==='up'?-1:1);if(j<0||j>=D.cards.length)return;dChange(D=>{const x=D.cards.splice(ci,1)[0];D.cards.splice(j,0,x)})}
    return}
  const ct=e.target.closest('[data-ct]');if(ct){dChange(D=>{const c2=D.cards[ci];if(!prepType(I,c2,ct.dataset.ct))return;if(c2.type==='line'&&I.types[c2.cat]!=='date')c2.sort='orig'})}});
$('dcards').addEventListener('change',e=>{const sel=e.target.closest('select[data-f]');if(!sel)return;const dc=e.target.closest('.dc'),id=dc.dataset.id,f=sel.dataset.f;
  dChange((D,I)=>{const c=D.cards.find(x=>x.id===id);if(f==='agg'||f==='gran')c[f]=sel.value;else c[f]=+sel.value;
    if(f==='cat'){if(c.ser===c.cat)c.ser=-1;c.sort=I.types[c.cat]==='date'?'orig':'val';if(I.types[c.cat]==='date'&&c.type==='bar')c.type='line';else if(I.types[c.cat]!=='date'&&c.type==='line')c.type='bar'}
    if(f==='val'){if(c.val<0)c.agg='count';else if(c.agg==='count')c.agg='sum'}
    if(f==='cat'||f==='gran')D.xf=D.xf.filter(x=>x.src!==id)})});
$('dfil').addEventListener('click',e=>{const b=e.target.closest('[data-xr]');if(!b)return;lastTip='';dChange(D=>{if(b.dataset.xr==='all')D.xf=[];else D.xf.splice(+b.dataset.xr,1)})});
$('dslb').addEventListener('click',e=>{const b=e.target.closest('[data-sl]');if(!b)return;const i=+b.dataset.sl,u=info(T()).uniq[i][+b.dataset.su];
  dChange(D=>{let f=D.xf.find(x=>x.src==='sl'&&x.col===i);if(!f){f={src:'sl',col:i,gran:null,vals:[u]};D.xf.push(f)}else if(f.vals.includes(u)){f.vals=f.vals.filter(z=>z!==u);if(!f.vals.length)D.xf=D.xf.filter(x=>x!==f)}else f.vals.push(u)})});
$('dAdd').onclick=()=>dChange((D,I)=>{const used=D.cards.map(c=>c.cat),cand=I.names.map((_,i)=>i).filter(i=>isCat(I,i)),nums=I.types.map((x,i)=>x==='num'?i:-1).filter(i=>i>=0);
  const cat=cand.find(i=>!used.includes(i));if(cat==null){toast('これ以上、分けられる列がありません（⚙で分類を変えられます）');return}
  const val=nums.length?nums[0]:-1,dt=I.types[cat]==='date';const len=Math.max(0,...I.uniq[cat].map(x=>x.length));
  const c={id:uid(),type:dt?'line':((I.uniq[cat].length>6||len>5)?'hbar':'bar'),cat,val,agg:val>=0?'sum':'count',ser:-1,sort:dt?'orig':'val',gran:'m',sl:{}};D.cards.push(c);openEd.add(c.id)});
$('dAuto').onclick=()=>{if(!confirm('グラフの並びを自動で作り直します（絞り込みも解除）'))return;dChange(D=>{D.cards=autoCards(T());D.xf=[]})};
$('dPng').onclick=()=>{const svgs=[...document.querySelectorAll('#dcards svg')];if(!svgs.length){toast('図がありません');return}
  const w=Math.max(...svgs.map(s=>+s.getAttribute('width')||300)),parts=[];let y=0;
  svgs.forEach(sv=>{const h=+sv.getAttribute('height')||300,sw=+sv.getAttribute('width')||300;let x=new XMLSerializer().serializeToString(sv);x=x.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');parts.push('<g transform="translate(0,'+y+')">'+x+'</g>');y+=h+10});
  const holder=document.createElementNS('http://www.w3.org/2000/svg','svg');holder.setAttribute('width',w);holder.setAttribute('height',y);holder.setAttribute('viewBox','0 0 '+w+' '+y);holder.innerHTML=parts.join('');
  savePng(holder,(T().title||'dashboard')+'-dash')};


// ===================== 取り込み（会計ソフトのCSVなど） =====================
const IM={name:'取り込んだ表',text:'',rows:[],enc:'',del:','};
function parseDelim(s,del){const rows=[];let row=[],cur='',q=false;for(let i=0;i<s.length;i++){const ch=s[i];
  if(q){if(ch==='"'){if(s[i+1]==='"'){cur+='"';i++}else q=false}else cur+=ch}
  else if(ch==='"'&&cur==='')q=true;else if(ch===del){row.push(cur);cur=''}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&s[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur=''}else cur+=ch}
  if(cur!==''||row.length){row.push(cur);rows.push(row)}return rows}
function guessDelim(s){const head=s.split(/\r?\n/).slice(0,8).join('\n');const c={'\t':0,',':0,';':0};for(const ch of head)if(c[ch]!=null)c[ch]++;
  return c['\t']>=Math.max(c[','],c[';'])&&c['\t']>0?'\t':(c[';']>c[',']?';':',')}
function decodeBuf(buf){let enc='UTF-8',txt;try{txt=new TextDecoder('utf-8',{fatal:true}).decode(buf)}catch(e){try{txt=new TextDecoder('shift_jis').decode(buf);enc='Shift_JIS'}catch(e2){txt=new TextDecoder('utf-8').decode(buf)}}
  return{txt:txt.replace(/^\uFEFF/,''),enc}}
function toISO(s){s=String(s).trim();let m=s.match(/^(\d{4})[-\/.年](\d{1,2})[-\/.月](\d{1,2})日?(?:[ T　].*)?$/);if(!m)m=s.match(/^(\d{4})(\d{2})(\d{2})$/);let y,mo,d;
  if(m){y=+m[1];mo=+m[2];d=+m[3]}else{const e=s.match(/^(令和|平成|昭和|[RHS])\s*(元|\d+)[年.\/-](\d{1,2})[月.\/-](\d{1,2})日?$/);if(!e)return null;y=ERA[e[1]]+(e[2]==='元'?1:+e[2]);mo=+e[3];d=+e[4]}
  if(y<1900||y>2200||mo<1||mo>12||d<1||d>31)return null;return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function detectHeader(rows){const mx=Math.max(1,...rows.slice(0,30).map(r=>r.filter(x=>String(x).trim()!=='').length));
  for(let i=0;i<Math.min(rows.length,15);i++){const r=rows[i],ne=r.filter(x=>String(x).trim()!=='');if(ne.length>=Math.max(2,Math.ceil(mx*.6))&&ne.filter(x=>num(x)===null).length/ne.length>=.7)return i}return 0}
function buildImport(){let rows=IM.rows;const hi=+$('iHdr').value;const useH=hi>=0;rows=rows.slice(useH?hi:0);
  const w=Math.max(1,...rows.map(r=>r.length));rows=rows.map(r=>{r=r.map(x=>String(x==null?'':x).normalize('NFKC').replace(/\u00a0/g,' ').trim());while(r.length<w)r.push('');return r});
  rows=rows.filter(r=>r.some(x=>x!==''));
  if($('iTot').checked)rows=rows.filter((r,i)=>{if(useH&&i===0)return true;const f=r.filter(x=>x!=='').slice(0,2);return!f.some(x=>/^(合計|総計|小計|累計|計|合　計)$/.test(x))});
  if($('iNeg').checked)rows=rows.map((r,i)=>(useH&&i===0)?r:r.map(x=>{let m;if((m=x.match(/^[△▲]\s*(\d[\d,]*\.?\d*)$/)))return'-'+m[1].replace(/,/g,'');if((m=x.match(/^\((\d[\d,]*\.?\d*)\)$/)))return'-'+m[1].replace(/,/g,'');
    if((m=x.match(/^[¥$]?\s*(-?\d{1,3}(?:,\d{3})+(?:\.\d+)?)$/)))return m[1].replace(/,/g,'');return x}));
  // 末尾の空列を落とす
  let cw=w;while(cw>1&&rows.every(r=>r[cw-1]===''))cw--;rows=rows.map(r=>r.slice(0,cw));
  if($('iDat').checked){for(let c=0;c<cw;c++){const body=rows.slice(useH?1:0).map(r=>r[c]).filter(x=>x!=='');if(!body.length)continue;const ok=body.filter(x=>toISO(x)).length;
      if(ok/body.length>=.8)rows.forEach((r,i)=>{if(useH&&i===0)return;const z=toISO(r[c]);if(z)r[c]=z})}}
  if(!useH){/* 見出し無し：A列,B列…のまま */}
  return{rows,header:useH}}
function reparse(){const del=$('iDel').value==='auto'?guessDelim(IM.text):($('iDel').value==='\\t'?'\t':$('iDel').value);IM.del=del;IM.rows=parseDelim(IM.text,del);
  const hd=detectHeader(IM.rows);const cur=$('iHdr').dataset.set==='1'?$('iHdr').value:null;
  const opts=[];for(let i=0;i<Math.min(12,IM.rows.length);i++)opts.push('<option value="'+i+'">'+(i+1)+'行目'+(String(IM.rows[i][0]||'').trim()?'：'+esc(String(IM.rows[i].filter(x=>String(x).trim()).slice(0,3).join(' / ')).slice(0,24)):'')+'</option>');
  opts.push('<option value="-1">見出し行なし</option>');$('iHdr').innerHTML=opts.join('');$('iHdr').value=String(cur!=null?cur:hd);preview()}
function preview(){const B=buildImport(),n=B.rows.length-(B.header?1:0),w=B.rows[0]?B.rows[0].length:0;
  $('iInfo').textContent=(IM.enc?'文字コード：'+IM.enc+'　':'')+'区切り：'+({',':'カンマ','\t':'タブ',';':'セミコロン'}[IM.del]||IM.del)+'　→　'+n.toLocaleString('ja-JP')+'行 × '+w+'列'+(n>20000?'（20,000行までを取り込みます）':'');
  $('iPrev').innerHTML='<table>'+B.rows.slice(0,7).map((r,i)=>'<tr class="'+(B.header&&i===0?'h':'')+'">'+r.map(x=>'<td>'+esc(tr(x,14))+'</td>').join('')+'</tr>').join('')+'</table>';
  $('iOk').disabled=!(n>0)}
function openImp(){$('imp').showModal();}
function loadImpText(name,txt,enc){IM.name=name;IM.text=txt;IM.enc=enc||'';$('iHdr').dataset.set='';$('iTa').hidden=true;if(!txt.trim()){$('iInfo').textContent='空のようです';return}reparse()}
$('bImp').onclick=()=>{$('iPrev').innerHTML='';$('iOk').disabled=true;$('iInfo').textContent='freee・弥生・マネーフォワードなどの「仕訳帳／総勘定元帳」CSV（Shift_JISも可）をそのまま選べます。';$('iTa').hidden=true;openImp()};
$('iX').onclick=()=>$('imp').close();
$('iFile').onclick=()=>$('iInp').click();
$('iInp').onchange=async()=>{const f=$('iInp').files[0];if(!f)return;try{const d=decodeBuf(await f.arrayBuffer());loadImpText(f.name.replace(/\.[^.]+$/,''),d.txt,d.enc)}catch(e){$('iInfo').textContent='読み込めませんでした'}$('iInp').value=''};
$('iPaste').onclick=async()=>{$('iTa').hidden=false;let s='';try{s=await navigator.clipboard.readText()}catch(e){}if(s&&s.trim()){$('iTa').value=s;loadImpText('貼り付けた表',s,'')}else $('iTa').focus()};
$('iTa').oninput=()=>{if($('iTa').value.trim())loadImpText('貼り付けた表',$('iTa').value,'');};
['iDel','iNeg','iDat','iTot'].forEach(i=>$(i).onchange=()=>{if(IM.text)reparse()});
$('iHdr').onchange=()=>{$('iHdr').dataset.set='1';preview()};
$('iSample').onclick=()=>{const acc=[['売上','収入',[180000,260000]],['雑収入','収入',[3000,12000]],['仕入','支出',[60000,110000]],['広告宣伝費','支出',[10000,40000]],['地代家賃','支出',[80000,80000]],['通信費','支出',[9000,14000]],['旅費交通費','支出',[2000,16000]],['消耗品費','支出',[1500,18000]]];
  const dep=['東京','大阪','オンライン'];let seed=7;const rnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280};const lines=['日付,勘定科目,区分,部門,金額,摘要'];
  for(let m=1;m<=12;m++)for(let k=0;k<14;k++){const a=acc[Math.floor(rnd()*acc.length)],amt=Math.round((a[2][0]+rnd()*(a[2][1]-a[2][0]))/100)*100,day=1+Math.floor(rnd()*27);
    lines.push('2026/'+m+'/'+day+','+a[0]+','+a[1]+','+dep[Math.floor(rnd()*3)]+',"'+amt.toLocaleString('en-US')+'",'+a[0]+'の取引')}
  lines.push('合計,,,,"0",');loadImpText('会計サンプル（2026年）',lines.join('\n'),'')};
$('iOk').onclick=()=>{const B=buildImport();let rows=B.rows;if(rows.length>20001){rows=rows.slice(0,20001);toast('20,000行までを取り込みました')}
  if(!B.header){const w=rows[0].length;rows.unshift(Array.from({length:w},(_,i)=>colName(i)+'列'))}
  const t=mk(IM.name||'取り込んだ表',1,1);t.d=rows;t.header=true;tables.push(t);cur=t.id;hist=[];sel={r:0,c:0};
  try{save()}catch(e){}
  $('imp').close();VIEW='d';render();window.scrollTo(0,0);toast((rows.length-1).toLocaleString('ja-JP')+'行を取り込みました。ダッシュで見られます')};

// ===================== 声からの受け取り（Worker /inbox） =====================
function syncCfg(){const g=k=>{try{return(localStorage.getItem(k)||'').trim()}catch(e){return''}};return{ep:(g('tp_sync_endpoint')||g('qr_sync_endpoint')).replace(/\/$/,''),tk:g('tp_sync_token')||g('qr_sync_token')}}
function doneIds(){try{return JSON.parse(localStorage.getItem('tp_inbox_done')||'[]')}catch(e){return[]}}
function addDone(ids){try{const a=doneIds().concat(ids);localStorage.setItem('tp_inbox_done',JSON.stringify([...new Set(a)].slice(-600)))}catch(e){}}
function rowsFromAny(s){let rows=/\t/.test(s)?parseTSV(s):s.split(/\r?\n/).filter(x=>x.trim()!=='').map(l=>/^\s*\|/.test(l)?l.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim()):l.split(','));
  rows=rows.filter(r=>!(r.length&&r.every(x=>/^:?-{3,}:?$/.test(String(x).trim()))));if(!rows.length)return null;const w=Math.max(...rows.map(r=>r.length));return rows.map(r=>{r=r.slice();while(r.length<w)r.push('');return r})}
function stamp(ms){const d=new Date(ms||Date.now());return (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function itemToTable(it){const text=String(it.text||'');if(!text.trim())return null;
  if(it.kind==='flow'){const F=parseFlow(text);if(!F.edges.length)return null;const t=mk(it.title||('声のフロー '+stamp(it.createdAt)),1,1);t.d=[['から','へ','ラベル']].concat(F.edges.map(e=>[e.a,e.b,e.l||'']));t.flow={dir:'tb',text:text.split(/\r?\n/).filter(l=>/->/.test(l)).join('\n')||text};return t}
  const rows=rowsFromAny(text);if(!rows)return null;const t=mk(it.title||('声の表 '+stamp(it.createdAt)),1,1);t.d=rows;t.header=true;return t}
let pulling=false,lastPull=0;
async function pullInbox(manual){const c=syncCfg();const out={added:0,seen:0,err:''};
  if(!c.ep||!c.tk){if(manual)out.err='エンドポイントとトークンを入れてください';return out}
  if(pulling)return out;pulling=true;lastPull=Date.now();
  try{const H={Authorization:'Bearer '+c.tk},done=new Set(doneIds());const ack=[];
    for(const kind of ['table','flow']){
      const res=await fetch(c.ep+'/inbox?kind='+kind,{headers:H});if(res.status===401)throw new Error('トークンが違います');if(!res.ok)throw new Error('受け取りに失敗（'+res.status+'）');
      const d=await res.json();const items=Array.isArray(d)?d:(d&&(d.items||d.rows||d.inbox))||[];
      for(const it of items){if(!it||!it.id)continue;out.seen++;
        if(done.has(String(it.id))||tables.some(t=>t.srcId===it.id)){ack.push(it.id);continue}
        const t=itemToTable(Object.assign({kind},it));if(!t){ack.push(it.id);continue}
        t.srcId=it.id;if(Array.isArray(it.tags)&&it.tags.length)t.tags=it.tags;tables.push(t);out.added++;ack.push(it.id)}}
    if(out.added){try{localStorage.setItem(KEY,JSON.stringify(tables))}catch(e){throw new Error('端末に保存できませんでした（空き容量）')}if(!cur&&tables[0])cur=tables[0].id;save()}
    if(ack.length){addDone(ack);try{const r=await fetch(c.ep+'/inbox/ack',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},H),body:JSON.stringify({ids:ack})});if(!r.ok&&manual)out.err='受け取りは済みましたが、あと片づけに失敗（'+r.status+'）。次回また試します'}catch(e){}}
    if(out.added){render();toast('声から '+out.added+' 件の表・フローを受け取りました')}
  }catch(e){out.err=e.message||String(e);if(manual)toast(out.err)}
  finally{pulling=false}return out}
$('bSync').onclick=()=>{const c=syncCfg();$('sEp').value=c.ep;$('sTk').value='';$('sMsg').textContent=c.tk?'トークンは設定済みです':'未設定';$('syn').showModal()};
$('sX').onclick=()=>$('syn').close();
$('sSave').onclick=()=>{try{const e=$('sEp').value.trim();if(e)localStorage.setItem('tp_sync_endpoint',e);const k=$('sTk').value.trim();if(k)localStorage.setItem('tp_sync_token',k)}catch(x){}$('sTk').value='';$('sMsg').textContent='保存しました'};
$('sGo').onclick=async()=>{$('sSave').click();$('sMsg').textContent='受け取り中…';const r=await pullInbox(true);$('sMsg').textContent=r.err?('⚠ '+r.err):(r.added?r.added+' 件受け取りました':'新しい預かりはありません')};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastPull>20000)pullInbox(false)});

// ===================== フローチャート =====================
const FLOW_SAMPLE='開始 -> 材料を用意する -> 合っているか？\n合っているか？ -(はい)-> 作る -> 終了\n合っているか？ -(いいえ)-> 材料を用意する';
function parseFlow(text){
  const nodes=new Map(),edges=[];
  const mk=tok=>{let s=tok.trim();if(!s)return null;let shape='rect',label=s;
    if(/^\(.*\)$/.test(s)){shape='round';label=s.slice(1,-1)}else if(/^\{.*\}$/.test(s)){shape='diamond';label=s.slice(1,-1)}else if(/^\[.*\]$/.test(s)){label=s.slice(1,-1)}
    else if(/[?？]$/.test(s))shape='diamond';else if(/^(開始|終了|終わり|スタート|ゴール|start|end)$/i.test(s))shape='round';
    label=label.trim();if(!label)return null;const id=label;if(!nodes.has(id))nodes.set(id,{id,label,shape,i:nodes.size});else if(shape!=='rect')nodes.get(id).shape=shape;return id};
  String(text||'').split(/\r?\n/).forEach(line=>{line=line.trim();if(!line||line[0]==='#')return;const parts=line.split(/\s*-(?:\(([^)]*)\)-)?>\s*/);
    let prev=null,lab=null;for(let k=0;k<parts.length;k+=2){const id=mk(parts[k]||'');if(k>0&&prev&&id)edges.push({a:prev,b:id,l:(lab||'').trim()});lab=parts[k+1];prev=id||prev}});
  return{nodes:[...nodes.values()],edges}}
function layoutFlow(F,dir){
  const N=new Map(F.nodes.map(n=>[n.id,n]));const out=new Map(),inn=new Map();F.nodes.forEach(n=>{out.set(n.id,[]);inn.set(n.id,[])});
  F.edges.forEach(e=>{out.get(e.a).push(e);inn.get(e.b).push(e)});
  const st=new Map(),back=new Set();
  const dfs=id=>{st.set(id,1);out.get(id).forEach(e=>{const s=st.get(e.b)||0;if(s===1)back.add(e);else if(s===0)dfs(e.b)});st.set(id,2)};
  F.nodes.filter(n=>!inn.get(n.id).length).concat(F.nodes).forEach(n=>{if(!st.get(n.id))dfs(n.id)});
  const rank=new Map();const rk=id=>{if(rank.has(id))return rank.get(id);rank.set(id,0);let r=0;inn.get(id).forEach(e=>{if(!back.has(e)&&e.a!==id)r=Math.max(r,rk(e.a)+1)});rank.set(id,r);return r};
  F.nodes.forEach(n=>rk(n.id));
  // 大きさ
  const units=s=>[...s].reduce((p,c)=>p+(c.charCodeAt(0)>255?2:1),0);
  F.nodes.forEach(n=>{const lines=[];let cur='',u=0;[...n.label].forEach(ch=>{const w=ch.charCodeAt(0)>255?2:1;if(u+w>16){lines.push(cur);cur='';u=0}cur+=ch;u+=w});if(cur)lines.push(cur);n.lines=lines;
    const mu=Math.max(...lines.map(units),4);n.w=mu*7+30;n.h=lines.length*17+16;if(n.shape==='diamond'){n.w=n.w*1.5;n.h=n.h*1.7}if(n.w<64)n.w=64;n.r=rank.get(n.id)});
  const layers=[];F.nodes.forEach(n=>{(layers[n.r]=layers[n.r]||[]).push(n)});
  for(let pass=0;pass<4;pass++){const down=pass%2===0;const seq=down?layers.map((_,i)=>i):layers.map((_,i)=>layers.length-1-i);
    seq.forEach(li=>{const L=layers[li];if(!L)return;const pos=n=>L.indexOf(n);const bc=n=>{const nb=(down?inn.get(n.id).map(e=>e.a):out.get(n.id).map(e=>e.b)).map(id=>N.get(id)).filter(m=>m&&m.r!==n.r&&layers[m.r]);
      if(!nb.length)return pos(n);return nb.reduce((p,m)=>p+layers[m.r].indexOf(m),0)/nb.length};L.sort((a,b)=>bc(a)-bc(b)||a.i-b.i)})}
  const tb=dir!=='lr',GAP=tb?56:80,SG=tb?26:22;
  let pp=20;const ext=[];
  layers.forEach(L=>{if(!L)return;const size=Math.max(...L.map(n=>tb?n.h:n.w));let sp=0;L.forEach(n=>{const s=tb?n.w:n.h;n.sp=sp+s/2;sp+=s+SG});const tot=sp-SG;ext.push(tot);L.tot=tot;L.pp=pp+size/2;pp+=size+GAP});
  const maxT=Math.max(...ext,10);
  layers.forEach(L=>{if(!L)return;const off=(maxT-L.tot)/2+30;L.forEach(n=>{const a=L.pp,b=n.sp+off;n.x=tb?b:a;n.y=tb?a:b})});
  const Wd=tb?maxT+60:pp-GAP+40,Ht=tb?pp-GAP+40:maxT+60;
  const hasB=F.edges.some(e=>back.has(e)||N.get(e.a).r>=N.get(e.b).r);return{W:Math.max(Wd+(hasB&&tb?120:0),200),H:Math.max(Ht+(hasB&&!tb?100:0),120),back,tb}}
let FZ=null;
function drawFlow(F,dir){
  const Lx=layoutFlow(F,dir);const N=new Map(F.nodes.map(n=>[n.id,n]));let s='';
  s+='<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="'+DIM+'"/></marker></defs>';
  const off=new Map();
  F.edges.forEach((e,k)=>{const a=N.get(e.a),b=N.get(e.b);let d,mx,my;const isBack=Lx.back.has(e)||a.r>=b.r;
    if(Lx.tb){if(!isBack){const x1=a.x,y1=a.y+a.h/2,x2=b.x,y2=b.y-b.h/2,dy=(y2-y1)/2;d='M'+x1+' '+y1+' C'+x1+' '+(y1+dy)+' '+x2+' '+(y2-dy)+' '+x2+' '+y2;mx=(x1+x2)/2;my=(y1+y2)/2}
      else{const x1=a.x+a.w/2,y1=a.y,x2=b.x+b.w/2,y2=b.y,o=Math.max(a.w,b.w)/2+46;d='M'+x1+' '+y1+' C'+(x1+o)+' '+y1+' '+(x2+o)+' '+y2+' '+x2+' '+y2;mx=Math.max(x1,x2)+o*.75;my=(y1+y2)/2}}
    else{if(!isBack){const x1=a.x+a.w/2,y1=a.y,x2=b.x-b.w/2,y2=b.y,dx=(x2-x1)/2;d='M'+x1+' '+y1+' C'+(x1+dx)+' '+y1+' '+(x2-dx)+' '+y2+' '+x2+' '+y2;mx=(x1+x2)/2;my=(y1+y2)/2}
      else{const x1=a.x,y1=a.y+a.h/2,x2=b.x,y2=b.y+b.h/2,o=Math.max(a.h,b.h)/2+40;d='M'+x1+' '+y1+' C'+x1+' '+(y1+o)+' '+x2+' '+(y2+o)+' '+x2+' '+y2;mx=(x1+x2)/2;my=Math.max(y1,y2)+o*.75}}
    s+='<path d="'+d+'" fill="none" stroke="'+DIM+'" stroke-width="1.6" marker-end="url(#ah)"/>';
    if(e.l){const w=[...e.l].length*12+12;s+='<rect x="'+(mx-w/2)+'" y="'+(my-10)+'" width="'+w+'" height="20" rx="5" fill="'+SURF+'"/><text x="'+mx+'" y="'+(my+4)+'" fill="'+(e.l==='はい'?'#4AE09A':e.l==='いいえ'?'#FF8A8A':INK)+'" font-size="12" font-weight="700" text-anchor="middle">'+X(e.l)+'</text>'}});
  F.nodes.forEach(n=>{const stroke=n.shape==='diamond'?'#F5C842':n.shape==='round'?'#4AE09A':'#4A9EFF',fill=n.shape==='diamond'?'#2a2615':n.shape==='round'?'#16291f':'#222735';let shp;
    if(n.shape==='diamond')shp='<polygon points="'+n.x+','+(n.y-n.h/2)+' '+(n.x+n.w/2)+','+n.y+' '+n.x+','+(n.y+n.h/2)+' '+(n.x-n.w/2)+','+n.y+'"';
    else shp='<rect x="'+(n.x-n.w/2)+'" y="'+(n.y-n.h/2)+'" width="'+n.w+'" height="'+n.h+'" rx="'+(n.shape==='round'?n.h/2:8)+'"';
    s+=shp+' fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
    s+='<text fill="'+INK+'" font-size="13" font-weight="600" text-anchor="middle">'+n.lines.map((ln,i)=>'<tspan x="'+n.x+'" y="'+(n.y-(n.lines.length-1)*8.5+i*17+4.5)+'">'+X(ln)+'</tspan>').join('')+'</text>'});
  return{svg:s,W:Lx.W,H:Lx.H}}
function renderFlow(){
  const t=T();if(!t)return;if(!t.flow)t.flow={text:FLOW_SAMPLE,dir:'tb'};
  if(document.activeElement!==$('ftxt'))$('ftxt').value=t.flow.text;
  const F=parseFlow(t.flow.text);
  if(!F.nodes.length){$('flowBox').innerHTML='<div style="padding:26px;text-align:center;color:'+DIM+'">上の枠に「A -> B」と書くと、ここに図が出ます</div>';return}
  const D=drawFlow(F,t.flow.dir);const bw=Math.max(300,$('flowBox').clientWidth-16);
  if(FZ==null||FZ.k!==t.id){FZ={k:t.id,z:Math.min(1,bw/D.W)}}
  const z=FZ.z;
  $('flowBox').innerHTML='<svg id="fsvg" viewBox="0 0 '+D.W+' '+D.H+'" width="'+Math.round(D.W*z)+'" height="'+Math.round(D.H*z)+'">'+D.svg+'</svg><div style="color:'+DIM+';font-size:12px;padding:4px">'+F.nodes.length+'個の箱 ／ '+F.edges.length+'本の線</div>'}
$('ftxt').addEventListener('input',()=>{const t=T();t.flow=t.flow||{dir:'tb'};t.flow.text=$('ftxt').value;touch();renderFlow()});
$('fDir').onclick=()=>{const t=T();t.flow=t.flow||{text:FLOW_SAMPLE,dir:'tb'};t.flow.dir=t.flow.dir==='lr'?'tb':'lr';FZ=null;touch();renderFlow();toast(t.flow.dir==='lr'?'横向きにしました':'縦向きにしました')};
$('fZi').onclick=()=>{if(FZ){FZ.z=Math.min(3,FZ.z*1.25);renderFlow()}};$('fZo').onclick=()=>{if(FZ){FZ.z=Math.max(.2,FZ.z/1.25);renderFlow()}};
$('fPng').onclick=()=>savePng($('fsvg'),(T().title||'flow')+'-flow');
$('fTbl').onclick=()=>{const t=T(),I=info(t);const lines=I.body.filter(r=>String(r[0]).trim()&&String(r[1]).trim()).map(r=>{const l=I.w>2?String(r[2]).trim():'';return String(r[0]).trim()+(l?' -('+l+')-> ':' -> ')+String(r[1]).trim()});
  if(!lines.length){toast('表の1列目と2列目に「から」「へ」を書いてください');return}
  t.flow=t.flow||{dir:'tb'};t.flow.text=lines.join('\n');touch();$('ftxt').value=t.flow.text;FZ=null;renderFlow();toast('表の1列目→2列目から作りました')};
document.querySelector('#fv .chips').addEventListener('click',e=>{const b=e.target.closest('[data-ins]');if(!b)return;const ta=$('ftxt'),ins=b.dataset.ins==='\\n'?'\n':b.dataset.ins,a=ta.selectionStart,z=ta.selectionEnd;
  ta.value=ta.value.slice(0,a)+ins+ta.value.slice(z);ta.focus();ta.selectionStart=ta.selectionEnd=a+ins.length;ta.dispatchEvent(new Event('input'))});

// ===================== 並べ替え（表の中） =====================
function cmpFor(I,col,dir){const ty=I.types[col];
  const key=r=>{const s=String(r[col]==null?'':r[col]).trim();if(s==='')return null;if(ty==='num'){return num(s)}if(ty==='date'){const g=dparse(s);return g?g.y*10000+g.m*100+g.d:null}return s};
  return (a,b)=>{const x=key(a),y=key(b);if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;const c=typeof x==='number'?x-y:String(x).localeCompare(String(y),'ja');return c*dir}}
let lastSort=null;
$('sT').onclick=()=>{const t=T();if(!t)return;const I=info(t),off=t.header?1:0;if(t.d.length-off<2){toast('並べ替える行がありません');return}
  const dir=(lastSort&&lastSort.id===t.id&&lastSort.c===sel.c&&lastSort.dir===1)?-1:1;lastSort={id:t.id,c:sel.c,dir};
  push();const head=t.d.slice(0,off),body=t.d.slice(off).sort(cmpFor(I,sel.c,dir));t.d=head.concat(body);touch();render();
  toast(I.names[sel.c]+' を'+(I.types[sel.c]==='text'?(dir===1?'あいうえお順':'逆順'):(dir===1?'小さい順':'大きい順'))+'に並べ替えました（もう一度押すと逆）')};

// ===================== 一覧（カード・列の要約・集計表） =====================
const LS={};
function lst(t){return LS[t.id]||(LS[t.id]={mode:'card',q:'',sc:-1,dir:1,fc:-1,fv:[],pg:40,pr:-2,pc:-2,pv:-2,pa:'sum',pp:false})}
function newTable(title,d){const w=Math.max(1,...d.map(r=>r.length));d=d.map(r=>{r=r.slice();while(r.length<w)r.push('');return r});
  const nt={id:uid(),title,d,header:true,at:Date.now()};tables.push(nt);cur=nt.id;hist=[];sel={r:0,c:0};save();VIEW='t';render();window.scrollTo(0,0);toast('新しい表「'+title+'」を作りました')}
async function copyOut(s,msg){try{await navigator.clipboard.writeText(s);toast(msg||'コピーしました（Excel等にそのまま貼れます）')}catch(e){openDlg('コピーしてください',s)}}
const tsvRows=m=>m.map(r=>r.map(v=>String(v).replace(/[\t\n]/g,' ')).join('\t')).join('\n');
function renderList(){const t=T();if(!t)return;const S=lst(t);
  const modes=[['card','🗂 カード'],['prof','🔎 列の要約'],['pivot','🧮 集計表']];
  $('lv').innerHTML='<div class="chips" style="margin-bottom:10px">'+modes.map(([k,l])=>'<button class="chip'+(S.mode===k?' on':'')+'" data-lm="'+k+'">'+l+'</button>').join('')+'</div><div id="lbody"></div>';
  renderLBody()}
function renderLBody(){const t=T();if(!t)return;const S=lst(t),I=info(t),box=$('lbody');if(!box)return;
  if(!I.body.length){box.innerHTML='<div style="padding:30px;text-align:center;color:var(--dim)">表にデータがありません（2行目以降に入力してください）</div>';return}
  if(S.mode==='card'){
    const fcols=I.names.map((_,i)=>i).filter(i=>I.types[i]==='text'&&I.uniq[i].length>=2&&I.uniq[i].length<=30);
    if(S.sc>=I.w)S.sc=-1;if(S.fc>=0&&!fcols.includes(S.fc)){S.fc=-1;S.fv=[]}
    const op=(arr,val)=>arr.map(([k,l])=>'<option value="'+k+'"'+(String(k)===String(val)?' selected':'')+'>'+X(l)+'</option>').join('');
    box.innerHTML='<input class="lin" id="lq" type="search" placeholder="🔍 さがす（どの列でも・空白で複数語）" value="'+X(S.q)+'">'
     +'<div class="ctl" style="margin-top:8px"><div><label>並べ替え</label><select id="lsc">'+op([[-1,'表の順']].concat(I.names.map((n,i)=>[i,n])),S.sc)+'</select></div>'
     +'<div><label>順番</label><select id="lsd">'+op([[1,'小さい・あいうえお順'],[-1,'大きい・逆順']],S.dir)+'</select></div>'
     +'<div style="grid-column:1/3"><label>絞り込む列</label><select id="lfc">'+op([[-1,'絞り込まない']].concat(fcols.map(i=>[i,I.names[i]])),S.fc)+'</select></div></div>'
     +(S.fc>=0?'<div class="chips" style="margin-top:8px">'+I.uniq[S.fc].map((u,k)=>'<button class="chip'+(S.fv.includes(u)?' on':'')+'" data-lfv="'+k+'">'+X(tr(u,12))+'</button>').join('')+'</div>':'')
     +'<div id="lres" style="margin-top:10px"></div>';renderCards()}
  else if(S.mode==='prof'){box.innerHTML=profHtml(t)}
  else renderPivot()}
function listRows(t,S){const I=info(t),off=t.header?1:0;let ix=I.body.map((_,i)=>i);const terms=S.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if(terms.length)ix=ix.filter(i=>{const line=I.body[i].join('\u0001').toLowerCase();return terms.every(w=>line.includes(w))});
  if(S.fc>=0&&S.fv.length)ix=ix.filter(i=>S.fv.includes(String(I.body[i][S.fc]==null?'':I.body[i][S.fc]).trim()));
  if(S.sc>=0){const cf=cmpFor(I,S.sc,S.dir);ix.sort((a,b)=>cf(I.body[a],I.body[b]))}
  return{I,off,ix}}
function renderCards(){const t=T(),box=$('lres');if(!t||!box)return;const S=lst(t),{I,off,ix}=listRows(t,S);
  let h='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><span style="flex:1;color:var(--gold);font-size:14px;font-weight:700">'+I.body.length+'件中 '+ix.length+'件</span><button data-lcopy>📋 コピー</button><button data-lnew>＋ この結果を新しい表に</button></div>';
  if(!ix.length)h+='<div style="padding:24px;text-align:center;color:var(--dim)">見つかりません。ことばを変えるか、絞り込みを外してください。</div>';
  h+=ix.slice(0,S.pg).map(i=>{const r=I.body[i],title=String(r[0]==null?'':r[0]).trim()||('（'+(i+1+off)+'行目）');
    const kv=r.map((v,c)=>{const s=String(v==null?'':v).trim();return(c===0||s==='')?'':'<div class="kv"><span>'+X(I.names[c])+'</span><em>'+X(s)+'</em></div>'}).join('');
    return '<div class="lcard" data-lcard="'+(i+off)+'"><b>'+X(title)+'</b>'+kv+'</div>'}).join('');
  if(ix.length>S.pg)h+='<button class="pri" data-lmore style="width:100%">さらに表示（残り '+(ix.length-S.pg)+'件）</button>';
  h+='<div style="font-size:12px;color:var(--dim);margin-top:8px">カードをタップすると、表のその行に移動します。</div>';box.innerHTML=h}
function spark(xs){const mn=xs[0],mx=xs[xs.length-1];if(mn===mx)return'';const nb=10,b=Array(nb).fill(0);xs.forEach(x=>{b[Math.min(nb-1,Math.floor((x-mn)/(mx-mn)*nb))]++});const m=Math.max(...b);
  return '<svg viewBox="0 0 100 30" width="100%" height="34" preserveAspectRatio="none" style="margin-top:6px">'+b.map((n,i)=>'<rect x="'+(i*10+.5)+'" y="'+(30-n/m*28)+'" width="9" height="'+(n/m*28)+'" rx="1" fill="'+PAL[0]+'"/>').join('')+'</svg>'}
function profHtml(t){const I=info(t),N=I.body.length;let h='<div style="font-size:12px;color:var(--dim);margin-bottom:8px">列ごとの中身を一目で確認できます。空欄が多い列や、数字のつもりが文字になっている列を見つけるのに便利です。</div>';
  I.names.forEach((n,i)=>{const vals=I.body.map(r=>String(r[i]==null?'':r[i]).trim()),filled=vals.filter(x=>x!==''),empty=N-filled.length,ty=I.types[i],tl={num:'数字',date:'日付',text:'文字'}[ty];let b='',btn='';
    if(ty==='num'){const xs=filled.map(num).filter(z=>z!=null).sort((a,b)=>a-b);if(xs.length){const sum=xs.reduce((p,c)=>p+c,0),mid=xs.length%2?xs[(xs.length-1)/2]:(xs[xs.length/2-1]+xs[xs.length/2])/2;
      b='<div class="kvs">合計 <b>'+fmt(sum)+'</b>　平均 <b>'+fmt(sum/xs.length)+'</b>　中央値 <b>'+fmt(mid)+'</b><br>最小 <b>'+fmt(xs[0])+'</b>　最大 <b>'+fmt(xs[xs.length-1])+'</b></div>'+spark(xs);btn='<button data-pg="hist:'+i+'">📊 度数分布で見る</button>'}
      if(xs.length<filled.length)b+='<div class="kvs" style="color:var(--gold)">数字として読めないセルが '+(filled.length-xs.length)+'個 あります</div>'}
    else if(ty==='date'){const ds=filled.map(x=>dparse(x)).filter(Boolean).sort((a,b)=>(a.y*10000+a.m*100+a.d)-(b.y*10000+b.m*100+b.d));
      if(ds.length){const f=g=>g.y+'/'+g.m+'/'+g.d;b='<div class="kvs">期間 <b>'+f(ds[0])+'</b> 〜 <b>'+f(ds[ds.length-1])+'</b></div>';btn='<button data-pg="trend:'+i+'">📈 推移で見る</button>'}}
    else{const cnt=new Map();filled.forEach(x=>cnt.set(x,(cnt.get(x)||0)+1));const top=[...cnt].sort((a,b)=>b[1]-a[1]).slice(0,5),mx=top.length?top[0][1]:1;
      b=top.map(([k,c])=>'<div class="tbar"><span>'+X(tr(k,12))+'</span><i style="width:'+Math.max(3,c/mx*45)+'%"></i><em>'+c+'</em></div>').join('');
      if(I.uniq[i].length>=2&&I.uniq[i].length<=60)btn='<button data-pg="cnt:'+i+'">📊 内訳で見る</button>'}
    h+='<div class="lcard"><b>'+X(n)+' <small style="color:var(--dim);font-weight:400">'+tl+'</small></b><div class="kvs">入力 '+filled.length+'/'+N+(empty?'　<span style="color:var(--gold)">空欄 '+empty+'</span>':'')+'　種類 '+I.uniq[i].length+'</div>'+b+(btn?'<div style="margin-top:6px">'+btn+'</div>':'')+'</div>'});
  return h}
function goChart(kind,i){const t=T(),I=info(t),nums=I.types.map((x,k)=>x==='num'?k:-1).filter(k=>k>=0),val=nums.length?nums[0]:-1;
  const v={cat:i,val,agg:val>=0?'sum':'count',type:'bar',ser:-1,sort:'val',gran:'m',sl:{}};
  if(kind==='hist'){v.type='hist';if(nums.includes(i)&&nums.length>1)v.val=nums.find(k=>k!==i)}
  else if(kind==='trend'){v.type='line';v.sort='orig';const g=I.body.map(r=>dparse(r[i])).filter(Boolean),sp=g.length?(Math.max(...g.map(z=>z.y*12+z.m))-Math.min(...g.map(z=>z.y*12+z.m))):0;v.gran=sp>=2?'m':'d'}
  else{v.val=-1;v.agg='count';v.type=I.uniq[i].length>8?'hbar':'bar'}
  t.view=v;touch();VIEW='c';applyView();window.scrollTo(0,0)}
// ---- 集計表（クロス集計）
function pivCols(I){return I.names.map((_,i)=>i).filter(i=>I.types[i]==='date'||(I.types[i]==='text'&&I.uniq[i].length>=2&&I.uniq[i].length<=60))}
function pivCalc(t,S){const I=info(t),cs=pivCols(I),nums=I.types.map((x,i)=>x==='num'?i:-1).filter(i=>i>=0);
  if(S.pr===-2||(S.pr>=0&&!cs.includes(S.pr)))S.pr=cs.length?cs[0]:-1;
  if(S.pc===-2)S.pc=cs.find(i=>i!==S.pr&&I.types[i]!=='date'&&I.uniq[i].length<=12)??-1;
  if(S.pc>=0&&(S.pc===S.pr||!cs.includes(S.pc)||I.types[S.pc]==='date'))S.pc=-1;
  if(S.pv===-2||S.pv>=I.w)S.pv=nums.length?nums[0]:-1;if(S.pv>=0&&I.types[S.pv]!=='num')S.pv=nums.length?nums[0]:-1;
  if(S.pr<0)return{I,cs,nums,none:true};
  const useCnt=S.pv<0||S.pa==='count',cells=new Map(),rA=new Map(),cA=new Map(),all=[];
  const put=(m,k,x)=>{if(!m.has(k))m.set(k,[]);m.get(k).push(x)};
  I.body.forEach(r=>{const a=bk(I,r,S.pr,'m'),b=S.pc>=0?bk(I,r,S.pc,'m'):'合計',x=useCnt?1:num(r[S.pv]);put(cells,a+'\u0001'+b,x);put(rA,a,x);put(cA,b,x);all.push(x)});
  const ag=arr=>{if(!arr)return null;if(useCnt)return arr.length;const x=arr.filter(z=>z!=null);if(!x.length)return null;return S.pa==='sum'?x.reduce((p,c)=>p+c,0):S.pa==='avg'?x.reduce((p,c)=>p+c,0)/x.length:S.pa==='max'?Math.max(...x):Math.min(...x)};
  const dt=ty=>ty==='date';let rows=[...rA.keys()],cols=[...cA.keys()];
  if(dt(I.types[S.pr]))rows.sort();else rows.sort((a,b)=>(ag(rA.get(b))||0)-(ag(rA.get(a))||0));
  cols.sort((a,b)=>(ag(cA.get(b))||0)-(ag(cA.get(a))||0));
  const capR=rows.length>60,capC=cols.length>12;if(capR)rows=rows.slice(0,60);if(capC)cols=cols.slice(0,12);
  return{I,cs,nums,rows,cols,capR,capC,cell:(a,b)=>ag(cells.get(a+'\u0001'+b)),rt:a=>ag(rA.get(a)),ct:b=>ag(cA.get(b)),grand:ag(all),useCnt}}
function pivMatrix(P,S){const m=[],rn=P.I.names[S.pr],tot=S.pc>=0;
  m.push([rn+(tot?' ＼ '+P.I.names[S.pc]:'')].concat(P.cols).concat(tot?['合計']:[]));
  const rd=x=>x==null?'':+(+x).toFixed(2);
  P.rows.forEach(a=>m.push([a].concat(P.cols.map(b=>rd(P.cell(a,b)))).concat(tot?[rd(P.rt(a))]:[])));
  if(P.rows.length>1||tot)m.push(['合計'].concat(P.cols.map(b=>rd(P.ct(b)))).concat(tot?[rd(P.grand)]:[]));return m}
function renderPivot(){const t=T(),S=lst(t),box=$('lbody'),P=pivCalc(t,S);
  if(P.none){box.innerHTML='<div style="padding:30px;text-align:center;color:var(--dim)">集計表にできる列（日付、または2〜60種類の文字の列）がありません</div>';return}
  const I=P.I,op=(arr,val)=>arr.map(([k,l])=>'<option value="'+k+'"'+(String(k)===String(val)?' selected':'')+'>'+X(l)+'</option>').join('');
  const canPct=S.pa==='sum'||S.pa==='count'||P.useCnt;if(!canPct)S.pp=false;
  let h='<div style="font-size:12px;color:var(--dim);margin-bottom:8px">「行」と「列」を選ぶと、交差するところの合計などが一覧表になります（ピボットテーブル）。</div>'
   +'<div class="ctl"><div><label>行（縦に並べる）</label><select id="prr">'+op(P.cs.map(i=>[i,I.names[i]]),S.pr)+'</select></div>'
   +'<div><label>列（横に並べる）</label><select id="prc">'+op([[-1,'なし（1列だけ）']].concat(P.cs.filter(i=>i!==S.pr&&I.types[i]!=='date').map(i=>[i,I.names[i]])),S.pc)+'</select></div>'
   +'<div><label>値</label><select id="prv">'+op([[-1,'件数だけ数える']].concat(P.nums.map(i=>[i,I.names[i]])),S.pv)+'</select></div>'
   +'<div><label>集計</label><select id="pra">'+op([['sum','合計'],['avg','平均'],['count','件数'],['max','最大'],['min','最小']],S.pa)+'</select></div></div>'
   +'<label style="display:block;margin:8px 0;font-size:14px"><input type="checkbox" id="ppp"'+(S.pp?' checked':'')+(canPct?'':' disabled')+'> 行ごとの割合（％）で表示</label>';
  const tot=S.pc>=0;let mx=0;P.rows.forEach(a=>P.cols.forEach(b=>{const x=P.cell(a,b);if(x!=null)mx=Math.max(mx,Math.abs(x))}));
  const show=(x,base)=>x==null?'':(S.pp&&base?Math.round(x/base*100)+'%':fmt(x));
  h+='<div class="pv"><table><tr><th>'+X(I.names[S.pr])+(tot?' ＼ '+X(tr(I.names[S.pc],6)):'')+'</th>'+P.cols.map(c=>'<th>'+X(tr(c,8))+'</th>').join('')+(tot?'<th>合計</th>':'')+'</tr>';
  P.rows.forEach(a=>{const rt=P.rt(a);h+='<tr><td>'+X(tr(a,10))+'</td>'+P.cols.map(b=>{const x=P.cell(a,b),al=(x!=null&&mx)?(.08+.5*Math.abs(x)/mx):0;
      return '<td style="'+(al?'background:rgba('+(x<0?'255,107,107':'74,158,255')+','+al.toFixed(2)+')':'')+'">'+show(x,rt)+'</td>'}).join('')+(tot?'<td><b>'+(S.pp?'100%':fmt(rt))+'</b></td>':'')+'</tr>'});
  if(P.rows.length>1||tot)h+='<tr><td><b>合計</b></td>'+P.cols.map(b=>'<td><b>'+show(P.ct(b),P.grand)+'</b></td>').join('')+(tot?'<td><b>'+(S.pp?'100%':fmt(P.grand))+'</b></td>':'')+'</tr>';
  h+='</table></div>'+((P.capR||P.capC)?'<div style="font-size:12px;color:var(--dim);margin-top:6px">※ 多いので'+(P.capR?'行は先頭60':'')+(P.capR&&P.capC?'、':'')+(P.capC?'列は上位12':'')+'までを表示しています</div>':'');
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button data-pcopy>📋 コピー</button><button data-pnew>＋ 新しい表にする</button><button data-pchart class="pri">📊 グラフにする</button></div>';
  box.innerHTML=h}
$('lv').addEventListener('click',e=>{const t=T();if(!t)return;const S=lst(t);let b;
  if(b=e.target.closest('[data-lm]')){S.mode=b.dataset.lm;renderList();return}
  if(b=e.target.closest('[data-lfv]')){const u=info(t).uniq[S.fc][+b.dataset.lfv];S.fv=S.fv.includes(u)?S.fv.filter(x=>x!==u):S.fv.concat([u]);S.pg=40;renderLBody();return}
  if(b=e.target.closest('[data-lmore]')){S.pg+=40;renderCards();return}
  if(b=e.target.closest('[data-lcopy],[data-lnew]')){const {I,ix}=listRows(t,S),m=[I.names].concat(ix.map(i=>I.body[i]));
    if(b.hasAttribute('data-lcopy'))copyOut(tsvRows(m));else newTable((t.title||'表')+'（絞り込み）',m);return}
  if(b=e.target.closest('[data-lcard]')){sel={r:+b.dataset.lcard,c:0};VIEW='t';render();setTimeout(()=>{const td=document.querySelector('#tb td.sel');if(td)td.scrollIntoView({block:'center',inline:'nearest'})},30);return}
  if(b=e.target.closest('[data-pg]')){const [k,i]=b.dataset.pg.split(':');goChart(k,+i);return}
  if(b=e.target.closest('[data-pcopy],[data-pnew],[data-pchart]')){const P=pivCalc(t,S);if(P.none)return;
    if(b.hasAttribute('data-pcopy'))copyOut(tsvRows(pivMatrix(P,S)));
    else if(b.hasAttribute('data-pnew'))newTable((t.title||'表')+'の集計',pivMatrix(P,S));
    else{const dt=P.I.types[S.pr]==='date',two=S.pc>=0;t.view={cat:S.pr,val:S.pv,agg:S.pv<0?'count':S.pa,type:two?'stack':(dt?'line':'bar'),ser:two?S.pc:-1,sort:dt?'orig':'val',gran:'m',sl:{}};touch();VIEW='c';applyView();window.scrollTo(0,0)}}});
$('lv').addEventListener('change',e=>{const t=T();if(!t)return;const S=lst(t),id=e.target.id,v=e.target.value;
  if(id==='lsc'){S.sc=+v;renderCards()}else if(id==='lsd'){S.dir=+v;renderCards()}else if(id==='lfc'){S.fc=+v;S.fv=[];S.pg=40;renderLBody()}
  else if(id==='prr'){S.pr=+v;renderPivot()}else if(id==='prc'){S.pc=+v;renderPivot()}else if(id==='prv'){S.pv=+v;renderPivot()}
  else if(id==='pra'){S.pa=v;renderPivot()}else if(id==='ppp'){S.pp=e.target.checked;renderPivot()}});
$('lv').addEventListener('input',e=>{if(e.target.id!=='lq')return;const t=T();if(!t)return;const S=lst(t);S.q=e.target.value;S.pg=40;renderCards()});

// ===================== 株価分析（移動平均・ボリンジャー・一目・フィボナッチ・RSI・MACD ほか） =====================
const SK_DEF=()=>({map:null,range:120,tf:'d',sma:[5,25,75],ema:[],bb:false,ichi:false,fib:true,fx:false,fr:false,vol:true,rsi:true,macd:false,sto:false,jp:true,cal:{cap:1000000,risk:2,entry:'',stop:'',tgt:'',unit:100,fills:''}});
const SKC=['#F5C842','#4AE09A','#ff8c42','#b38cff'];
function stkOf(t){if(!t.stk)t.stk=SK_DEF();const S=t.stk,I=info(t);
  if(!S.map||Object.values(S.map).some(x=>x>=I.w)){const used=new Set(),pick=(re,exact)=>{const i=I.names.findIndex((n,k)=>!used.has(k)&&re.test(n));if(i>=0)used.add(i);return i};
    const m={};let d=I.types.indexOf('date');if(d<0)d=pick(/日付|年月日|date|日時/i);used.add(d);m.d=d;
    m.o=pick(/始値|open/i);m.h=pick(/高値|high/i);m.l=pick(/安値|low/i);m.c=pick(/終値|close/i);if(m.c<0)m.c=pick(/株価|価格|price|値/i);
    if(m.c<0){const nu=I.types.map((x,i)=>x==='num'&&!used.has(i)?i:-1).filter(i=>i>=0);m.c=nu.length?nu[0]:-1;if(m.c>=0)used.add(m.c)}
    m.v=pick(/出来高|volume|vol/i);S.map=m}
  return S}
function skRows(t,S){const I=info(t),m=S.map;if(m.d<0||m.c<0)return[];
  let r=I.body.map(x=>{const d=dparse(x[m.d]),c=num(x[m.c]);if(!d||c==null)return null;const g=k=>m[k]>=0?num(x[m[k]]):null;
    const o=g('o'),h=g('h'),l=g('l');return{d,key:d.y*10000+d.m*100+d.d,o:o==null?c:o,h:h==null?Math.max(c,o==null?c:o):h,l:l==null?Math.min(c,o==null?c:o):l,c,v:g('v')||0}}).filter(Boolean);
  r.sort((a,b)=>a.key-b.key);
  if(S.tf!=='d'){const G=new Map();r.forEach(x=>{let k;if(S.tf==='m')k=x.d.y*100+x.d.m;else{const ts=Date.UTC(x.d.y,x.d.m-1,x.d.d),wd=new Date(ts).getUTCDay();k=ts-((wd+6)%7)*864e5}
      const g=G.get(k);if(!g)G.set(k,{d:x.d,key:x.key,o:x.o,h:x.h,l:x.l,c:x.c,v:x.v});else{g.h=Math.max(g.h,x.h);g.l=Math.min(g.l,x.l);g.c=x.c;g.v+=x.v;g.d=x.d;g.key=x.key}});r=[...G.values()]}
  return r}
// --- 指標の計算
function skSma(a,n){const o=Array(a.length).fill(null);for(let i=n-1;i<a.length;i++){let s=0,ok=true;for(let j=i-n+1;j<=i;j++){if(a[j]==null){ok=false;break}s+=a[j]}if(ok)o[i]=s/n}return o}
function skEma(a,n){const o=Array(a.length).fill(null),k=2/(n+1);let cnt=0,s=0,prev=null;for(let i=0;i<a.length;i++){if(a[i]==null)continue;if(prev==null){s+=a[i];cnt++;if(cnt===n){prev=s/n;o[i]=prev}}else{prev=a[i]*k+prev*(1-k);o[i]=prev}}return o}
function skBb(c,n,k){const m=skSma(c,n),u=Array(c.length).fill(null),l=Array(c.length).fill(null);for(let i=n-1;i<c.length;i++){let v=0;for(let j=i-n+1;j<=i;j++)v+=(c[j]-m[i])**2;const sd=Math.sqrt(v/n);u[i]=m[i]+k*sd;l[i]=m[i]-k*sd}return{m,u,l}}
function skRsi(c,n){const o=Array(c.length).fill(null);if(c.length<=n)return o;let g=0,l=0;for(let i=1;i<=n;i++){const d=c[i]-c[i-1];if(d>=0)g+=d;else l-=d}g/=n;l/=n;o[n]=l===0?100:100-100/(1+g/l);
  for(let i=n+1;i<c.length;i++){const d=c[i]-c[i-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n;o[i]=l===0?100:100-100/(1+g/l)}return o}
function skMacd(c){const a=skEma(c,12),b=skEma(c,26),m=c.map((_,i)=>a[i]!=null&&b[i]!=null?a[i]-b[i]:null),s=skEma(m,9);return{m,s,h:m.map((x,i)=>x!=null&&s[i]!=null?x-s[i]:null)}}
function skSto(R,n){const k=Array(R.length).fill(null);for(let i=n-1;i<R.length;i++){let hh=-Infinity,ll=Infinity;for(let j=i-n+1;j<=i;j++){hh=Math.max(hh,R[j].h);ll=Math.min(ll,R[j].l)}k[i]=hh===ll?50:(R[i].c-ll)/(hh-ll)*100}const sk=skSma(k,3);return{k:sk,d:skSma(sk,3)}}
function skAtr(R,n){const o=Array(R.length).fill(null);if(R.length<=n)return o;const tr=i=>Math.max(R[i].h-R[i].l,Math.abs(R[i].h-R[i-1].c),Math.abs(R[i].l-R[i-1].c));let a=0;for(let i=1;i<=n;i++)a+=tr(i);a/=n;o[n]=a;for(let i=n+1;i<R.length;i++){a=(a*(n-1)+tr(i))/n;o[i]=a}return o}
function skIchi(R){const N=R.length,hl=(i,n)=>{if(i<n-1)return null;let h=-Infinity,l=Infinity;for(let j=i-n+1;j<=i;j++){h=Math.max(h,R[j].h);l=Math.min(l,R[j].l)}return(h+l)/2};
  const tk=R.map((_,i)=>hl(i,9)),kj=R.map((_,i)=>hl(i,26)),sa=Array(N+26).fill(null),sb=Array(N+26).fill(null);
  for(let i=0;i<N;i++){if(tk[i]!=null&&kj[i]!=null)sa[i+26]=(tk[i]+kj[i])/2;const b=hl(i,52);if(b!=null)sb[i+26]=b}return{tk,kj,sa,sb}}
function skCalc(t,S){const R=skRows(t,S);if(R.length<2)return null;const N=R.length,c=R.map(x=>x.c),n=Math.min(S.range||N,N),start=N-n;
  const C={R,N,n,start,c,sma:S.sma.map(p=>skSma(c,p)),ema:S.ema.map(p=>skEma(c,p)),bb:skBb(c,20,2),rsi:skRsi(c,14),macd:skMacd(c),sto:skSto(R,14),atr:skAtr(R,14),ichi:skIchi(R)};
  // フィボナッチ：表示期間の最高値・最安値
  let hi=-Infinity,lo=Infinity,hiI=0,loI=0;for(let i=start;i<N;i++){if(R[i].h>hi){hi=R[i].h;hiI=i}if(R[i].l<lo){lo=R[i].l;loI=i}}
  let up=loI<hiI;if(S.fr)up=!up;const rg=hi-lo,rl=[0,.236,.382,.5,.618,.786,1],ex=[1.272,1.618,2.618];
  const lv=r=>up?(r<=1?hi-rg*r:lo+rg*r):(r<=1?lo+rg*r:hi-rg*r);
  C.fib={hi,lo,hiI,loI,up,rg,levels:rl.map(r=>({r,p:lv(r),ex:false})).concat(S.fx?ex.map(r=>({r,p:lv(r),ex:true})):[])};
  // クロス（短期×長期の移動平均）
  C.cross=[];if(S.sma.length>=2){const ps=S.sma.map((p,i)=>[p,i]).sort((a,b)=>a[0]-b[0]),sh=C.sma[ps[0][1]],lg=C.sma[ps[1][1]];C.crossN=[ps[0][0],ps[1][0]];
    for(let i=1;i<N;i++){if(sh[i]==null||lg[i]==null||sh[i-1]==null||lg[i-1]==null)continue;if(sh[i-1]<=lg[i-1]&&sh[i]>lg[i])C.cross.push({i,t:'GC'});else if(sh[i-1]>=lg[i-1]&&sh[i]<lg[i])C.cross.push({i,t:'DC'})}}
  return C}
const skPf=x=>x==null||isNaN(x)?'':(Math.abs(x)>=1000?Math.round(x).toLocaleString('ja-JP'):(+(+x).toFixed(2)).toLocaleString('ja-JP'));
const skDs=(d,y)=>y?String(d.y).slice(2)+'/'+d.m:d.m+'/'+d.d;
function skPath(arr,start,n,cx,py){let d='',pen=false;for(let i=0;i<n;i++){const v=arr[start+i];if(v==null){pen=false;continue}d+=(pen?'L':'M')+cx(i).toFixed(1)+' '+py(v).toFixed(1)+' ';pen=true}return d.trim()}
function skDraw(t,S,C,W){const{R,N,n,start}=C,jp=S.jp,UP=jp?'#ff5c5c':'#2fd08a',DN=jp?'#4a9eff':'#ff5c5c';
  const L=6,Rr=58,Tp=8,slots=n+(S.ichi?26:0),band=(W-L-Rr)/slots,cx=i=>L+band*(i+.5),MH=300,GAP=16;
  const hasC=R.some(x=>x.o!==x.c||x.h!==x.c||x.l!==x.c)&&S.map.o>=0;
  let svg='',y=Tp;const sh=a=>{const o=[];for(let i=0;i<n;i++)o.push(a[start+i])};
  // メインの縦軸
  const vals=[];for(let i=start;i<N;i++){vals.push(R[i].h,R[i].l)}
  const ov=[];C.sma.forEach(a=>ov.push(a));C.ema.forEach(a=>ov.push(a));if(S.bb){ov.push(C.bb.u,C.bb.l)}
  ov.forEach(a=>{for(let i=start;i<N;i++)if(a[i]!=null)vals.push(a[i])});
  if(S.ichi){[C.ichi.tk,C.ichi.kj,C.ichi.sa,C.ichi.sb].forEach(a=>{for(let i=start;i<Math.min(a.length,N+26);i++)if(a[i]!=null)vals.push(a[i])})}
  if(S.fib)C.fib.levels.forEach(l=>vals.push(l.p));
  let lo=Math.min(...vals),hi=Math.max(...vals);const pd=(hi-lo)*.04||1;const sc=niceScale(lo-pd,hi+pd,5);
  const py=v=>y+(1-(v-sc.lo)/(sc.hi-sc.lo))*MH;
  svg+=sc.ticks.map(v=>`<line x1="${L}" x2="${W-Rr}" y1="${py(v)}" y2="${py(v)}" stroke="${GRID}"/><text x="${W-Rr+4}" y="${py(v)+4}" fill="${DIM}" font-size="11">${skPf(v)}</text>`).join('');
  // 一目均衡表の雲
  if(S.ichi){const sa=C.ichi.sa,sb=C.ichi.sb;for(let i=0;i<slots-1;i++){const k=start+i,a0=sa[k],b0=sb[k],a1=sa[k+1],b1=sb[k+1];if(a0==null||b0==null||a1==null||b1==null)continue;
      svg+=`<path d="M${cx(i)} ${py(a0)} L${cx(i+1)} ${py(a1)} L${cx(i+1)} ${py(b1)} L${cx(i)} ${py(b0)}Z" fill="${(a0+a1)>=(b0+b1)?'rgba(255,92,92,.16)':'rgba(74,158,255,.16)'}"/>`}
    const ln=(a,col)=>{let d='',pen=false;for(let i=0;i<slots;i++){const v=a[start+i];if(v==null){pen=false;continue}d+=(pen?'L':'M')+cx(i).toFixed(1)+' '+py(v).toFixed(1)+' ';pen=true}svg+=`<path d="${d.trim()}" fill="none" stroke="${col}" stroke-width="1.4"/>`};
    ln(C.ichi.sa,'rgba(255,92,92,.7)');ln(C.ichi.sb,'rgba(74,158,255,.7)');ln(C.ichi.tk,'#ff8c42');ln(C.ichi.kj,'#b38cff')}
  // ボリンジャー
  if(S.bb){let d='',e='';for(let i=0;i<n;i++){const u=C.bb.u[start+i];if(u==null)continue;d+=(d?'L':'M')+cx(i).toFixed(1)+' '+py(u).toFixed(1)+' '}
    for(let i=n-1;i>=0;i--){const l=C.bb.l[start+i];if(l==null)continue;e+='L'+cx(i).toFixed(1)+' '+py(l).toFixed(1)+' '}
    if(d&&e)svg+=`<path d="${d}${e}Z" fill="rgba(74,158,255,.09)" stroke="none"/>`;
    svg+=`<path d="${skPath(C.bb.u,start,n,cx,py)}" fill="none" stroke="#4A9EFF" stroke-width="1" opacity=".8"/><path d="${skPath(C.bb.l,start,n,cx,py)}" fill="none" stroke="#4A9EFF" stroke-width="1" opacity=".8"/>`}
  // フィボナッチ
  if(S.fib){const F=C.fib;if(F.hiI>=start&&F.loI>=start)svg+=`<line x1="${cx(F.loI-start)}" y1="${py(F.lo)}" x2="${cx(F.hiI-start)}" y2="${py(F.hi)}" stroke="#F5C842" stroke-dasharray="2 4" opacity=".7"/>`;
    F.levels.forEach(l=>{const yy=py(l.p),hot=l.r===.382||l.r===.5||l.r===.618;svg+=`<line x1="${L}" x2="${W-Rr}" y1="${yy}" y2="${yy}" stroke="#F5C842" stroke-width="${hot?1.4:1}" stroke-dasharray="${l.ex?'2 3':'6 4'}" opacity="${hot?.9:.55}"/><text x="${L+3}" y="${yy-3}" fill="#F5C842" font-size="10" style="paint-order:stroke;stroke:#181b24;stroke-width:3px">${(l.r*100).toFixed(1)}%　${skPf(l.p)}</text>`})}
  // 価格
  if(hasC){R.slice(start).forEach((r,i)=>{const col=r.c>=r.o?UP:DN,x=cx(i),bw=Math.max(1,band*.68);
      svg+=`<line x1="${x}" x2="${x}" y1="${py(r.h)}" y2="${py(r.l)}" stroke="${col}" stroke-width="1"/><rect x="${x-bw/2}" y="${Math.min(py(r.o),py(r.c))}" width="${bw}" height="${Math.max(1,Math.abs(py(r.o)-py(r.c)))}" fill="${col}"/>`})}
  else{const p=R.slice(start).map((r,i)=>(i?'L':'M')+cx(i).toFixed(1)+' '+py(r.c).toFixed(1)).join(' ');svg+=`<path d="${p}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`}
  // 移動平均
  C.sma.forEach((a,k)=>{svg+=`<path d="${skPath(a,start,n,cx,py)}" fill="none" stroke="${SKC[k%4]}" stroke-width="1.6"/>`});
  C.ema.forEach((a,k)=>{svg+=`<path d="${skPath(a,start,n,cx,py)}" fill="none" stroke="${SKC[(k+2)%4]}" stroke-width="1.4" stroke-dasharray="5 3"/>`});
  // GC/DC
  if(n<=300)C.cross.forEach(x=>{if(x.i<start)return;const i=x.i-start,r=R[x.i];svg+=x.t==='GC'?`<text x="${cx(i)}" y="${py(r.l)+13}" fill="#4AE09A" font-size="10" text-anchor="middle">▲GC</text>`:`<text x="${cx(i)}" y="${py(r.h)-5}" fill="#FF6B6B" font-size="10" text-anchor="middle">▼DC</text>`});
  // 現在値ライン
  const last=R[N-1];svg+=`<line x1="${L}" x2="${W-Rr}" y1="${py(last.c)}" y2="${py(last.c)}" stroke="${INK}" stroke-width=".8" stroke-dasharray="3 3" opacity=".6"/><rect x="${W-Rr+1}" y="${py(last.c)-9}" width="${Rr-2}" height="18" rx="3" fill="${INK}"/><text x="${W-Rr+4}" y="${py(last.c)+4}" fill="#111" font-size="11" font-weight="700">${skPf(last.c)}</text>`;
  y+=MH;
  // サブパネル
  const sub=(h,label,lo2,hi2,ticks,fn)=>{y+=GAP;const y0=y,p2=v=>y0+(1-(v-lo2)/(hi2-lo2))*h;svg+=`<line x1="${L}" x2="${W-Rr}" y1="${y0}" y2="${y0}" stroke="${GRID}"/><text x="${L+3}" y="${y0+12}" fill="${DIM}" font-size="11">${label}</text>`;
    svg+=ticks.map(v=>`<line x1="${L}" x2="${W-Rr}" y1="${p2(v)}" y2="${p2(v)}" stroke="${GRID}" stroke-dasharray="3 4"/><text x="${W-Rr+4}" y="${p2(v)+4}" fill="${DIM}" font-size="10">${v>=1e4?fmt(v):skPf(v)}</text>`).join('');fn(p2,y0,h);y+=h};
  if(S.vol){const vs=R.slice(start).map(r=>r.v),mx=Math.max(...vs,1);sub(54,'出来高',0,mx,[mx],(p2,y0,h)=>{R.slice(start).forEach((r,i)=>{const pc=(start+i)>0?R[start+i-1].c:r.o,col=r.c>=pc?UP:DN;svg+=`<rect x="${cx(i)-Math.max(1,band*.68)/2}" y="${p2(r.v)}" width="${Math.max(1,band*.68)}" height="${Math.max(0,y0+h-p2(r.v))}" fill="${col}" opacity=".65"/>`})})}
  if(S.rsi){const v=C.rsi[N-1];sub(84,'RSI(14)　'+(v==null?'':v.toFixed(1)),0,100,[30,70],(p2)=>{svg+=`<path d="${skPath(C.rsi,start,n,cx,p2)}" fill="none" stroke="#b38cff" stroke-width="1.6"/>`})}
  if(S.macd){const a=[...C.macd.m,...C.macd.s,...C.macd.h].filter(x=>x!=null).slice(-n*3),mm=Math.max(...a.map(Math.abs),1e-9)*1.1;sub(96,'MACD(12,26,9)',-mm,mm,[0],(p2)=>{
      for(let i=0;i<n;i++){const h=C.macd.h[start+i];if(h==null)continue;svg+=`<rect x="${cx(i)-Math.max(1,band*.6)/2}" y="${Math.min(p2(h),p2(0))}" width="${Math.max(1,band*.6)}" height="${Math.max(1,Math.abs(p2(h)-p2(0)))}" fill="${h>=0?UP:DN}" opacity=".55"/>`}
      svg+=`<path d="${skPath(C.macd.m,start,n,cx,p2)}" fill="none" stroke="#4A9EFF" stroke-width="1.5"/><path d="${skPath(C.macd.s,start,n,cx,p2)}" fill="none" stroke="#ff8c42" stroke-width="1.5"/>`})}
  if(S.sto){const k=C.sto.k[N-1];sub(84,'ストキャス(14,3,3)　%K '+(k==null?'':k.toFixed(0)),0,100,[20,80],(p2)=>{svg+=`<path d="${skPath(C.sto.k,start,n,cx,p2)}" fill="none" stroke="#4A9EFF" stroke-width="1.5"/><path d="${skPath(C.sto.d,start,n,cx,p2)}" fill="none" stroke="#ff8c42" stroke-width="1.5"/>`})}
  // 日付の軸
  const every=Math.max(1,Math.ceil(n/5)),yy=n>200||S.tf==='m';y+=4;
  for(let i=0;i<n;i+=every)svg+=`<text x="${cx(i)}" y="${y+14}" fill="${DIM}" font-size="11" text-anchor="middle">${skDs(R[start+i].d,yy)}</text>`;
  const H=y+22,top=Tp;
  // タップで値を表示
  for(let i=0;i<n;i++){const k=start+i,r=R[k],pr=k>0?R[k-1].c:null,df=pr!=null?r.c-pr:null;
    const parts=[r.d.y+'/'+r.d.m+'/'+r.d.d,hasC?'始'+skPf(r.o)+' 高'+skPf(r.h)+' 安'+skPf(r.l)+' 終'+skPf(r.c):'終値'+skPf(r.c)];
    if(df!=null)parts.push((df>=0?'+':'')+skPf(df)+'（'+(df>=0?'+':'')+(df/pr*100).toFixed(2)+'%）');if(r.v)parts.push('出来高'+r.v.toLocaleString('ja-JP'));
    S.sma.forEach((p,j)=>{if(C.sma[j][k]!=null)parts.push('SMA'+p+' '+skPf(C.sma[j][k]))});S.ema.forEach((p,j)=>{if(C.ema[j][k]!=null)parts.push('EMA'+p+' '+skPf(C.ema[j][k]))});
    if(S.rsi&&C.rsi[k]!=null)parts.push('RSI '+C.rsi[k].toFixed(1));if(S.macd&&C.macd.m[k]!=null)parts.push('MACD '+C.macd.m[k].toFixed(2));
    svg+=`<rect x="${cx(i)-band/2}" y="${top}" width="${band}" height="${H-top-20}" fill="transparent" data-tip="${X(parts.join('　'))}"/>`}
  let legend='<div class="legend">'+S.sma.map((p,k)=>`<span><i style="background:${SKC[k%4]}"></i>SMA${p}</span>`).join('')+S.ema.map((p,k)=>`<span><i style="background:${SKC[(k+2)%4]}"></i>EMA${p}</span>`).join('')+(S.bb?'<span><i style="background:#4A9EFF"></i>ボリンジャー(20,±2σ)</span>':'')+(S.ichi?'<span><i style="background:#ff8c42"></i>転換線</span><span><i style="background:#b38cff"></i>基準線</span><span><i style="background:rgba(255,92,92,.5)"></i>雲</span>':'')+(S.fib?'<span><i style="background:#F5C842"></i>フィボナッチ</span>':'')+'</div>';
  return `<svg id="ssvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${svg}</svg>`+legend}
// --- 判定・数値パネル
function skStats(t,S,C){const{R,N,n,start}=C,last=R[N-1],prev=N>1?R[N-2]:null,F=C.fib,rows=[];
  const row=(a,b,cls)=>rows.push(`<div class="srow"><span>${a}</span><b${cls?' class="'+cls+'"':''}>${b}</b></div>`);const sec=a=>rows.push(`<div class="shead">${a}</div>`);
  const pc=(a,b)=>(a>=0?'+':'')+(a/b*100).toFixed(2)+'%',unit={d:'日',w:'週',m:'月'}[S.tf];let up=0,tot=0;const tally=ok=>{if(ok==null)return;tot++;if(ok)up++};
  sec('いまの位置');row('終値（'+last.d.y+'/'+last.d.m+'/'+last.d.d+'）',skPf(last.c)+(prev?'　'+(last.c-prev.c>=0?'+':'')+skPf(last.c-prev.c)+'（'+pc(last.c-prev.c,prev.c)+'）':''));
  const fr=R[start];row('表示期間の騰落率',pc(last.c-fr.c,fr.c)+'（'+skPf(fr.c)+' → '+skPf(last.c)+'）');
  row('期間の最高値 / 最安値',skPf(F.hi)+' / '+skPf(F.lo));row('レンジ内の位置',F.rg?((last.c-F.lo)/F.rg*100).toFixed(0)+'%（0%=安値、100%=高値）':'-');
  sec('トレンド');
  S.sma.forEach((p,k)=>{const a=C.sma[k][N-1],b=C.sma[k][N-1-Math.min(5,N-1)];if(a==null)return;row('SMA'+p+'　との乖離',skPf(a)+'　'+pc(last.c-a,a)+'　'+(b!=null?(a>b?'↗向き上':'↘向き下'):''));if(k===S.sma.length-1)tally(last.c>a)});
  if(C.crossN){const lc=C.cross[C.cross.length-1];if(lc)row('直近のクロス（SMA'+C.crossN[0]+'×'+C.crossN[1]+'）',(lc.t==='GC'?'ゴールデンクロス':'デッドクロス')+'（'+(N-1-lc.i)+unit+'前）');const a=C.sma[S.sma.indexOf(C.crossN[0])][N-1],b=C.sma[S.sma.indexOf(C.crossN[1])][N-1];if(a!=null&&b!=null)tally(a>b)}
  if(C.ichi&&last){const k=N-1,sa=C.ichi.sa[k],sb=C.ichi.sb[k];if(sa!=null&&sb!=null){const hi=Math.max(sa,sb),lo=Math.min(sa,sb);row('一目均衡表',last.c>hi?'雲の上（強気の位置）':last.c<lo?'雲の下（弱気の位置）':'雲の中（方向感なし）');tally(last.c>hi?true:last.c<lo?false:null)}}
  sec('勢い');const rv=C.rsi[N-1];if(rv!=null){row('RSI(14)',rv.toFixed(1)+'　'+(rv>=70?'買われすぎ圏（70以上）':rv<=30?'売られすぎ圏（30以下）':'中立圏'));tally(rv>50)}
  const mm=C.macd.m[N-1],ms=C.macd.s[N-1];if(mm!=null&&ms!=null){let lc=null;for(let i=N-1;i>0;i--){const a=C.macd.m[i]-C.macd.s[i],b=C.macd.m[i-1]-C.macd.s[i-1];if(C.macd.s[i]==null||C.macd.s[i-1]==null)break;if((a>0)!==(b>0)){lc=[i,a>0];break}}
    row('MACD',mm.toFixed(2)+' / シグナル '+ms.toFixed(2)+'　'+(mm>ms?'上向き優勢':'下向き優勢')+(lc?'（'+(lc[1]?'ゴールデン':'デッド')+'クロス '+(N-1-lc[0])+unit+'前）':''));tally(mm>ms)}
  const sk=C.sto.k[N-1],sd=C.sto.d[N-1];if(sk!=null&&sd!=null)row('ストキャス(14,3,3)','%K '+sk.toFixed(0)+' / %D '+sd.toFixed(0)+'　'+(sk>=80?'買われすぎ圏':sk<=20?'売られすぎ圏':'中立圏'));
  sec('ばらつき・リスク');const u=C.bb.u[N-1],l=C.bb.l[N-1];if(u!=null){const b=(last.c-l)/(u-l);row('ボリンジャー(20,±2σ)','%b '+(b*100).toFixed(0)+'%　'+(b>1?'+2σ超え':b<0?'-2σ割れ':b>.8?'上限に近い':b<.2?'下限に近い':'バンド内')+'　幅 '+((u-l)/C.bb.m[N-1]*100).toFixed(1)+'%');tally(b>.5)}
  const at=C.atr[N-1];if(at!=null)row('ATR(14)（1'+unit+'の平均的な値幅）',skPf(at)+'（'+(at/last.c*100).toFixed(2)+'%）');
  const lr=[];for(let i=start+1;i<N;i++)lr.push(Math.log(R[i].c/R[i-1].c));if(lr.length>=5){const m=lr.reduce((p,c)=>p+c,0)/lr.length,sdv=Math.sqrt(lr.reduce((p,c)=>p+(c-m)**2,0)/(lr.length-1)),ppy={d:245,w:52,m:12}[S.tf];row('年率ボラティリティ',(sdv*Math.sqrt(ppy)*100).toFixed(1)+'%')}
  let pk=-Infinity,dd=0,ddI=0;for(let i=start;i<N;i++){pk=Math.max(pk,R[i].c);const d=R[i].c/pk-1;if(d<dd){dd=d;ddI=i}}row('最大ドローダウン（期間内）',(dd*100).toFixed(1)+'%（'+R[ddI].d.y+'/'+R[ddI].d.m+'/'+R[ddI].d.d+'）');
  const vv=R.slice(Math.max(0,N-21),N-1).map(x=>x.v).filter(x=>x>0);if(last.v&&vv.length>=5)row('出来高（直近20'+unit+'平均比）',(last.v/(vv.reduce((p,c)=>p+c,0)/vv.length)).toFixed(2)+'倍');
  if(prev){const P=(prev.h+prev.l+prev.c)/3;sec('ピボット（前'+unit+'のH・L・Cから）');row('R2 / R1',skPf(P+(prev.h-prev.l))+' / '+skPf(2*P-prev.l));row('ピボット',skPf(P));row('S1 / S2',skPf(2*P-prev.h)+' / '+skPf(P-(prev.h-prev.l)))}
  sec('フィボナッチ（'+(F.up?'上昇':'下落')+'の波：'+skPf(F.lo)+' ⇄ '+skPf(F.hi)+'）');
  const lv=F.levels.slice().sort((a,b)=>b.p-a.p);let near=lv.reduce((a,b)=>Math.abs(b.p-last.c)<Math.abs(a.p-last.c)?b:a);
  lv.forEach(x=>row((x.r*100).toFixed(1)+'%'+(x.ex?'（拡張）':(x.r===0?(F.up?'（高値）':'（安値）'):x.r===1?(F.up?'（安値）':'（高値）'):'')),skPf(x.p)+'　現在値から '+pc(x.p-last.c,last.c),x===near?'near':''));
  const sum=tot?`<div class="ssum">上向きの指標：<b>${up}</b> / ${tot}　<small>（SMA・クロス・一目・RSI・MACD・ボリンジャーの合計。参考表示）</small></div>`:'';
  return sum+rows.join('')}
// --- 損益・株数計算
function skCalcHtml(S,last){const c=S.cal;const f=(k,l,ph,mode)=>`<div><label>${l}</label><input class="lin" data-cal="${k}" inputmode="decimal" placeholder="${ph||''}" value="${X(c[k])}"></div>`;
  return `<div class="sec"><h4>🧮 株数・損益の計算（リスク管理）</h4><div class="ctl">${f('cap','資金（円）')}${f('risk','1回で許せる損失（%）','2')}${f('entry','買う価格（エントリー）','現在値 '+skPf(last))}${f('stop','損切りの価格','')}${f('tgt','利益確定の価格','')}${f('unit','売買の単位（株）','100')}</div><div id="calOut" class="calout"></div>
  <h4 style="margin-top:14px">平均取得単価</h4><textarea id="calFills" class="lin" rows="3" placeholder="1行に1回の約定を「株数@価格」で入力&#10;例）100@1500&#10;200@1420">${X(c.fills||'')}</textarea><div id="fillOut" class="calout"></div></div>`}
function skCalcRun(t,S,last){const c=S.cal,n=x=>{const v=parseFloat(String(x).replace(/[,，\s]/g,''));return isNaN(v)?null:v};const cap=n(c.cap),rk=n(c.risk),en=n(c.entry)??last,st=n(c.stop),tg=n(c.tgt),un=Math.max(1,n(c.unit)||1);let h='';
  if(cap&&rk&&st!=null&&st!==en){const long=st<en,ps=Math.abs(en-st),allow=cap*rk/100,q=Math.floor(allow/ps/un)*un,need=q*en,loss=q*ps;
    h+=`<div class="srow"><span>方向</span><b>${long?'買い（ロング）':'売り（ショート）'}　損切り幅 ${skPf(ps)}（${(ps/en*100).toFixed(2)}%）</b></div><div class="srow"><span>許せる損失額</span><b>${Math.round(allow).toLocaleString('ja-JP')}円</b></div>`
     +`<div class="srow"><span>買える株数</span><b class="near">${q.toLocaleString('ja-JP')}株</b></div><div class="srow"><span>必要な資金</span><b${need>cap?' style="color:var(--red)"':''}>${Math.round(need).toLocaleString('ja-JP')}円${need>cap?'　⚠ 資金を超えています（レバレッジが必要）':''}</b></div><div class="srow"><span>損切りになったときの損失</span><b>-${Math.round(loss).toLocaleString('ja-JP')}円</b></div>`;
    if(q===0)h+='<div class="srow"><span>注意</span><b style="color:var(--red)">この条件では1単位も買えません（損切り幅が大きい／許容損失が小さい）</b></div>';
    if(tg!=null&&((long&&tg>en)||(!long&&tg<en))){const rw=Math.abs(tg-en),R=rw/ps;h+=`<div class="srow"><span>利益確定のとき</span><b>+${Math.round(q*rw).toLocaleString('ja-JP')}円（+${(rw/en*100).toFixed(2)}%）</b></div><div class="srow"><span>リスクリワード</span><b>1 : ${R.toFixed(2)}</b></div><div class="srow"><span>損益分岐の勝率</span><b>${(1/(1+R)*100).toFixed(0)}% 以上で期待値がプラス</b></div>`}
    else if(tg!=null)h+='<div class="srow"><span>注意</span><b style="color:var(--red)">利益確定の価格が、損切りと逆側にありません</b></div>'}
  else h='<div style="font-size:13px;color:var(--dim)">資金・許せる損失(%)・損切りの価格を入れると、買える株数が出ます。（買う価格が空なら現在値で計算）</div>';
  $('calOut').innerHTML=h;
  const fl=String(c.fills||'').split(/\n/).map(s=>s.trim().match(/^([\d,.]+)\s*[@＠×x\s]\s*([\d,.]+)$/i)).filter(Boolean).map(m=>[n(m[1]),n(m[2])]).filter(a=>a[0]&&a[1]!=null);
  if(fl.length){const q=fl.reduce((p,a)=>p+a[0],0),cost=fl.reduce((p,a)=>p+a[0]*a[1],0),avg=cost/q,pl=(last-avg)*q;$('fillOut').innerHTML=`<div class="srow"><span>合計 / 平均単価</span><b>${q.toLocaleString('ja-JP')}株 / ${skPf(avg)}</b></div><div class="srow"><span>現在値(${skPf(last)})での損益</span><b style="color:var(--${pl>=0?'grn':'red'})">${pl>=0?'+':''}${Math.round(pl).toLocaleString('ja-JP')}円（${((last/avg-1)*100).toFixed(2)}%）</b></div>`}else $('fillOut').innerHTML=''}
const SK_CH=[['sma','移動平均'],['ema','指数平滑(EMA)'],['bb','ボリンジャー'],['ichi','一目均衡表'],['fib','フィボナッチ'],['vol','出来高'],['rsi','RSI'],['macd','MACD'],['sto','ストキャス']];
function renderStock(){const t=T();if(!t)return;const S=stkOf(t),I=info(t),box=$('sv'),m=S.map;
  const C=m.d>=0&&m.c>=0?skCalc(t,S):null;
  const colSel=(k,l,opt)=>`<div><label>${l}</label><select data-skm="${k}">${(opt?'<option value="-1">なし</option>':'')+I.names.map((n,i)=>`<option value="${i}"${m[k]===i?' selected':''}>${X(n)}</option>`).join('')}</select></div>`;
  const map=`<details class="sec"><summary style="font-size:13px;color:var(--dim);font-weight:700">列の対応（自動で見つけています。違うときだけ直す）</summary><div class="ctl" style="margin-top:8px">${colSel('d','日付')}${colSel('c','終値')}${colSel('o','始値',1)}${colSel('h','高値',1)}${colSel('l','安値',1)}${colSel('v','出来高',1)}</div><div style="font-size:12px;color:var(--dim);margin-top:6px">日付と終値だけでも動きます（折れ線表示）。始値・高値・安値があるとローソク足、一目均衡表、ストキャス、ATRが正確になります。古い順でも新しい順でも自動で並べ替えます。</div></details>`;
  if(!C){box.innerHTML='<div style="padding:24px;text-align:center;color:var(--dim);line-height:1.7">株価データが見つかりません。<br>「日付」と「終値」の列がある表（2行以上）を用意してください。<br>📂 取り込み から、証券会社・Yahoo!ファイナンス・株探などのCSVを読み込めます。</div>'+map;return}
  const on=k=>k==='sma'?S.sma.length>0:k==='ema'?S.ema.length>0:S[k];
  const h=`<div id="stip" style="min-height:22px;font-size:13px;color:var(--gold);padding:0 4px 6px;font-weight:700;line-height:1.5">${C.R.length}本のデータ（${C.R[0].d.y}/${C.R[0].d.m}/${C.R[0].d.d} 〜 ${C.R[C.N-1].d.y}/${C.R[C.N-1].d.m}/${C.R[C.N-1].d.d}）。足をタップすると値が出ます</div><div id="schart" style="background:var(--p);border:1px solid var(--bd);border-radius:12px;padding:8px 0 8px 8px;overflow:hidden">${skDraw(t,S,C,Math.max(280,box.clientWidth-18))}</div>
   <div style="display:flex;gap:8px;margin-top:8px"><button id="sPng">🖼 画像で保存</button></div>
   <div class="sec"><h4>① 期間と足</h4><div class="chips">${[[60,'3か月'],[120,'半年'],[250,'1年'],[500,'2年'],[0,'全部']].map(([k,l])=>`<button class="chip${S.range===k?' on':''}" data-skr="${k}">${l}</button>`).join('')}<span style="width:10px"></span>${[['d','日足'],['w','週足'],['m','月足']].map(([k,l])=>`<button class="chip${S.tf===k?' on':''}" data-skt="${k}">${l}</button>`).join('')}<span style="width:10px"></span><button class="chip${S.jp?' on':''}" data-skk="jp">${S.jp?'陽線＝赤（日本式）':'陽線＝緑（海外式）'}</button></div><div style="font-size:12px;color:var(--dim);margin-top:6px">※ 「期間」は表示する本数です。指標は、それより前のデータも使って計算します。</div></div>
   <div class="sec"><h4>② 指標を重ねる</h4><div class="chips">${SK_CH.map(([k,l])=>`<button class="chip${on(k)?' on':''}" data-skk="${k}">${l}</button>`).join('')}</div>
    <div class="ctl" style="margin-top:10px"><div><label>SMA の期間（例 5,25,75）</label><input class="lin" data-skp="sma" value="${S.sma.join(',')}" inputmode="numeric"></div><div><label>EMA の期間（例 12,26）</label><input class="lin" data-skp="ema" value="${S.ema.join(',')}" inputmode="numeric"></div></div>
    ${S.fib?`<div class="chips" style="margin-top:10px"><button class="chip${S.fx?' on':''}" data-skk="fx">拡張（127.2・161.8・261.8%）も表示</button><button class="chip${S.fr?' on':''}" data-skk="fr">波の向きを反転</button></div><div style="font-size:12px;color:var(--dim);margin-top:6px">フィボナッチは「表示期間の最高値と最安値」を自動で結びます。期間を変えると波も変わります。</div>`:''}</div>
   <div class="sec"><h4>③ 数値で見る（判定の目安）</h4>${skStats(t,S,C)}<div style="font-size:12px;color:var(--dim);margin-top:8px;line-height:1.6">過去の値動きから機械的に計算した参考表示です。将来の値動きや利益を保証するものではなく、売買の判断はご自身の責任で行ってください。</div></div>
   ${skCalcHtml(S,C.R[C.N-1].c)}${map}`;
  box.innerHTML=h;skCalcRun(t,S,C.R[C.N-1].c)}
function skPeriods(s,max){return [...new Set(String(s).split(/[,，、\s]+/).map(x=>parseInt(x,10)).filter(x=>x>=2&&x<=400))].sort((a,b)=>a-b).slice(0,max)}
$('sv').addEventListener('click',e=>{const t=T();if(!t)return;const S=stkOf(t);let b;
  if(b=e.target.closest('[data-tip]')){$('stip').textContent=b.getAttribute('data-tip');return}
  if(b=e.target.closest('[data-skr]')){S.range=+b.dataset.skr;touch();renderStock();return}
  if(b=e.target.closest('[data-skt]')){S.tf=b.dataset.skt;touch();renderStock();return}
  if(b=e.target.closest('[data-skk]')){const k=b.dataset.skk;if(k==='sma')S.sma=S.sma.length?[]:[5,25,75];else if(k==='ema')S.ema=S.ema.length?[]:[12,26];else S[k]=!S[k];touch();renderStock();return}
  if(e.target.closest('#sPng')){savePng($('ssvg'),(t.title||'stock')+'-chart')}});
$('sv').addEventListener('change',e=>{const t=T();if(!t)return;const S=stkOf(t),el=e.target;
  if(el.dataset.skm){S.map[el.dataset.skm]=+el.value;touch();renderStock();return}
  if(el.dataset.skp){const k=el.dataset.skp;S[k]=skPeriods(el.value,4);touch();renderStock()}});
$('sv').addEventListener('input',e=>{const t=T();if(!t)return;const S=stkOf(t),el=e.target;
  if(el.dataset.cal||el.id==='calFills'){if(el.id==='calFills')S.cal.fills=el.value;else S.cal[el.dataset.cal]=el.value;touch();const R=skRows(t,S);if(R.length)skCalcRun(t,S,R[R.length-1].c)}});

// ===================== 計算エンジン（式電卓・物理公式・単位換算・関数グラフ・計算列） =====================
const PHC=Object.assign(Object.create(null),{pi:Math.PI,e:Math.E,g:9.80665,c:299792458,G:6.6743e-11,h:6.62607015e-34,hbar:1.054571817e-34,kB:1.380649e-23,NA:6.02214076e23,R:8.314462618,eps0:8.8541878128e-12,mu0:1.25663706212e-6,qe:1.602176634e-19,me:9.1093837015e-31,mp:1.67262192369e-27,sigma:5.670374419e-8,atm:101325,ke:8.9875517923e9,amu:1.6605390666e-27});
function xTok(src){let s=String(src).replace(/²/g,'^2').replace(/³/g,'^3').replace(/√\s*\(/g,'sqrt(').replace(/√\s*([A-Za-z0-9_.]+)/g,'sqrt($1)').normalize('NFKC').replace(/[×✕・]/g,'*').replace(/÷/g,'/').replace(/[−–—]/g,'-').replace(/π/g,'pi');
  const T=[];let i=0,m;while(i<s.length){const ch=s[i];if(/\s/.test(ch)){i++;continue}const rest=s.slice(i);
    if(m=rest.match(/^(\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/)){T.push({t:'n',v:parseFloat(m[0])});i+=m[0].length;continue}
    if(m=rest.match(/^[A-Za-z_À-￿][A-Za-z0-9_À-￿]*/)){T.push({t:'id',v:m[0]});i+=m[0].length;continue}
    if(m=rest.match(/^"([^"]*)"/)||rest.match(/^「([^」]*)」/)){T.push({t:'s',v:m[1]});i+=m[0].length;continue}
    if(m=rest.match(/^\[([^\]]+)\]/)){T.push({t:'c',v:m[1].trim()});i+=m[0].length;continue}
    if(m=rest.match(/^(<=|>=|==|!=|\*\*|[-+*\/^%(),<>=!°;])/)){T.push({t:'o',v:m[0]==='**'?'^':m[0]});i+=m[0].length;continue}
    throw new Error('使えない文字があります：'+ch)}
  return T}
const xCache=new Map();
function xParse(src){if(xCache.has(src))return xCache.get(src);const T=xTok(src);let p=0;const pk=()=>T[p],isO=v=>T[p]&&T[p].t==='o'&&T[p].v===v;
  const eat=v=>{if(!isO(v))throw new Error('「'+v+'」が必要です');p++};
  function cmp(){let a=add();while(T[p]&&T[p].t==='o'&&['<','>','<=','>=','==','!='].includes(T[p].v)){const op=T[p++].v;a={t:'b',op,a,b:add()}}return a}
  function add(){let a=mul();while(isO('+')||isO('-')){const op=T[p++].v;a={t:'b',op,a,b:mul()}}return a}
  function mul(){let a=un();for(;;){if(isO('*')||isO('/')||isO('%')){const op=T[p++].v;a={t:'b',op,a,b:un()}}
      else if(T[p]&&((a.t==='n'||a.par||a.t==='post'&&a.op==='°')&&(T[p].t==='id'||T[p].t==='c'||isO('(')))){a={t:'b',op:'*',a,b:un()}}else break}return a}
  function un(){if(isO('-')){p++;return{t:'u',op:'-',a:un()}}if(isO('+')){p++;return un()}return pw()}
  function pw(){let a=po();if(isO('^')){p++;a={t:'b',op:'^',a,b:un()}}return a}
  function po(){let a=pr();for(;;){if(isO('!')){p++;a={t:'post',op:'!',a}}else if(isO('°')){p++;a={t:'post',op:'°',a}}else break}return a}
  function pr(){const k=T[p];if(!k)throw new Error('式が途中で終わっています');
    if(k.t==='n'){p++;return{t:'n',v:k.v}}if(k.t==='s'){p++;return{t:'s',v:k.v}}if(k.t==='c'){p++;return{t:'c',n:k.v}}
    if(k.t==='id'){p++;if(isO('(')){p++;const args=[];if(!isO(')')){for(;;){args.push(cmp());if(isO(',')){p++;continue}break}}eat(')');return{t:'f',n:k.v,args}}return{t:'id',n:k.v}}
    if(isO('(')){p++;const e=cmp();eat(')');e.par=true;return e}
    throw new Error('「'+k.v+'」の位置が正しくありません')}
  const r=cmp();if(p<T.length)throw new Error('「'+T[p].v+'」の位置が正しくありません');xCache.set(src,r);if(xCache.size>500)xCache.clear();return r}
const xRad=(x,E)=>E.deg?x*Math.PI/180:x,xBack=(x,E)=>E.deg?x*180/Math.PI:x;
function xFact(n){if(!Number.isInteger(n)||n<0||n>170)return NaN;let r=1;for(let i=2;i<=n;i++)r*=i;return r}
const xGcd=(a,b)=>b?xGcd(b,a%b):Math.abs(a);
const XF={sin:(a,E)=>Math.sin(xRad(a[0],E)),cos:(a,E)=>Math.cos(xRad(a[0],E)),tan:(a,E)=>Math.tan(xRad(a[0],E)),asin:(a,E)=>xBack(Math.asin(a[0]),E),acos:(a,E)=>xBack(Math.acos(a[0]),E),atan:(a,E)=>xBack(Math.atan(a[0]),E),atan2:(a,E)=>xBack(Math.atan2(a[0],a[1]),E),
  sinh:a=>Math.sinh(a[0]),cosh:a=>Math.cosh(a[0]),tanh:a=>Math.tanh(a[0]),sqrt:a=>Math.sqrt(a[0]),cbrt:a=>Math.cbrt(a[0]),exp:a=>Math.exp(a[0]),ln:a=>Math.log(a[0]),log:a=>a.length>1?Math.log(a[0])/Math.log(a[1]):Math.log10(a[0]),log10:a=>Math.log10(a[0]),log2:a=>Math.log2(a[0]),
  abs:a=>Math.abs(a[0]),floor:a=>Math.floor(a[0]),ceil:a=>Math.ceil(a[0]),trunc:a=>Math.trunc(a[0]),sign:a=>Math.sign(a[0]),round:a=>{const n=a[1]||0,k=Math.pow(10,n);return Math.round(a[0]*k)/k},pow:a=>Math.pow(a[0],a[1]),hypot:a=>Math.hypot(...a),
  fact:a=>xFact(a[0]),ncr:a=>xFact(a[0])/(xFact(a[1])*xFact(a[0]-a[1])),npr:a=>xFact(a[0])/xFact(a[0]-a[1]),mod:a=>((a[0]%a[1])+a[1])%a[1],gcd:a=>a.reduce((p,c)=>xGcd(p,c)),lcm:a=>a.reduce((p,c)=>p*c/xGcd(p,c)),
  deg:(a,E)=>a[0]*180/Math.PI,rad:(a,E)=>a[0]*Math.PI/180,rand:()=>Math.random(),if:a=>a[0]?a[1]:a[2],
  sum:a=>a.reduce((p,c)=>p+c,0),avg:a=>a.reduce((p,c)=>p+c,0)/a.length,max:a=>Math.max(...a),min:a=>Math.min(...a),count:a=>a.length};
const XAL={'合計':'sum','平均':'avg','mean':'avg','最大':'max','最小':'min','件数':'count','もし':'if','中央値':'median','標準偏差':'stdev','分散':'var','累計':'cumsum','前行':'prev','移動平均':'ma','構成比':'pct','標準化':'zscore','順位':'rank','行':'row','絶対値':'abs','平方根':'sqrt','階乗':'fact','べき乗':'pow'};
const XAGG={sum:v=>v.reduce((p,c)=>p+c,0),avg:v=>v.reduce((p,c)=>p+c,0)/v.length,max:v=>Math.max(...v),min:v=>Math.min(...v),count:v=>v.length,median:v=>{const s=v.slice().sort((a,b)=>a-b),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2},
  stdev:v=>{const m=v.reduce((p,c)=>p+c,0)/v.length;return Math.sqrt(v.reduce((p,c)=>p+(c-m)*(c-m),0)/Math.max(1,v.length-1))},var:v=>{const m=v.reduce((p,c)=>p+c,0)/v.length;return v.reduce((p,c)=>p+(c-m)*(c-m),0)/Math.max(1,v.length-1)}};
function xEv(n,E){switch(n.t){
  case 'n':return n.v;case 's':return n.v;
  case 'id':{if(n.n in E.vars)return E.vars[n.n];if(n.n in PHC)return PHC[n.n];throw new Error('「'+n.n+'」が分かりません（定義されていません）')}
  case 'c':{if(!E.ctx)throw new Error('[列名]は「計算列」でだけ使えます');return E.ctx.val(n.n)}
  case 'u':return -xEv(n.a,E);
  case 'post':{const a=xEv(n.a,E);if(n.op==='!')return xFact(a);return E.deg?a:a*Math.PI/180}
  case 'b':{const a=xEv(n.a,E),b=xEv(n.b,E);switch(n.op){case '+':return a+b;case '-':return a-b;case '*':return a*b;case '/':return a/b;case '%':return a%b;case '^':return Math.pow(a,b);
      case '<':return+(a<b);case '>':return+(a>b);case '<=':return+(a<=b);case '>=':return+(a>=b);case '==':return+(a===b);case '!=':return+(a!==b)}}
  case 'f':{let name=n.n;const lname=XAL[name]||name.toLowerCase();
    if(E.funcs&&E.funcs[name]){const F=E.funcs[name];if(n.args.length!==F.p.length)throw new Error(name+'は引数が'+F.p.length+'個必要です');const v2=Object.assign(Object.create(null),E.vars);F.p.forEach((q,i)=>{v2[q]=xEv(n.args[i],E)});return xEv(F.ast,Object.assign({},E,{vars:v2}))}
    const colArg=n.args[0]&&(n.args[0].t==='c'||n.args[0].t==='s');
    if(colArg){if(!E.ctx)throw new Error(name+'の列指定は「計算列」でだけ使えます');const nm=n.args[0].t==='c'?n.args[0].n:n.args[0].v,ctx=E.ctx;
      if(XAGG[lname]){const v=ctx.colVec(nm);if(!v.length)return NaN;return XAGG[lname](v)}
      const all=ctx.all(nm),i=ctx.idx;
      if(lname==='cumsum'){let s=0;for(let k=0;k<=i;k++)if(Number.isFinite(all[k]))s+=all[k];return s}
      if(lname==='prev'){const k=n.args[1]?xEv(n.args[1],E):1;return i-k>=0?all[i-k]:NaN}
      if(lname==='ma'){const w=xEv(n.args[1],E);let s=0,c=0;for(let k=Math.max(0,i-w+1);k<=i;k++)if(Number.isFinite(all[k])){s+=all[k];c++}return i-w+1<0?NaN:s/c}
      if(lname==='pct'){const t=XAGG.sum(ctx.colVec(nm));return all[i]/t*100}
      if(lname==='zscore'){const v=ctx.colVec(nm);return (all[i]-XAGG.avg(v))/XAGG.stdev(v)}
      if(lname==='rank'){const v=all[i];return 1+all.filter(x=>x>v).length}}
    if(lname==='row'){if(!E.ctx)throw new Error('行()は「計算列」でだけ使えます');return E.ctx.idx+1}
    const f=XF[lname];if(!f)throw new Error('関数「'+name+'」が分かりません');const a=n.args.map(x=>xEv(x,E));
    if(['sum','avg','max','min','count'].includes(lname)&&!a.length)throw new Error(name+'に値が必要です');return f(a,E)}}
  throw new Error('式を解釈できません')}
function xEnv(deg,vars){return{vars:Object.assign(Object.create(null),vars||{}),funcs:Object.create(null),deg:!!deg,ctx:null}}
function xEval(src,E){const v=xEv(xParse(src),E);return v}
// 文（代入・関数定義）
function xStmt(line,E){const T=xTok(line);
  if(T.length>=3&&T[0].t==='id'&&T[1].t==='o'&&T[1].v==='='&&!(T[2].t==='o'&&T[2].v==='=')){const body=line.slice(line.indexOf('=')+1);const v=xEv(xParse(body),E);E.vars[T[0].v]=v;return v}
  if(T.length>=6&&T[0].t==='id'&&T[1].v==='('){let k=2;const ps=[];while(T[k]&&T[k].t==='id'){ps.push(T[k].v);k++;if(T[k]&&T[k].v===',')k++;else break}
    if(T[k]&&T[k].v===')'&&T[k+1]&&T[k+1].v==='='){const body=line.slice(line.indexOf('=')+1);E.funcs[T[0].v]={p:ps,ast:xParse(body)};return'関数 '+T[0].v+'('+ps.join(',')+') を定義しました'}}
  return xEv(xParse(line),E)}
function xfmt(v){if(typeof v==='string')return v;if(v==null||Number.isNaN(v))return'計算できません（NaN）';if(!Number.isFinite(v))return v>0?'∞':'-∞';if(v===0)return'0';const a=Math.abs(v);
  if(a>=1e12||a<1e-5)return(+v.toPrecision(10)).toExponential().replace('e+','e');return String(+v.toPrecision(12))}

// ---- 物理公式ライブラリ（角度は度で入力。定数 g c G h kB NA R eps0 mu0 qe me mp sigma atm ke は自動で使います）
const PH=[
['力学','newton','運動方程式','F = m a',['F:力:N','m:質量:kg','a:加速度:m/s²'],{F:'m*a',m:'F/a',a:'F/m'}],
['力学','v1','等加速度① 速度','v = v₀ + a t',['v:速度:m/s','v0:初速度:m/s','a:加速度:m/s²','t:時間:s'],{v:'v0+a*t',v0:'v-a*t',a:'(v-v0)/t',t:'(v-v0)/a'}],
['力学','v2','等加速度② 変位','x = v₀ t + ½ a t²',['x:変位:m','v0:初速度:m/s','a:加速度:m/s²','t:時間:s'],{x:'v0*t+a*t^2/2',v0:'(x-a*t^2/2)/t',a:'2*(x-v0*t)/t^2',t:'(-v0+sqrt(v0^2+2*a*x))/a|(-v0-sqrt(v0^2+2*a*x))/a'}],
['力学','v3','等加速度③ 速度と変位','v² = v₀² + 2 a x',['v:速度:m/s','v0:初速度:m/s','a:加速度:m/s²','x:変位:m'],{v:'sqrt(v0^2+2*a*x)',v0:'sqrt(v^2-2*a*x)',a:'(v^2-v0^2)/(2*x)',x:'(v^2-v0^2)/(2*a)'}],
['力学','fall','自由落下（高さと時間）','h = ½ g t²',['h:落下距離:m','t:時間:s'],{h:'g*t^2/2',t:'sqrt(2*h/g)'}],
['力学','fallv','自由落下（速さ）','v = g t',['v:速さ:m/s','t:時間:s'],{v:'g*t',t:'v/g'}],
['力学','mom','運動量','p = m v',['p:運動量:kg·m/s','m:質量:kg','v:速さ:m/s'],{p:'m*v',m:'p/v',v:'p/m'}],
['力学','imp','力積','I = F Δt',['I:力積:N·s','F:力:N','dt:時間:s'],{I:'F*dt',F:'I/dt',dt:'I/F'}],
['力学','ke','運動エネルギー','K = ½ m v²',['K:エネルギー:J','m:質量:kg','v:速さ:m/s'],{K:'m*v^2/2',m:'2*K/v^2',v:'sqrt(2*K/m)'}],
['力学','pe','位置エネルギー','U = m g h',['U:エネルギー:J','m:質量:kg','h:高さ:m'],{U:'m*g*h',m:'U/(g*h)',h:'U/(m*g)'}],
['力学','work','仕事','W = F s cosθ',['W:仕事:J','F:力:N','s:移動距離:m','th:角度:°'],{W:'F*s*cos(th)',F:'W/(s*cos(th))',s:'W/(F*cos(th))',th:'acos(W/(F*s))'}],
['力学','pow1','仕事率','P = W / t',['P:仕事率:W','W:仕事:J','t:時間:s'],{P:'W/t',W:'P*t',t:'W/P'}],
['力学','pow2','仕事率（力×速さ）','P = F v',['P:仕事率:W','F:力:N','v:速さ:m/s'],{P:'F*v',F:'P/v',v:'P/F'}],
['力学','fric','摩擦力','f = μ N',['f:摩擦力:N','mu:摩擦係数:','N:垂直抗力:N'],{f:'mu*N',mu:'f/N',N:'f/mu'}],
['力学','slope','斜面を下る加速度','a = g (sinθ − μ cosθ)',['a:加速度:m/s²','th:斜面の角度:°','mu:動摩擦係数:'],{a:'g*(sin(th)-mu*cos(th))',th:'asin(a/(g*sqrt(1+mu^2)))+atan(mu)',mu:'tan(th)-a/(g*cos(th))'}],
['力学','hook','フックの法則','F = k x',['F:力:N','k:ばね定数:N/m','x:伸び:m'],{F:'k*x',k:'F/x',x:'F/k'}],
['力学','spe','ばねの弾性エネルギー','U = ½ k x²',['U:エネルギー:J','k:ばね定数:N/m','x:伸び:m'],{U:'k*x^2/2',k:'2*U/x^2',x:'sqrt(2*U/k)'}],
['力学','spring','ばね振り子の周期','T = 2π√(m/k)',['T:周期:s','m:質量:kg','k:ばね定数:N/m'],{T:'2*pi*sqrt(m/k)',m:'k*(T/(2*pi))^2',k:'m*(2*pi/T)^2'}],
['力学','pend','単振り子の周期','T = 2π√(l/g)',['T:周期:s','l:糸の長さ:m'],{T:'2*pi*sqrt(l/g)',l:'g*(T/(2*pi))^2'}],
['力学','circ1','等速円運動（速さ）','v = r ω',['v:速さ:m/s','r:半径:m','w:角速度:rad/s'],{v:'r*w',r:'v/w',w:'v/r'}],
['力学','circ2','等速円運動（向心加速度）','a = v² / r',['a:加速度:m/s²','v:速さ:m/s','r:半径:m'],{a:'v^2/r',v:'sqrt(a*r)',r:'v^2/a'}],
['力学','circ3','向心力','F = m v² / r',['F:向心力:N','m:質量:kg','v:速さ:m/s','r:半径:m'],{F:'m*v^2/r',m:'F*r/v^2',v:'sqrt(F*r/m)',r:'m*v^2/F'}],
['力学','circ4','周期と角速度','T = 2π / ω',['T:周期:s','w:角速度:rad/s'],{T:'2*pi/w',w:'2*pi/T'}],
['力学','proj1','斜方投射の射程（水平面）','R = v₀² sin2θ / g',['R:射程:m','v0:初速度:m/s','th:角度:°'],{R:'v0^2*sin(2*th)/g',v0:'sqrt(R*g/sin(2*th))',th:'asin(R*g/v0^2)/2|90-asin(R*g/v0^2)/2'}],
['力学','proj2','斜方投射の最高点','H = (v₀ sinθ)² / 2g',['H:最高点の高さ:m','v0:初速度:m/s','th:角度:°'],{H:'(v0*sin(th))^2/(2*g)',v0:'sqrt(2*g*H)/sin(th)',th:'asin(sqrt(2*g*H)/v0)'}],
['力学','proj3','斜方投射の滞空時間','T = 2 v₀ sinθ / g',['T:滞空時間:s','v0:初速度:m/s','th:角度:°'],{T:'2*v0*sin(th)/g',v0:'T*g/(2*sin(th))',th:'asin(T*g/(2*v0))'}],
['力学','grav','万有引力','F = G m₁ m₂ / r²',['F:力:N','m1:質量1:kg','m2:質量2:kg','r:距離:m'],{F:'G*m1*m2/r^2',m1:'F*r^2/(G*m2)',m2:'F*r^2/(G*m1)',r:'sqrt(G*m1*m2/F)'}],
['力学','gacc','天体表面の重力加速度','g = G M / r²',['gg:重力加速度:m/s²','M:天体の質量:kg','r:天体の半径:m'],{gg:'G*M/r^2',M:'gg*r^2/G',r:'sqrt(G*M/gg)'}],
['力学','vcirc','第一宇宙速度','v = √(G M / r)',['v:速さ:m/s','M:天体の質量:kg','r:軌道半径:m'],{v:'sqrt(G*M/r)',M:'v^2*r/G',r:'G*M/v^2'}],
['力学','vesc','脱出速度','v = √(2 G M / r)',['v:速さ:m/s','M:天体の質量:kg','r:半径:m'],{v:'sqrt(2*G*M/r)',M:'v^2*r/(2*G)',r:'2*G*M/v^2'}],
['力学','kepler','ケプラーの第3法則','T² = 4π² r³ / (G M)',['T:公転周期:s','r:軌道半径:m','M:中心天体の質量:kg'],{T:'2*pi*sqrt(r^3/(G*M))',r:'(G*M*T^2/(4*pi^2))^(1/3)',M:'4*pi^2*r^3/(G*T^2)'}],
['流体','rho','密度','ρ = m / V',['rho:密度:kg/m³','m:質量:kg','V:体積:m³'],{rho:'m/V',m:'rho*V',V:'m/rho'}],
['流体','press','圧力','p = F / A',['p:圧力:Pa','F:力:N','A:面積:m²'],{p:'F/A',F:'p*A',A:'F/p'}],
['流体','hydro','水圧','p = p₀ + ρ g h',['p:圧力:Pa','p0:大気圧:Pa','rho:密度:kg/m³','h:深さ:m'],{p:'p0+rho*g*h',p0:'p-rho*g*h',rho:'(p-p0)/(g*h)',h:'(p-p0)/(rho*g)'}],
['流体','buoy','浮力','F = ρ V g',['F:浮力:N','rho:液体の密度:kg/m³','V:押しのけた体積:m³'],{F:'rho*V*g',rho:'F/(V*g)',V:'F/(rho*g)'}],
['流体','cont','連続の式','A₁ v₁ = A₂ v₂',['A1:断面積1:m²','v1:流速1:m/s','A2:断面積2:m²','v2:流速2:m/s'],{A1:'A2*v2/v1',v1:'A2*v2/A1',A2:'A1*v1/v2',v2:'A1*v1/A2'}],
['流体','torr','トリチェリの定理','v = √(2 g h)',['v:流出速度:m/s','h:水面の高さ:m'],{v:'sqrt(2*g*h)',h:'v^2/(2*g)'}],
['波・光','wave','波の基本式','v = f λ',['v:波の速さ:m/s','f:振動数:Hz','lam:波長:m'],{v:'f*lam',f:'v/lam',lam:'v/f'}],
['波・光','refr','屈折率','n = c / v',['n:屈折率:','v:媒質中の光速:m/s'],{n:'c/v',v:'c/n'}],
['波・光','snell','スネルの法則','n₁ sinθ₁ = n₂ sinθ₂',['n1:屈折率1:','th1:入射角:°','n2:屈折率2:','th2:屈折角:°'],{n1:'n2*sin(th2)/sin(th1)',th1:'asin(n2*sin(th2)/n1)',n2:'n1*sin(th1)/sin(th2)',th2:'asin(n1*sin(th1)/n2)'}],
['波・光','lens','薄いレンズの式','1/f = 1/a + 1/b',['f:焦点距離:m','a:物体までの距離:m','b:像までの距離:m'],{f:'1/(1/a+1/b)',a:'1/(1/f-1/b)',b:'1/(1/f-1/a)'}],
['波・光','dop','ドップラー効果','f′ = f (V − v₀) / (V − vₛ)',['f2:観測する振動数:Hz','f:音源の振動数:Hz','V:音速:m/s','vo:観測者の速さ:m/s','vs:音源の速さ:m/s'],{f2:'f*(V-vo)/(V-vs)',f:'f2*(V-vs)/(V-vo)',V:'(f2*vs-f*vo)/(f2-f)',vo:'V-f2*(V-vs)/f',vs:'V-f*(V-vo)/f2'}],
['熱','heat','熱量','Q = m c ΔT',['Q:熱量:J','m:質量:kg','cs:比熱:J/(kg·K)','dT:温度変化:K'],{Q:'m*cs*dT',m:'Q/(cs*dT)',cs:'Q/(m*dT)',dT:'Q/(m*cs)'}],
['熱','gas','理想気体の状態方程式','p V = n R T',['p:圧力:Pa','V:体積:m³','n:物質量:mol','T:絶対温度:K'],{p:'n*R*T/V',V:'n*R*T/p',n:'p*V/(R*T)',T:'p*V/(n*R)'}],
['熱','expand','線膨張','ΔL = α L ΔT',['dL:伸び:m','al:線膨張率:1/K','L:元の長さ:m','dT:温度変化:K'],{dL:'al*L*dT',al:'dL/(L*dT)',L:'dL/(al*dT)',dT:'dL/(al*L)'}],
['熱','stef','ステファン・ボルツマンの法則','P = σ A T⁴',['P:放射パワー:W','A:表面積:m²','T:絶対温度:K'],{P:'sigma*A*T^4',A:'P/(sigma*T^4)',T:'(P/(sigma*A))^(1/4)'}],
['熱','carnot','カルノー効率','e = 1 − T꜀ / Tₕ',['e:効率:','Tc:低温側:K','Th:高温側:K'],{e:'1-Tc/Th',Tc:'Th*(1-e)',Th:'Tc/(1-e)'}],
['熱','kin','気体分子の平均運動エネルギー','½ m v² = 3/2 k T',['T:絶対温度:K','K:平均運動エネルギー:J'],{K:'3*kB*T/2',T:'2*K/(3*kB)'}],
['電磁気','ohm','オームの法則','V = I R',['V:電圧:V','I:電流:A','R:抵抗:Ω'],{V:'I*R',I:'V/R',R:'V/I'}],
['電磁気','elp','電力','P = V I',['P:電力:W','V:電圧:V','I:電流:A'],{P:'V*I',V:'P/I',I:'P/V'}],
['電磁気','ele','電力量','W = P t',['W:電力量:J','P:電力:W','t:時間:s'],{W:'P*t',P:'W/t',t:'W/P'}],
['電磁気','rs','合成抵抗（直列）','R = R₁ + R₂',['R:合成抵抗:Ω','R1:抵抗1:Ω','R2:抵抗2:Ω'],{R:'R1+R2',R1:'R-R2',R2:'R-R1'}],
['電磁気','rp','合成抵抗（並列）','R = R₁R₂ / (R₁ + R₂)',['R:合成抵抗:Ω','R1:抵抗1:Ω','R2:抵抗2:Ω'],{R:'R1*R2/(R1+R2)',R1:'R*R2/(R2-R)',R2:'R*R1/(R1-R)'}],
['電磁気','coul','クーロンの法則','F = k q₁ q₂ / r²',['F:力:N','q1:電荷1:C','q2:電荷2:C','r:距離:m'],{F:'ke*q1*q2/r^2',q1:'F*r^2/(ke*q2)',q2:'F*r^2/(ke*q1)',r:'sqrt(ke*q1*q2/F)'}],
['電磁気','efield','点電荷がつくる電場','E = k q / r²',['E:電場:N/C','q:電荷:C','r:距離:m'],{E:'ke*q/r^2',q:'E*r^2/ke',r:'sqrt(ke*q/E)'}],
['電磁気','cap1','コンデンサの電気量','Q = C V',['Q:電気量:C','C:電気容量:F','V:電圧:V'],{Q:'C*V',C:'Q/V',V:'Q/C'}],
['電磁気','cap2','コンデンサのエネルギー','U = ½ C V²',['U:エネルギー:J','C:電気容量:F','V:電圧:V'],{U:'C*V^2/2',C:'2*U/V^2',V:'sqrt(2*U/C)'}],
['電磁気','cap3','平行板コンデンサ','C = ε₀ S / d',['C:電気容量:F','S:極板の面積:m²','d:間隔:m'],{C:'eps0*S/d',S:'C*d/eps0',d:'eps0*S/C'}],
['電磁気','lorentz','ローレンツ力','F = q v B sinθ',['F:力:N','q:電荷:C','v:速さ:m/s','B:磁束密度:T','th:角度:°'],{F:'q*v*B*sin(th)',q:'F/(v*B*sin(th))',v:'F/(q*B*sin(th))',B:'F/(q*v*sin(th))',th:'asin(F/(q*v*B))|180-asin(F/(q*v*B))'}],
['電磁気','cyc','磁場中の円運動の半径','r = m v / (q B)',['r:半径:m','m:質量:kg','v:速さ:m/s','q:電荷:C','B:磁束密度:T'],{r:'m*v/(q*B)',m:'r*q*B/v',v:'r*q*B/m',B:'m*v/(q*r)',q:'m*v/(r*B)'}],
['電磁気','emf','導体棒の誘導起電力','V = B L v',['V:起電力:V','B:磁束密度:T','L:棒の長さ:m','v:速さ:m/s'],{V:'B*L*v',B:'V/(L*v)',L:'V/(B*v)',v:'V/(B*L)'}],
['電磁気','rc','RC回路の時定数','τ = R C',['ta:時定数:s','R:抵抗:Ω','C:電気容量:F'],{ta:'R*C',R:'ta/C',C:'ta/R'}],
['電磁気','lc','LC共振の周波数','f = 1 / (2π√(LC))',['f:周波数:Hz','L:インダクタンス:H','C:電気容量:F'],{f:'1/(2*pi*sqrt(L*C))',L:'1/((2*pi*f)^2*C)',C:'1/((2*pi*f)^2*L)'}],
['電磁気','trans','変圧器','V₁ / V₂ = N₁ / N₂',['V1:一次電圧:V','V2:二次電圧:V','N1:一次の巻数:','N2:二次の巻数:'],{V1:'V2*N1/N2',V2:'V1*N2/N1',N1:'N2*V1/V2',N2:'N1*V2/V1'}],
['現代物理','emc','質量とエネルギー','E = m c²',['E:エネルギー:J','m:質量:kg'],{E:'m*c^2',m:'E/c^2'}],
['現代物理','ehf','光子のエネルギー','E = h f',['E:エネルギー:J','f:振動数:Hz'],{E:'h*f',f:'E/h'}],
['現代物理','lam','光の波長と振動数','c = f λ',['f:振動数:Hz','lam:波長:m'],{f:'c/lam',lam:'c/f'}],
['現代物理','debro','ド・ブロイ波長','λ = h / (m v)',['lam:波長:m','m:質量:kg','v:速さ:m/s'],{lam:'h/(m*v)',m:'h/(lam*v)',v:'h/(m*lam)'}],
['現代物理','photo','光電効果','K = h f − W₀',['K:最大の運動エネルギー:J','f:振動数:Hz','W0:仕事関数:J'],{K:'h*f-W0',f:'(K+W0)/h',W0:'h*f-K'}],
['現代物理','decay','放射性崩壊（半減期）','N = N₀ (1/2)^(t/T)',['N:残りの量:','N0:最初の量:','t:経過時間:','T:半減期:'],{N:'N0*0.5^(t/T)',N0:'N/0.5^(t/T)',t:'T*log(N/N0)/log(0.5)',T:'t*log(0.5)/log(N/N0)'}],
['現代物理','schw','シュワルツシルト半径','rₛ = 2 G M / c²',['rs:半径:m','M:質量:kg'],{rs:'2*G*M/c^2',M:'rs*c^2/(2*G)'}]
];
const PHCAT=[...new Set(PH.map(f=>f[0]))];
const phF=id=>PH.find(f=>f[1]===id);
const phVars=f=>f[4].map(s=>{const a=s.split(':');return{k:a[0],n:a[1],u:a[2]||''}});
function phSolve(f,tgt,vals){const ex=f[5][tgt];if(!ex)return[];const E=xEnv(true,vals);return ex.split('|').map(s=>{try{return xEv(xParse(s),E)}catch(e){return NaN}}).filter(Number.isFinite)}
// ---- 単位換算
const UC={'長さ':{m:1,km:1e3,cm:.01,mm:.001,'μm':1e-6,nm:1e-9,inch:.0254,ft:.3048,yard:.9144,mile:1609.344,'海里':1852,'尺':.30303,'AU(天文単位)':1.495978707e11,'光年':9.4607304725808e15},
'質量':{kg:1,g:.001,mg:1e-6,t:1e3,lb:.45359237,oz:.028349523125,'貫':3.75,'u(原子質量)':1.6605390666e-27},
'時間':{s:1,ms:.001,'μs':1e-6,min:60,h:3600,day:86400,week:604800,year:31557600},
'速度':{'m/s':1,'km/h':1/3.6,mph:.44704,knot:.514444,'マッハ(約)':340.3,'光速 c':299792458},
'面積':{'m²':1,'cm²':1e-4,'km²':1e6,ha:1e4,'a':100,'坪':3.305785,acre:4046.8564224,'ft²':.09290304},
'体積':{'m³':1,L:.001,mL:1e-6,'cm³':1e-6,'gal(US)':.003785411784,'cup(US)':2.365882365e-4,'合':1.8039e-4,'升':1.8039e-3},
'力':{N:1,kN:1e3,kgf:9.80665,dyn:1e-5,lbf:4.4482216152605},
'圧力':{Pa:1,hPa:100,kPa:1e3,MPa:1e6,bar:1e5,atm:101325,mmHg:133.322387415,psi:6894.757293168,'kgf/cm²':98066.5},
'エネルギー':{J:1,kJ:1e3,MJ:1e6,cal:4.184,kcal:4184,Wh:3600,kWh:3.6e6,eV:1.602176634e-19,erg:1e-7,BTU:1055.05585262},
'仕事率':{W:1,kW:1e3,MW:1e6,PS:735.49875,HP:745.69987158,'kcal/h':1.163},
'角度':{'度(°)':Math.PI/180,rad:1,'回転':2*Math.PI,grad:Math.PI/200},
'周波数':{Hz:1,kHz:1e3,MHz:1e6,GHz:1e9,rpm:1/60},
'データ量':{B:1,KB:1e3,MB:1e6,GB:1e9,TB:1e12,KiB:1024,MiB:1048576,GiB:1073741824,bit:.125},
'温度':{'℃':1,K:1,'℉':1}};
function ucConv(cat,val,from,to){if(cat==='温度'){const K={'℃':v=>v+273.15,K:v=>v,'℉':v=>(v-32)*5/9+273.15}[from](val);return{'℃':k=>k-273.15,K:k=>k,'℉':k=>(k-273.15)*9/5+32}[to](K)}return val*UC[cat][from]/UC[cat][to]}
// ---- グラフ描画（折れ線の汎用）
function xPlot(S,o){const W=o.W,H=300,L=48,Rr=12,Tp=12,B=30;let ys=[];S.forEach(s=>s.pts.forEach(p=>{if(Number.isFinite(p[1]))ys.push(p[1])}));
  if(!ys.length)return'<div style="padding:30px;text-align:center;color:'+DIM+'">この範囲では値が計算できません（式・範囲を確認してください）</div>';
  ys.sort((a,b)=>a-b);let lo=ys[0],hi=ys[ys.length-1];if(ys.length>20){const a=ys[Math.floor(ys.length*.01)],b=ys[Math.ceil(ys.length*.99)-1];if(hi-lo>(b-a)*3&&b>a){lo=a;hi=b}}
  if(lo===hi){lo-=1;hi+=1}const pad=(hi-lo)*.07,sc=niceScale(lo-pad,hi+pad,5),x0=o.xmin,x1=o.xmax;
  const px=x=>L+(x-x0)/(x1-x0)*(W-L-Rr),py=y=>Tp+(1-(y-sc.lo)/(sc.hi-sc.lo))*(H-Tp-B),af=v=>{const a=Math.abs(v);return a!==0&&(a>=1e5||a<1e-3)?(+v.toPrecision(3)).toExponential().replace('e+','e'):String(+v.toPrecision(4))};
  let svg=`<defs><clipPath id="xcp"><rect x="${L}" y="${Tp}" width="${W-L-Rr}" height="${H-Tp-B}"/></clipPath></defs>`;
  svg+=sc.ticks.map(v=>`<line x1="${L}" x2="${W-Rr}" y1="${py(v)}" y2="${py(v)}" stroke="${GRID}"/><text x="${L-6}" y="${py(v)+4}" fill="${DIM}" font-size="11" text-anchor="end">${af(v)}</text>`).join('');
  niceScale(x0,x1,6).ticks.filter(v=>v>=x0-1e-12&&v<=x1+1e-12).forEach(v=>{svg+=`<line x1="${px(v)}" x2="${px(v)}" y1="${Tp}" y2="${H-B}" stroke="${GRID}"/><text x="${px(v)}" y="${H-B+15}" fill="${DIM}" font-size="11" text-anchor="middle">${af(v)}</text>`});
  if(x0<0&&x1>0)svg+=`<line x1="${px(0)}" x2="${px(0)}" y1="${Tp}" y2="${H-B}" stroke="${DIM}"/>`;if(sc.lo<0&&sc.hi>0)svg+=`<line x1="${L}" x2="${W-Rr}" y1="${py(0)}" y2="${py(0)}" stroke="${DIM}"/>`;
  if(o.xl)svg+=`<text x="${W-Rr}" y="${H-3}" fill="${DIM}" font-size="12" text-anchor="end">${X(o.xl)}</text>`;if(o.yl)svg+=`<text x="${L+4}" y="${Tp+11}" fill="${DIM}" font-size="12">${X(o.yl)}</text>`;
  S.forEach((s,k)=>{let d='',pen=false,prev=null;s.pts.forEach(p=>{const y=p[1];if(!Number.isFinite(y)){pen=false;prev=null;return}
      if(prev!=null&&Math.abs(y-prev)>(hi-lo)*2&&(y>0)!==(prev>0))pen=false;d+=(pen?'L':'M')+px(p[0]).toFixed(1)+' '+py(y).toFixed(1)+' ';pen=true;prev=y});
    svg+=`<path d="${d.trim()}" clip-path="url(#xcp)" fill="none" stroke="${PAL[k%7]}" stroke-width="2.2" stroke-linejoin="round"/>`});
  const n=S[0].pts.length,st=Math.max(1,Math.ceil(n/160)),bw=(W-L-Rr)/(n/st);
  for(let i=0;i<n;i+=st){const x=S[0].pts[i][0];svg+=`<rect x="${px(x)-bw/2}" y="${Tp}" width="${bw}" height="${H-Tp-B}" fill="transparent" data-tip="${X('x = '+xfmt(x)+S.map(s=>'　'+(s.name||'y')+' = '+xfmt(s.pts[i][1])).join(''))}"/>`}
  const lg=S.length>1?'<div class="legend">'+S.map((s,k)=>`<span><i style="background:${PAL[k%7]}"></i>${X(s.name)}</span>`).join('')+'</div>':'';
  return `<svg id="xsvg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${svg}</svg>`+lg}

// ---- 計算ビュー
const CK='tp_calc_v1';
const FXP=[
 ['放物運動',['v0 = 20','th = 45°','y = x*tan(th) - g*x^2/(2*v0^2*cos(th)^2)'],0,42],
 ['単振動',['A = 2','w = 3','y = A*sin(w*x)'],0,6.3],
 ['減衰振動',['y = 3*exp(-0.3*x)*cos(4*x)','y2 = 3*exp(-0.3*x)','y3 = -3*exp(-0.3*x)'],0,15],
 ['RC充電',['V = 5','R = 1000','C = 0.001','y = V*(1-exp(-x/(R*C)))'],0,5],
 ['放射性崩壊',['y = 100*0.5^(x/5730)'],0,20000],
 ['正規分布',['m = 0','s = 1','y = exp(-(x-m)^2/(2*s^2))/(s*sqrt(2*pi))'],-4,4],
 ['二次関数',['y = x^2 - 2x - 3'],-3,5],
 ['三角関数',['y = sin(x)','y2 = cos(x)','y3 = tan(x)'],-6.3,6.3],
 ['自由落下の速さ',['y = g*x'],0,5],
 ['ばねの力と伸び',['k = 50','y = k*x'],0,1]];
const CS={mode:'calc',deg:false,src:'',hist:[],E:null,
  ph:{id:'newton',tgt:null,vals:{},gx:'',gmin:'',gmax:'',show:false},uc:{cat:'長さ',from:'m',val:'1'},fx:{text:FXP[0][1].join('\n'),xmin:'0',xmax:'42'},col:{expr:'',name:'',digits:''}};
try{const o=JSON.parse(localStorage.getItem(CK)||'{}');if(o.hist)CS.hist=o.hist.slice(-40);if(o.deg!=null)CS.deg=!!o.deg;if(o.fx)CS.fx=o.fx;if(o.src)CS.src=o.src}catch(e){}
function csSave(){try{localStorage.setItem(CK,JSON.stringify({hist:CS.hist.slice(-40),deg:CS.deg,fx:CS.fx,src:CS.src}))}catch(e){}}
function csEnv(){if(!CS.E)CS.E=xEnv(CS.deg);CS.E.deg=CS.deg;return CS.E}
function renderCalc(){const modes=[['calc','式電卓'],['phys','物理公式'],['unit','単位換算'],['fx','関数グラフ'],['col','計算列']];
  $('xv').innerHTML='<div class="chips" style="margin-bottom:10px">'+modes.map(([k,l])=>`<button class="chip${CS.mode===k?' on':''}" data-xm="${k}">${l}</button>`).join('')+'</div><div id="xbody"></div><div id="xtip" style="min-height:22px;font-size:13px;color:var(--gold);padding:6px 4px 0;font-weight:700"></div>';
  ({calc:xCalcUI,phys:xPhysUI,unit:xUnitUI,fx:xFxUI,col:xColUI})[CS.mode]()}
// ---- 式電卓
const QK=['(',')','^','√(','π','e','sin(','cos(','tan(','ln(','log(','×','÷','!','°','ans'];
function xCalcUI(){const E=csEnv(),vs=Object.keys(E.vars).filter(k=>k!=='ans');
  $('xbody').innerHTML=`<textarea id="xIn" class="lin" rows="4" spellcheck="false" placeholder="例）2*(3+4)^2　／　x=5 のあと x^2+3x　／　f(a,b)=a*b+1 のあと f(2,3)　／　sin(30°)">${X(CS.src)}</textarea>
  <div class="chips" style="margin:8px 0">${QK.map(k=>`<button class="chip" data-xq="${X(k)}">${X(k)}</button>`).join('')}</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px"><button class="pri" id="xGo" style="flex:1">＝ 計算</button><button id="xDeg" class="chip${CS.deg?' on':''}">${CS.deg?'角度：度':'角度：ラジアン'}</button><button id="xClr">入力を消す</button></div>
  ${vs.length?`<div style="font-size:12px;color:var(--dim);margin-bottom:6px">覚えている値：${vs.map(k=>`<button class="chip" data-xq="${X(k)}">${X(k)} = ${X(xfmt(E.vars[k]))}</button>`).join(' ')} <button class="chip" id="xVclr">忘れる</button></div>`:''}
  <div id="xRes"></div>
  <details class="sec"><summary style="font-size:13px;color:var(--dim);font-weight:700">使える関数・定数</summary><div style="font-size:13px;line-height:1.8;margin-top:6px"><b>四則</b> + − × ÷ ^（べき乗） % ! ( )　<b>省略</b> 2π、3(4+1)、2x もOK<br><b>関数</b> sin cos tan asin acos atan atan2 sinh cosh tanh sqrt cbrt exp ln log（常用対数、log(x,底)も可） log2 abs floor ceil round(x,桁) hypot ncr npr fact mod gcd lcm min max sum avg if(条件,真,偽)<br><b>定数</b> pi e g(9.80665) c(光速) G h ħ=hbar kB NA R eps0 mu0 qe me mp sigma atm ke amu<br><b>自分で定義</b> a=3 ／ f(x)=x^2+1<br><b>°</b> は「度」を表します（30° はどちらのモードでも30度）。ans は直前の答えです。</div></details>`;xHist()}
function xHist(){const h=CS.hist.slice().reverse();$('xRes').innerHTML=h.length?h.map((r,i)=>`<div class="lcard" data-xh="${CS.hist.length-1-i}" style="padding:8px 12px"><div style="font-size:13px;color:var(--dim);word-break:break-all">${X(r.s)}</div><div style="font-size:20px;font-weight:700;${r.e?'color:var(--red);font-size:14px':'color:var(--gold)'};word-break:break-all">${r.e?X(r.o):'= '+X(r.o)}</div></div>`).join('')+'<div style="font-size:12px;color:var(--dim)">答えをタップするとコピー。<button class="chip" id="xHclr">履歴を消す</button></div>':''}
function xRunCalc(){const E=csEnv(),ta=$('xIn');CS.src=ta.value;const lines=ta.value.split(/\n|;/).map(s=>s.trim()).filter(Boolean);
  lines.forEach(s=>{try{const v=xStmt(s,E);if(typeof v==='number')E.vars.ans=v;CS.hist.push({s,o:xfmt(v)})}catch(e){CS.hist.push({s,o:e.message,e:1})}});
  if(CS.hist.length>40)CS.hist=CS.hist.slice(-40);csSave();xCalcUI()}
// ---- 物理公式
function phNum(str){const s=String(str==null?'':str).trim();if(!s)return null;try{const v=xEv(xParse(s),xEnv(true));return Number.isFinite(v)?v:null}catch(e){return null}}
function xPhysUI(){const P=CS.ph,f=phF(P.id)||PH[0],vs=phVars(f);if(!P.tgt||!vs.some(v=>v.k===P.tgt))P.tgt=vs[0].k;
  const cat=f[0];
  $('xbody').innerHTML=`<div class="chips" style="margin-bottom:8px">${PHCAT.map(c=>`<button class="chip${c===cat?' on':''}" data-phc="${c}">${c}</button>`).join('')}</div>
  <div class="chips" style="margin-bottom:10px">${PH.filter(x=>x[0]===cat).map(x=>`<button class="chip${x[1]===f[1]?' on':''}" data-phf="${x[1]}">${X(x[2])}</button>`).join('')}</div>
  <div class="sec"><div style="font-size:12px;color:var(--dim)">${X(f[2])}</div><div style="font-size:24px;font-weight:700;margin:4px 0 10px">${X(f[3])}</div>
  ${vs.map(v=>`<div class="prow"><div class="pl"><b>${X(v.k)}</b> ${X(v.n)}</div><input class="lin" data-pv="${v.k}" inputmode="decimal" value="${X(P.vals[v.k]||'')}" ${v.k===P.tgt?'disabled':''} placeholder="数値 or 式"><span class="pu">${X(v.u)}</span><button class="chip${v.k===P.tgt?' on':''}" data-pt="${v.k}">求める</button></div>`).join('')}
  <div id="pOut" style="margin-top:8px"></div></div>
  <div class="sec"><h4>📈 値を変えてグラフにする</h4><div class="ctl"><div><label>横軸（変化させる値）</label><select id="pGx">${vs.filter(v=>v.k!==P.tgt).map(v=>`<option value="${v.k}"${P.gx===v.k?' selected':''}>${X(v.k+' '+v.n)}</option>`).join('')}</select></div><div></div><div><label>最小</label><input class="lin" id="pGmin" inputmode="decimal" value="${X(P.gmin)}"></div><div><label>最大</label><input class="lin" id="pGmax" inputmode="decimal" value="${X(P.gmax)}"></div></div>
  <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="pri" id="pGo">グラフを描く</button><button id="pGtbl">＋ 表にする</button><button id="pGpng">🖼 画像</button></div><div id="pGraph" style="margin-top:8px"></div></div>
  <div style="font-size:12px;color:var(--dim);line-height:1.6">角度は「度」で入力します。定数（g=9.80665、G、c、k_B など）は自動で使われます。数値の代わりに <b>2*pi</b> や <b>3e8</b> のような式も入力できます。</div>`;
  physOut();if(P.show)physGraph()}
function physVals(f,P){const vs=phVars(f),o={};let miss=[];vs.forEach(v=>{if(v.k===P.tgt)return;const n=phNum(P.vals[v.k]);if(n==null)miss.push(v.n);else o[v.k]=n});return{o,miss,vs}}
function physOut(){const P=CS.ph,f=phF(P.id),{o,miss,vs}=physVals(f,P),box=$('pOut');if(!box)return;const tv=vs.find(v=>v.k===P.tgt);
  if(miss.length){box.innerHTML=`<div style="font-size:13px;color:var(--dim)">あと「${X(miss.join('」「'))}」を入れると、${X(tv.n)}（${X(tv.k)}）が出ます。</div>`;return}
  const r=phSolve(f,P.tgt,o),ex=f[5][P.tgt].split('|')[0];
  if(!r.length){box.innerHTML='<div style="color:var(--red);font-size:14px">この値の組み合わせでは答えが出ません（0で割る・負の数の平方根・範囲外の角度など）。</div>';return}
  const inp=document.querySelector('[data-pv="'+P.tgt+'"]');if(inp)inp.value=xfmt(r[0]);
  const sub=ex.replace(/[A-Za-z_][A-Za-z0-9_]*/g,w=>(w in o)?'('+xfmt(o[w])+')':w);
  box.innerHTML=`<div style="font-size:12px;color:var(--dim)">${X(tv.n)}（${X(tv.k)}）</div><div style="font-size:24px;font-weight:700;color:var(--gold);word-break:break-all">${r.map(x=>X(xfmt(x))).join('　または　')} <span style="font-size:15px">${X(tv.u)}</span></div>
  <div style="font-size:12px;color:var(--dim);margin-top:6px;word-break:break-all">${X(tv.k)} = ${X(ex)}<br>　= ${X(sub)}</div><button class="chip" data-xcopy="${X(xfmt(r[0]))}" style="margin-top:6px">答えをコピー</button>`}
function physSeries(){const P=CS.ph,f=phF(P.id),{o,miss,vs}=physVals(f,P),gx=P.gx&&P.gx!==P.tgt?P.gx:vs.find(v=>v.k!==P.tgt).k;P.gx=gx;
  if(!P.gmin&&!P.gmax){const c=o[gx];P.gmin=c>0?'0':String(c==null?-1:-Math.abs(c)*2);P.gmax=c>0?String(+(c*2).toPrecision(4)):String(c==null?1:Math.abs(c)*2||1)}
  const a=phNum(P.gmin),b=phNum(P.gmax);if(a==null||b==null||a===b)return null;const pts=[];for(let i=0;i<=120;i++){const x=a+(b-a)*i/120,v=Object.assign({},o,{[gx]:x}),r=phSolve(f,P.tgt,v);pts.push([x,r.length?r[0]:NaN])}
  const gv=vs.find(v=>v.k===gx),tv=vs.find(v=>v.k===P.tgt);return{pts,a,b,gv,tv,miss}}
function physGraph(){const P=CS.ph,box=$('pGraph');if(!box)return;P.show=true;const S=physSeries(),f=phF(P.id);if(!S){box.innerHTML='<div style="font-size:13px;color:var(--dim)">範囲（最小・最大）を数値で入れてください</div>';return}
  const sel=$('pGx');if(sel)sel.value=P.gx;if($('pGmin'))$('pGmin').value=P.gmin;if($('pGmax'))$('pGmax').value=P.gmax;
  if(S.miss.length){box.innerHTML=`<div style="font-size:13px;color:var(--dim)">先に「${X(S.miss.join('」「'))}」を入れてください</div>`;return}
  box.innerHTML=xPlot([{name:S.tv.n,pts:S.pts}],{W:Math.max(260,$('xv').clientWidth-40),xmin:S.a,xmax:S.b,xl:S.gv.k+'（'+S.gv.u+'）',yl:S.tv.k+'（'+S.tv.u+'）'})}
// ---- 単位換算
function xUnitUI(){const U=CS.uc,cats=Object.keys(UC);if(!UC[U.cat])U.cat='長さ';if(!UC[U.cat][U.from])U.from=Object.keys(UC[U.cat])[0];
  $('xbody').innerHTML=`<div class="chips" style="margin-bottom:10px">${cats.map(c=>`<button class="chip${c===U.cat?' on':''}" data-ucc="${c}">${c}</button>`).join('')}</div>
  <div class="ctl"><div><label>数値</label><input class="lin" id="ucV" inputmode="decimal" value="${X(U.val)}"></div><div><label>この単位から</label><select id="ucF">${Object.keys(UC[U.cat]).map(u=>`<option${u===U.from?' selected':''}>${X(u)}</option>`).join('')}</select></div></div><div id="ucOut" style="margin-top:10px"></div>`;ucOut()}
function ucOut(){const U=CS.uc,v=phNum(U.val),box=$('ucOut');if(!box)return;if(v==null){box.innerHTML='<div style="font-size:13px;color:var(--dim)">数値を入れてください</div>';return}
  box.innerHTML=Object.keys(UC[U.cat]).map(u=>{const r=ucConv(U.cat,v,U.from,u);return`<div class="srow" data-xcopy="${X(xfmt(r))}" style="cursor:pointer"><span>${X(u)}</span><b>${X(xfmt(r))}</b></div>`}).join('')+'<div style="font-size:12px;color:var(--dim);margin-top:6px">行をタップすると数値をコピーします</div>'}
// ---- 関数グラフ
function fxRun(){const F=CS.fx,E=xEnv(CS.deg),fns=[],err=[];
  String(F.text).split(/\n/).map(s=>s.trim()).filter(Boolean).forEach(line=>{try{let m;
    if(m=line.match(/^([A-Za-z_]\w*)\s*\(\s*x\s*\)\s*=(?!=)(.*)$/)){fns.push({name:m[1]+'(x)',src:m[2],ast:xParse(m[2])});E.funcs[m[1]]={p:['x'],ast:xParse(m[2])}}
    else if(m=line.match(/^y\d*\s*=(?!=)(.*)$/)){fns.push({name:line.split('=')[0].trim(),src:m[1],ast:xParse(m[1])})}
    else if(/^[A-Za-z_À-￿][\wÀ-￿]*\s*(\([^)]*\))?\s*=(?!=)/.test(line)){xStmt(line,E)}
    else{const T=xTok(line);if(T.some(t=>t.t==='id'&&t.v==='x'))fns.push({name:'y',src:line,ast:xParse(line)});else xStmt(line,E)}}catch(e){err.push(line+' → '+e.message)}});
  const a=phNum(F.xmin),b=phNum(F.xmax);return{E,fns,err,a,b}}
function fxSample(R,fn,n){const out=[],{E,a,b}=R;for(let i=0;i<=n;i++){const x=a+(b-a)*i/n;E.vars.x=x;let y=NaN;try{y=xEv(fn.ast,E);if(typeof y!=='number')y=NaN}catch(e){y=NaN}out.push([x,y])}return out}
function xFxUI(){const F=CS.fx;$('xbody').innerHTML=`<div class="chips" style="margin-bottom:8px">${FXP.map((p,i)=>`<button class="chip" data-fxp="${i}">${p[0]}</button>`).join('')}</div>
  <textarea id="fxT" class="lin" rows="6" spellcheck="false" style="font-family:ui-monospace,Menlo,monospace">${X(F.text)}</textarea>
  <div style="font-size:12px;color:var(--dim);margin:4px 0 8px;line-height:1.6">1行に1つ。<b>y = …x…</b> がグラフになります（y2、y3 で重ねて描画）。<b>a = 3</b> のように値を決めておけます。<b>f(x) = …</b> も使えます。</div>
  <div class="ctl"><div><label>x の最小</label><input class="lin" id="fxA" inputmode="decimal" value="${X(F.xmin)}"></div><div><label>x の最大</label><input class="lin" id="fxB" inputmode="decimal" value="${X(F.xmax)}"></div></div>
  <div style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap"><button class="pri" id="fxGo">グラフを描く</button><button id="xDeg" class="chip${CS.deg?' on':''}">${CS.deg?'角度：度':'角度：ラジアン'}</button><button id="fxTbl">＋ 表にする</button><button id="fxPng">🖼 画像</button></div><div id="fxG"></div><div id="fxA2"></div>`;fxDraw()}
function fxDraw(){const R=fxRun(),box=$('fxG');let h='';if(R.err.length)h+='<div style="color:var(--red);font-size:13px;margin-bottom:6px">'+R.err.map(X).join('<br>')+'</div>';
  if(R.a==null||R.b==null||R.a>=R.b){box.innerHTML=h+'<div style="color:var(--dim);font-size:13px">x の最小・最大を数値で入れてください（最小＜最大）</div>';$('fxA2').innerHTML='';return}
  if(!R.fns.length){box.innerHTML=h+'<div style="color:var(--dim);font-size:13px">「y = …x…」の行がありません</div>';$('fxA2').innerHTML='';return}
  const S=R.fns.slice(0,7).map(fn=>({name:fn.name+' = '+fn.src.trim(),pts:fxSample(R,fn,400)}));
  box.innerHTML=h+xPlot(S,{W:Math.max(260,$('xv').clientWidth-24),xmin:R.a,xmax:R.b,xl:'x',yl:'y'});
  let an='';S.forEach((s,k)=>{const fn=R.fns[k],fin=s.pts.filter(p=>Number.isFinite(p[1]));if(!fin.length)return;
    const zs=[];for(let i=1;i<s.pts.length&&zs.length<6;i++){const p=s.pts[i-1],q=s.pts[i];if(!Number.isFinite(p[1])||!Number.isFinite(q[1]))continue;if(p[1]===0){zs.push(p[0]);continue}
      if(p[1]*q[1]<0&&Math.abs(p[1])<1e6&&Math.abs(q[1])<1e6){let lo=p[0],hi=q[0],fl=p[1];for(let j=0;j<50;j++){const mid=(lo+hi)/2;R.E.vars.x=mid;let ym;try{ym=xEv(fn.ast,R.E)}catch(e){break}if(ym*fl<=0)hi=mid;else{lo=mid;fl=ym}}zs.push((lo+hi)/2)}}
    const mx=fin.reduce((a,b)=>b[1]>a[1]?b:a),mn=fin.reduce((a,b)=>b[1]<a[1]?b:a);let integ='—';if(fin.length===s.pts.length){const n=s.pts.length-1,h=(R.b-R.a)/n;if(n%2===0){let sm=s.pts[0][1]+s.pts[n][1];for(let i=1;i<n;i++)sm+=s.pts[i][1]*(i%2?4:2);integ=xfmt(sm*h/3)}}
    an+=`<div class="shead" style="color:${PAL[k%7]}">${X(fn.name)} = ${X(fn.src.trim())}</div><div class="srow"><span>x軸と交わる点（ゼロ点）</span><b>${zs.length?zs.map(z=>X(xfmt(+z.toPrecision(8)))).join('、'):'なし'}</b></div><div class="srow"><span>最大（範囲内）</span><b>${X(xfmt(mx[1]))}（x=${X(xfmt(+mx[0].toPrecision(6)))}）</b></div><div class="srow"><span>最小（範囲内）</span><b>${X(xfmt(mn[1]))}（x=${X(xfmt(+mn[0].toPrecision(6)))}）</b></div><div class="srow"><span>面積（∫ y dx、範囲全体）</span><b>${X(integ)}</b></div>`});
  $('fxA2').innerHTML=an?'<div class="sec" style="margin-top:10px"><h4>数値で見る</h4>'+an+'</div>':''}
// ---- 計算列
function colPresets(t){const I=info(t),ns=I.names.filter((_,i)=>I.types[i]==='num'),a=ns[0],b=ns[1]||ns[0];if(!a)return[];
  return[['A×B',`[${a}]*[${b}]`],['構成比(%)',`構成比([${a}])`],['累計',`累計([${a}])`],['前行との差',`[${a}]-前行([${a}])`],['前行比(%)',`([${a}]/前行([${a}])-1)*100`],['移動平均(3)',`移動平均([${a}],3)`],['平均との差',`[${a}]-平均([${a}])`],['標準化(偏差値風)',`標準化([${a}])*10+50`],['順位',`順位([${a}])`],['税込(10%)',`[${a}]*1.1`],['もし〜なら',`もし([${a}]>平均([${a}]),1,0)`]]}
function xColUI(){const t=T();if(!t){$('xbody').innerHTML='<div style="color:var(--dim)">表がありません</div>';return}const I=info(t),C=CS.col;
  $('xbody').innerHTML=`<div style="font-size:13px;color:var(--dim);line-height:1.6;margin-bottom:8px">表の列を式で計算して、新しい列として追加します。<b>[列名]</b> でその行の値、<b>合計([列名])</b> のように書くと列全体の集計が使えます。</div>
  <div class="chips" style="margin-bottom:8px">${I.names.map(n=>`<button class="chip" data-xq="[${X(n)}]">${X(n)}</button>`).join('')}</div>
  <textarea id="cxE" class="lin" rows="2" spellcheck="false" placeholder="例）[単価]*[数量]　／　[売上]/合計([売上])*100">${X(C.expr)}</textarea>
  <div class="chips" style="margin:8px 0">${['+','-','*','/','(',')','^','合計(','平均(','最大(','最小(','累計(','前行(','移動平均(','もし(','round('].map(k=>`<button class="chip" data-xq="${X(k)}">${X(k)}</button>`).join('')}</div>
  <div class="ctl"><div><label>新しい列の名前</label><input class="lin" id="cxN" value="${X(C.name)}" placeholder="例）金額"></div><div><label>小数の桁数</label><select id="cxD"><option value="">自動</option>${[0,1,2,3,4].map(n=>`<option value="${n}"${String(C.digits)===String(n)?' selected':''}>${n}桁</option>`).join('')}</select></div></div>
  <div style="display:flex;gap:8px;margin:8px 0"><button id="cxPv">確認（先頭5行）</button><button class="pri" id="cxGo">＋ 列を追加</button></div><div id="cxOut"></div>
  <div class="sec"><h4>よく使う式（タップで入力）</h4><div class="chips">${colPresets(t).map(([l,e],i)=>`<button class="chip" data-cxp="${i}">${X(l)}</button>`).join('')||'<span style="color:var(--dim);font-size:13px">数字の列がありません</span>'}</div></div>`}
function colCalc(t,expr,digits){const I=info(t),ast=xParse(expr),ctx=(function(){const cache={};const find=nm=>{let i=I.names.indexOf(nm);if(i<0){const m=String(nm).match(/^([A-Za-z]+)列?$/);if(m){let n=0;for(const ch of m[1].toUpperCase())n=n*26+ch.charCodeAt(0)-64;i=n-1}}if(i<0||i>=I.w)throw new Error('列「'+nm+'」がありません');return i};
    const all=nm=>{const i=find(nm);return cache[i]||(cache[i]=I.body.map(r=>{const v=num(r[i]);return v==null?NaN:v}))};
    const c={idx:0,all,colVec:nm=>all(nm).filter(Number.isFinite),val:nm=>{const i=find(nm),v=all(nm)[c.idx];if(Number.isNaN(v)){const s=String(I.body[c.idx][i]==null?'':I.body[c.idx][i]).trim();return s===''?NaN:s}return v}};return c})();
  const E=xEnv(CS.deg);E.ctx=ctx;const out=[];let firstErr=null,bad=0;
  I.body.forEach((_,i)=>{ctx.idx=i;let v;try{v=xEv(ast,E)}catch(e){throw e}
    if(typeof v==='string')out.push(v);else if(!Number.isFinite(v)){out.push('');bad++}else out.push(digits===''||digits==null?String(+v.toPrecision(12)):v.toFixed(+digits))});
  return{out,bad,firstErr}}
// ---- イベント
$('xv').addEventListener('click',e=>{let b;const t=T();
  if($('fxT')){CS.fx.text=$('fxT').value;CS.fx.xmin=$('fxA').value;CS.fx.xmax=$('fxB').value}
  if(b=e.target.closest('[data-xm]')){CS.mode=b.dataset.xm;renderCalc();return}
  if(b=e.target.closest('[data-xq]')){const ta=$('xIn')||$('cxE');if(!ta)return;const s=b.dataset.xq,a=ta.selectionStart==null?ta.value.length:ta.selectionStart,z=ta.selectionEnd==null?a:ta.selectionEnd;ta.value=ta.value.slice(0,a)+s+ta.value.slice(z);ta.focus();ta.selectionStart=ta.selectionEnd=a+s.length;if(ta.id==='xIn')CS.src=ta.value;else CS.col.expr=ta.value;return}
  if(b=e.target.closest('[data-xcopy]')){copyOut(b.dataset.xcopy,'コピーしました');return}
  if(e.target.closest('#xGo')){xRunCalc();return}
  if(e.target.closest('#xClr')){CS.src='';csSave();xCalcUI();return}
  if(e.target.closest('#xDeg')){CS.deg=!CS.deg;csSave();CS.mode==='fx'?(CS.fx.text=$('fxT').value,xFxUI()):(CS.src=$('xIn').value,xCalcUI());return}
  if(e.target.closest('#xVclr')){CS.E=null;xCalcUI();return}
  if(e.target.closest('#xHclr')){CS.hist=[];csSave();xCalcUI();return}
  if(b=e.target.closest('[data-xh]')){const r=CS.hist[+b.dataset.xh];if(r&&!r.e)copyOut(r.o,'答えをコピーしました');return}
  // 物理
  if(b=e.target.closest('[data-phc]')){const f=PH.find(x=>x[0]===b.dataset.phc);CS.ph={id:f[1],tgt:null,vals:{},gx:'',gmin:'',gmax:'',show:false};xPhysUI();return}
  if(b=e.target.closest('[data-phf]')){CS.ph={id:b.dataset.phf,tgt:null,vals:{},gx:'',gmin:'',gmax:'',show:false};xPhysUI();return}
  if(b=e.target.closest('[data-pt]')){const P=CS.ph;document.querySelectorAll('[data-pv]').forEach(i=>{if(!i.disabled)P.vals[i.dataset.pv]=i.value});P.tgt=b.dataset.pt;P.gx='';P.gmin='';P.gmax='';xPhysUI();return}
  if(e.target.closest('#pGo')){const P=CS.ph;P.gx=$('pGx').value;P.gmin=$('pGmin').value;P.gmax=$('pGmax').value;physGraph();return}
  if(e.target.closest('#pGpng')){savePng($('xsvg'),'physics-graph');return}
  if(e.target.closest('#pGtbl')){const P=CS.ph;P.gx=$('pGx').value;P.gmin=$('pGmin').value;P.gmax=$('pGmax').value;const S=physSeries();if(!S||S.miss.length){toast('先に他の値と範囲を入れてください');return}
    const f=phF(P.id),d=[[S.gv.n+'（'+S.gv.u+'）',S.tv.n+'（'+S.tv.u+'）']];for(let i=0;i<=100;i++){const x=S.a+(S.b-S.a)*i/100,o=physVals(f,P).o;o[P.gx]=x;const r=phSolve(f,P.tgt,o);d.push([String(+x.toPrecision(8)),r.length?String(+r[0].toPrecision(8)):''])}
    newTable(f[2]+'（'+S.gv.k+'を変化）',d);return}
  // 単位
  if(b=e.target.closest('[data-ucc]')){CS.uc.cat=b.dataset.ucc;CS.uc.from=Object.keys(UC[CS.uc.cat])[0];xUnitUI();return}
  // 関数グラフ
  if(b=e.target.closest('[data-fxp]')){const p=FXP[+b.dataset.fxp];CS.fx={text:p[1].join('\n'),xmin:String(p[2]),xmax:String(p[3])};csSave();xFxUI();return}
  if(e.target.closest('#fxGo')){CS.fx.text=$('fxT').value;CS.fx.xmin=$('fxA').value;CS.fx.xmax=$('fxB').value;csSave();fxDraw();return}
  if(e.target.closest('#fxPng')){savePng($('xsvg'),'function-graph');return}
  if(e.target.closest('#fxTbl')){CS.fx.text=$('fxT').value;CS.fx.xmin=$('fxA').value;CS.fx.xmax=$('fxB').value;const R=fxRun();if(R.a==null||R.b==null||R.a>=R.b||!R.fns.length){toast('式と範囲を確認してください');return}
    const cols=R.fns.slice(0,7).map(fn=>fxSample(R,fn,100)),d=[['x'].concat(R.fns.slice(0,7).map(f=>f.name))];for(let i=0;i<=100;i++)d.push([String(+cols[0][i][0].toPrecision(8))].concat(cols.map(c=>Number.isFinite(c[i][1])?String(+c[i][1].toPrecision(8)):'')));newTable('関数の値',d);return}
  if(b=e.target.closest('[data-cxp]')){const p=colPresets(t)[+b.dataset.cxp];CS.col.expr=p[1];CS.col.name=CS.col.name||p[0];xColUI();return}
  if(e.target.closest('#cxPv')||e.target.closest('#cxGo')){const go=!!e.target.closest('#cxGo');CS.col.expr=$('cxE').value;CS.col.name=$('cxN').value.trim();CS.col.digits=$('cxD').value;
    if(!CS.col.expr.trim()){$('cxOut').innerHTML='<div style="color:var(--red);font-size:13px">式を入れてください</div>';return}
    try{const R=colCalc(t,CS.col.expr,CS.col.digits);
      if(!go){const I=info(t);$('cxOut').innerHTML='<div class="pv"><table><tr><th>行</th><th>結果</th></tr>'+R.out.slice(0,5).map((v,i)=>`<tr><td>${i+1}</td><td>${X(v===''?'（計算できず空欄）':v)}</td></tr>`).join('')+'</table></div>'+(R.bad?`<div style="font-size:12px;color:var(--gold);margin-top:4px">${R.bad}行は計算できず空欄になります${R.firstErr?'（'+X(R.firstErr)+'）':''}</div>`:'');return}
      if(!CS.col.name){$('cxOut').innerHTML='<div style="color:var(--red);font-size:13px">新しい列の名前を入れてください</div>';return}
      push();const off=t.header?1:0;t.d.forEach((row,i)=>row.push(i<off?CS.col.name:R.out[i-off]));touch();csSave();VIEW='t';sel={r:0,c:t.d[0].length-1};render();toast('列「'+CS.col.name+'」を追加しました'+(R.bad?'（'+R.bad+'行は空欄）':'')+'。元に戻すは ↶')}
    catch(err){$('cxOut').innerHTML='<div style="color:var(--red);font-size:13px">'+X(err.message)+'</div>'}return}
  const tp=e.target.closest('[data-tip]');if(tp&&$('xtip'))$('xtip').textContent=tp.getAttribute('data-tip')});
$('xv').addEventListener('input',e=>{const el=e.target,P=CS.ph;
  if(el.dataset&&el.dataset.pv){P.vals[el.dataset.pv]=el.value;physOut();if(P.show)physGraph();return}
  if(el.id==='ucV'){CS.uc.val=el.value;ucOut();return}
  if(el.id==='xIn'){CS.src=el.value;return}if(el.id==='cxE')CS.col.expr=el.value;if(el.id==='cxN')CS.col.name=el.value});
$('xv').addEventListener('change',e=>{const el=e.target;if(el.id==='ucF'){CS.uc.from=el.value;ucOut()}else if(el.id==='pGx'){CS.ph.gx=el.value;CS.ph.gmin='';CS.ph.gmax='';physGraph()}});

// ===================== 集合（ベン図・重なりの明記・表とフローへ・メモ/辞書の受け取り） =====================
const SSK='tp_sets_v1',SL='ABCDEF';
const SS={mode:'recv',recs:[],gmap:new Map(),picked:[],sel:null,expr:'',exp:{},q:'',box:'quick-ref',raw:null,rawN:0,skip:0,lab:'',grp:'',split:true,paste:'',msg:'',lc:-1,gc:-1};
try{const o=JSON.parse(localStorage.getItem(SSK)||'{}');['box','paste','split'].forEach(k=>{if(o[k]!=null)SS[k]=o[k]})}catch(e){}
function ssSave(){try{localStorage.setItem(SSK,JSON.stringify({box:SS.box,paste:SS.paste.slice(0,20000),split:SS.split}))}catch(e){}}
const ssClean=s=>{let x=String(s==null?'':s);if(/[<>]/.test(x)){try{x=new DOMParser().parseFromString(x,'text/html').body.textContent||''}catch(e){}}return x.replace(/\s+/g,' ').trim()};
const ssSplit=(v,on)=>{const x=String(v==null?'':v).trim();if(!x)return[];return(on?x.split(/[、,，;；\/／・|｜\n]+/):[x]).map(s=>s.trim()).filter(Boolean)};
function ssBuild(list){const M=new Map();list.forEach(r=>{if(!r.l)return;const k=r.k||r.l;let o=M.get(k);if(!o){o={k,l:r.l,g:[]};M.set(k,o)}r.g.forEach(g=>{if(!o.g.includes(g))o.g.push(g)})});
  SS.recs=[...M.values()];const gm=new Map();SS.recs.forEach(r=>r.g.forEach(g=>{if(!gm.has(g))gm.set(g,new Set());gm.get(g).add(r.k)}));SS.gmap=gm;SS.sel=null;SS.exp={};SS.expr='';
  SS.picked=SS.picked.filter(g=>gm.has(g));if(SS.picked.length<2)ssAuto();}
function ssAuto(){const gs=[...SS.gmap.keys()];if(!gs.length){SS.picked=[];return}
  const inter=(a,b)=>{let n=0;SS.gmap.get(a).forEach(k=>{if(SS.gmap.get(b).has(k))n++});return n};
  const top=gs.sort((a,b)=>SS.gmap.get(b).size-SS.gmap.get(a).size).slice(0,40);let best=null,bs=-1;
  for(let i=0;i<top.length;i++)for(let j=i+1;j<top.length;j++){const n=inter(top[i],top[j]);const u=SS.gmap.get(top[i]).size+SS.gmap.get(top[j]).size-n;const s=n?n*2+n/u:-1;if(s>bs){bs=s;best=[top[i],top[j]]}}
  if(!best){SS.picked=top.slice(0,Math.min(2,top.length));return}
  let third=null,ts=0;top.forEach(g=>{if(best.includes(g))return;const n=best.reduce((p,b)=>p+inter(g,b),0);if(n>ts){ts=n;third=g}});SS.picked=third?best.concat([third]):best;SS.sel=null}
// ---- 材料の作り方
function ssFromTable(t,lc,gc,split){const I=info(t),out=[];I.body.forEach(r=>{const l=String(r[lc]==null?'':r[lc]).trim();if(!l)return;out.push({k:l,l,g:ssSplit(r[gc],split)})});return out}
function ssFromPaste(text){const out=[];String(text).split(/\r?\n/).forEach(line=>{line=line.trim();if(!line||line[0]==='#')return;let m;
    if(m=line.match(/^([^:：\t]+)[:：]\s*(.+)$/)){const g=m[1].trim();ssSplit(m[2],true).forEach(x=>out.push({k:x,l:x,g:[g]}))}
    else if(m=line.match(/^([^\t]+)\t(.+)$/)){out.push({k:m[1].trim(),l:m[1].trim(),g:ssSplit(m[2],true)})}
    else out.push({k:line,l:line,g:[]})});return out}
function ssRecords(data){if(Array.isArray(data))return data;if(data&&typeof data==='object'){for(const k of ['entries','items','memos','notes','records','cards','words']){const v=data[k];if(Array.isArray(v)&&v.length&&typeof v[0]==='object')return v}let best=null;for(const k of Object.keys(data)){const v=data[k];if(Array.isArray(v)&&v.length&&typeof v[0]==='object'&&(!best||v.length>best.length))best=v}
    if(best)return best;const vals=Object.values(data);if(vals.length&&vals.every(v=>v&&typeof v==='object'&&!Array.isArray(v)))return vals}return null}
function ssFields(arr){const F={};arr.slice(0,300).forEach(r=>{if(!r||typeof r!=='object')return;Object.keys(r).forEach(k=>{const v=r[k];const f=F[k]||(F[k]={k,s:0,a:0,vals:new Set(),len:0});
    if(typeof v==='string'||typeof v==='number'){f.s++;f.len+=String(v).length;f.vals.add(String(v))}else if(Array.isArray(v)&&v.every(x=>typeof x==='string'||typeof x==='number')){f.a++;v.forEach(x=>f.vals.add(String(x)))}})});
  return Object.values(F).filter(f=>f.s+f.a>0).map(f=>({k:f.k,arr:f.a>f.s,n:f.vals.size,avg:f.s?f.len/f.s:0}))}
function ssRaw(arr){let skip=0;const L=[];arr.forEach(r=>{if(!r||typeof r!=='object')return;if(r.sensitive===true||r.protected===true||r.encrypted===true){skip++;return}L.push(r)});SS.raw=L;SS.rawN=L.length;SS.skip=skip;
  const F=ssFields(L);const pickL=['title','word','term','name','label','front','q','text','body'].find(k=>F.some(f=>f.k===k&&!f.arr));SS.lab=pickL||(F.find(f=>!f.arr)||{}).k||'';
  const pickG=['tags','category','categories','genre','group','kind','type','shelf','field','tag'].find(k=>F.some(f=>f.k===k));SS.grp=pickG||(F.filter(f=>!f.arr&&f.n>=2&&f.n<=40&&f.k!==SS.lab)[0]||{}).k||'';SS.fl=F}
function ssFromRaw(){const out=[];SS.raw.forEach((r,i)=>{let l=ssClean(r[SS.lab]);if(l.length>40)l=l.slice(0,40)+'…';if(!l)l='(無題)';const gv=r[SS.grp];const g=Array.isArray(gv)?gv.map(x=>String(x).trim()).filter(Boolean):ssSplit(gv,SS.split);out.push({k:r.id!=null?String(r.id):l+'#'+i,l,g})});return out}
function ssIngest(p){if(!p)return false;
  if(p.sets&&Array.isArray(p.sets)){const L=[];p.sets.forEach(s=>(s.items||[]).forEach(x=>L.push({k:String(x),l:ssClean(x),g:[String(s.name||'集合')]})));if(!L.length)return false;ssBuild(L);SS.msg='受け取りました（集合 '+p.sets.length+'個）';return true}
  const a=ssRecords(p);if(a&&a.length){ssRaw(a);SS.mode='recv';SS.msg='受け取りました（'+SS.rawN+'件）。名前と分け方の項目を確かめて「集合にする」を押してください';return true}return false}
async function ssFetchBox(name){const c=syncCfg();if(!c.ep||!c.tk)throw new Error('エンドポイントとトークンが未設定です（🎙⚙ に入れるか、quick-ref と同じブラウザで開いてください）');
  const r=await fetch(c.ep+'/sync/'+encodeURIComponent(name),{headers:{Authorization:'Bearer '+c.tk}});if(r.status===401)throw new Error('トークンが違います');if(r.status===404)throw new Error('「'+name+'」の郵便受けは空です（相手のアプリで一度同期してください）');if(!r.ok)throw new Error('受け取りに失敗（'+r.status+'）');
  const d=await r.json();return d&&d.data!==undefined?d.data:d}
// ---- 集合の計算
const ssPick=()=>SS.picked.map((g,i)=>({n:g,L:SL[i],k:SS.gmap.get(g)||new Set()}));
function ssRegions(P){const R=new Map();const univ=SS.recs;univ.forEach(r=>{let m=0;P.forEach((s,i)=>{if(s.k.has(r.k))m|=1<<i});if(!R.has(m))R.set(m,[]);R.get(m).push(r)});return R}
const ssMaskName=(m,P,n)=>{const ins=P.filter((_,i)=>m>>i&1).map(s=>s.L);if(!m)return'どれにも入らない';return ins.join('∩')+((ins.length<n&&n>2)?' のみ':'')};
function ssExprEval(src,P){const map={};P.forEach(s=>map[s.L]=s.k);const U=new Set(SS.recs.map(r=>r.k));
  let s=String(src).replace(/ᶜ/g,'~').normalize('NFKC').toUpperCase().replace(/[&*・∩]/g,'&').replace(/[|+∪]/g,'|').replace(/[-−＼\\]/g,'-').replace(/[Δ△^]/g,'^').replace(/[~!ᶜ']/g,'~').replace(/\s+/g,'');
  if(!s)throw new Error('式を入れてください');const T=s.match(/[A-FU]|[&|\-^~()]|./g);let p=0;
  const un=(a,b)=>new Set([...a,...b]),it=(a,b)=>new Set([...a].filter(x=>b.has(x))),df=(a,b)=>new Set([...a].filter(x=>!b.has(x))),sy=(a,b)=>un(df(a,b),df(b,a));
  const prim=()=>{const t=T[p++];if(t==='~'){const x=prim();return df(U,x)}if(t==='('){const e=expr();if(T[p++]!==')')throw new Error('「)」が足りません');return post(e)}if(t==='U')return post(U);if(map[t])return post(map[t]);throw new Error('「'+(t||'')+'」が分かりません（使える記号：'+P.map(s=>s.L).join('・')+' U ∩ ∪ − Δ ᶜ）')};
  const post=x=>{while(T[p]==='~'){p++;x=df(U,x)}return x};
  const and=()=>{let a=prim();while(T[p]==='&'){p++;a=it(a,prim())}return a};
  const expr=()=>{let a=and();while(T[p]==='|'||T[p]==='-'||T[p]==='^'){const o=T[p++],b=and();a=o==='|'?un(a,b):o==='-'?df(a,b):sy(a,b)}return a};
  const r=expr();if(p<T.length)throw new Error('「'+T[p]+'」の位置が正しくありません');return r}
// ---- ベン図
function vnGeo(n,W){const H=300,cx=W/2,cy=H/2+2;let r,C;if(n===1){r=Math.min(W*.34,112);C=[[cx,cy]]}else if(n===2){r=Math.min(W*.27,106);C=[[cx-r*.62,cy],[cx+r*.62,cy]]}else{r=Math.min(W*.25,98);C=[[cx-r*.6,cy-r*.42],[cx+r*.6,cy-r*.42],[cx,cy+r*.66]]}return{H,r,C}}
function vnMask(G,x,y){let m=0;G.C.forEach((c,i)=>{if((x-c[0])**2+(y-c[1])**2<=G.r*G.r)m|=1<<i});return m}
function vnDraw(P,R,W,sel){const n=Math.min(P.length,3),G=vnGeo(n,W),col=i=>PAL[i];let s='';const cnt=m=>(R.get(m)||[]).length;
  const cen=new Map();for(let y=0;y<G.H;y+=4)for(let x=0;x<W;x+=4){const m=vnMask(G,x,y);if(!m)continue;const o=cen.get(m)||{x:0,y:0,n:0};o.x+=x;o.y+=y;o.n++;cen.set(m,o)}
  s+=`<defs>${G.C.map((c,i)=>`<clipPath id="vc${i}"><circle cx="${c[0]}" cy="${c[1]}" r="${G.r}"/></clipPath>`).join('')}</defs>`;
  G.C.forEach((c,i)=>{s+=`<circle cx="${c[0]}" cy="${c[1]}" r="${G.r}" fill="${col(i)}" fill-opacity=".28" stroke="${col(i)}" stroke-width="2"/>`});
  // 重なりを金色で強調
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)s+=`<g clip-path="url(#vc${i})"><circle cx="${G.C[j][0]}" cy="${G.C[j][1]}" r="${G.r}" fill="#F5C842" fill-opacity=".38"/></g>`;
  if(n===3)s+=`<g clip-path="url(#vc0)"><g clip-path="url(#vc1)"><circle cx="${G.C[2][0]}" cy="${G.C[2][1]}" r="${G.r}" fill="#F5C842" fill-opacity=".3"/></g></g>`;
  // 選択中の領域
  if(sel&&cen.has(sel)){const ins=[],outs=[];for(let i=0;i<n;i++)(sel>>i&1?ins:outs).push(i);
    let inner=`<rect width="${W}" height="${G.H}" fill="#fff" fill-opacity=".35" stroke="none"/>`;ins.slice().reverse().forEach(i=>{inner=`<g clip-path="url(#vc${i})">${inner}</g>`});
    s+=`<mask id="vmk"><rect width="${W}" height="${G.H}" fill="#fff"/>${outs.map(i=>`<circle cx="${G.C[i][0]}" cy="${G.C[i][1]}" r="${G.r}" fill="#000"/>`).join('')}</mask><g mask="url(#vmk)">${inner}</g>`}
  cen.forEach((o,m)=>{const x=o.x/o.n,y=o.y/o.n,c=cnt(m),multi=(m&(m-1))!==0;s+=`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="${multi?20:17}" font-weight="700" fill="${multi?'#F5C842':INK}" style="paint-order:stroke;stroke:#181b24;stroke-width:3px" pointer-events="none">${c}</text>`});
  // 名前
  const lp=n===1?[[W/2,18]]:n===2?[[G.C[0][0]-G.r*.5,16],[G.C[1][0]+G.r*.5,16]]:[[G.C[0][0]-G.r*.7,14],[G.C[1][0]+G.r*.7,14],[G.C[2][0],G.H-6]];
  P.slice(0,n).forEach((q,i)=>{s+=`<text x="${lp[i][0]}" y="${lp[i][1]}" text-anchor="middle" font-size="13" font-weight="700" fill="${col(i)}">${q.L}：${X(tr(q.n,8))}</text>`});
  return `<svg id="vsvg" viewBox="0 0 ${W} ${G.H}" width="${W}" height="${G.H}" style="max-width:100%">${s}</svg>`}

// ---- 集合ビュー
function ssRelText(a,b){const inter=[...a.k].filter(x=>b.k.has(x)).length,u=a.k.size+b.k.size-inter;
  if(!inter)return`${a.L}と${b.L}は<b>重なりがありません</b>（どちらにも入る項目はゼロ）`;
  if(inter===a.k.size&&inter===b.k.size)return`${a.L}と${b.L}は<b>まったく同じ</b>中身です（${inter}件）`;
  if(inter===a.k.size)return`${a.L}は${b.L}の<b>一部</b>です（${a.L} ⊂ ${b.L}）。${a.L}の${inter}件はすべて${b.L}にも入っています`;
  if(inter===b.k.size)return`${b.L}は${a.L}の<b>一部</b>です（${b.L} ⊂ ${a.L}）。${b.L}の${inter}件はすべて${a.L}にも入っています`;
  return`${a.L}と${b.L}は<b>${inter}件で重なっています</b>（${a.L}の${Math.round(inter/a.k.size*100)}％、${b.L}の${Math.round(inter/b.k.size*100)}％）。重なり度 ${(inter/u).toFixed(2)}`}
function ssChips(list,key){const N=SS.exp[key]?9999:40,sh=list.slice(0,N);return sh.map(r=>`<span class="sschip">${X(tr(r.l,24))}</span>`).join('')+(list.length>N?`<button class="chip" data-ssx="${key}">ほか${list.length-N}件を表示</button>`:'')}
function renderSets(){const t=T();if(!t)return;const modes=[['recv','① 材料を入れる'],['view','② 集合を見る']];
  $('zv').innerHTML=`<div class="chips" style="margin-bottom:10px">${modes.map(([k,l])=>`<button class="chip${SS.mode===k?' on':''}" data-ssm="${k}">${l}</button>`).join('')}</div><div id="zbody"></div><div id="ztip" style="min-height:20px;font-size:13px;color:var(--gold);padding:6px 4px 0;font-weight:700">${X(SS.msg||'')}</div>`;
  SS.mode==='recv'?ssRecvUI(t):ssViewUI(t)}
function ssRecvUI(t){const I=info(t),sel=(id,opts,v)=>`<select id="${id}">${opts.map(([k,l])=>`<option value="${X(k)}"${String(k)===String(v)?' selected':''}>${X(l)}</option>`).join('')}</select>`;
  if(SS.lc<0||SS.lc>=I.w){SS.lc=0;const g=I.names.map((_,i)=>i).find(i=>i>0&&I.types[i]==='text'&&I.uniq[i].length>=2);SS.gc=g==null?Math.min(1,I.w-1):g}
  const cols=I.names.map((n,i)=>[i,n]);
  $('zbody').innerHTML=`<div style="font-size:13px;color:var(--dim);line-height:1.7;margin-bottom:8px">集合を作る材料を入れます。<b>「何を数えるか（名前）」</b>と<b>「どのグループに入るか（分類）」</b>があれば、重なりを調べられます。</div>
  <div class="sec"><h4>A. 表から</h4><div class="ctl"><div><label>名前（数えるもの）</label>${sel('zLc',cols,SS.lc)}</div><div><label>分類（グループ）</label>${sel('zGc',cols,SS.gc)}</div></div>
   <label style="display:block;margin:8px 0;font-size:14px"><input type="checkbox" id="zSp"${SS.split?' checked':''}> 分類のセルを「、 , ; /」で分ける（タグのように複数あるとき）</label><button class="pri" id="zT">この表から集合を作る</button></div>
  <div class="sec"><h4>B. メモ・辞書アプリから受け取る</h4><div style="font-size:12px;color:var(--dim);line-height:1.6;margin-bottom:6px">相手のアプリが sync-worker に同期している「郵便受け」から読みます（相手のアプリは変更しません）。メモアプリ（quick-ref）は <b>quick-ref</b>。辞書・ほかのアプリは、その郵便受けの名前を入れてください。機密メモ（保護）は読み飛ばします。</div>
   <div class="ctl"><div style="grid-column:1/3"><label>郵便受けの名前</label><input class="lin" id="zBox" value="${X(SS.box)}"></div></div>
   <div class="chips" style="margin:8px 0">${['knowledge-dictionary','quick-ref','code-ref','kansei-materials','flow-mind-out','table-pad-out'].map(n=>`<button class="chip${SS.box===n?' on':''}" data-zbox="${n}">${n}</button>`).join('')}</div><button class="pri" id="zFetch">📥 受け取る</button>
   ${SS.raw?`<div style="margin-top:10px;font-size:13px">受け取り済み：<b>${SS.rawN}件</b>${SS.skip?`（機密 ${SS.skip}件は除外）`:''}</div><div class="ctl" style="margin-top:6px"><div><label>名前に使う項目</label>${sel('zRl',SS.fl.map(f=>[f.k,f.k+(f.arr?'（複数）':'')]),SS.lab)}</div><div><label>分類に使う項目</label>${sel('zRg',[['','（なし）']].concat(SS.fl.map(f=>[f.k,f.k+(f.arr?'（複数）':'')+' ・'+f.n+'種類'])),SS.grp)}</div></div><button class="pri" id="zRaw" style="margin-top:8px">この設定で集合にする</button>`:''}</div>
  <div class="sec"><h4>C. 貼り付け</h4><div style="font-size:12px;color:var(--dim);line-height:1.6;margin-bottom:6px">1行に1集合：<b>集合名: 要素, 要素, 要素</b>　または　<b>名前［タブ］グループ, グループ</b></div>
   <textarea id="zPa" class="lin" rows="5" spellcheck="false" placeholder="例）\n英語: apple, book, cat\n数学: book, pencil\n理科: cat, pencil, lab">${X(SS.paste)}</textarea><button class="pri" id="zPb" style="margin-top:8px">貼り付けから集合を作る</button></div>
  <div class="sec"><h4>D. ほかのアプリから直接（上級）</h4><div style="font-size:12px;color:var(--dim);line-height:1.6">ほかのアプリが <b>#sets=…</b>（JSONをbase64化）付きで table-pad を開くか、同じ origin の localStorage <b>tp_set_transfer</b> に JSON を書いておくと、開いたときに自動で受け取ります。形：<code>{"sets":[{"name":"集合名","items":["要素",…]}]}</code> または <code>{"items":[{"title":"…","tags":["…"]}]}</code></div></div>`}
function ssViewUI(t){const P=ssPick(),n=P.length;
  if(!SS.recs.length){$('zbody').innerHTML='<div style="padding:24px;text-align:center;color:var(--dim);line-height:1.7">まだ材料がありません。<br>「① 材料を入れる」で、表・メモ・辞書・貼り付けのどれかから集合を作ってください。</div>';return}
  const q=SS.q.trim().toLowerCase(),gs=[...SS.gmap.entries()].sort((a,b)=>b[1].size-a[1].size).filter(([g])=>!q||g.toLowerCase().includes(q));
  const W=Math.max(260,$('zv').clientWidth-24);let h=`<div style="font-size:13px;color:var(--dim);margin-bottom:6px">全体：<b style="color:var(--tx)">${SS.recs.length}件</b>、グループ：<b style="color:var(--tx)">${SS.gmap.size}個</b></div>
   <div class="sec"><h4>調べる集合を選ぶ（2〜6個。最初の3つがベン図になります）</h4><input class="lin" id="zQ" placeholder="🔍 グループ名で絞る" value="${X(SS.q)}" style="margin-bottom:8px"><div class="chips">${gs.slice(0,60).map(([g,k])=>{const i=SS.picked.indexOf(g);return`<button class="chip${i>=0?' on':''}" data-zg="${X(g)}">${i>=0?SL[i]+'：':''}${X(tr(g,12))}（${k.size}）</button>`}).join('')}</div>${gs.length>60?`<div style="font-size:12px;color:var(--dim);margin-top:4px">ほか${gs.length-60}個（絞り込みで探せます）</div>`:''}<div style="margin-top:8px"><button id="zAuto">✨ 重なりが大きい組を自動で選ぶ</button></div></div>`;
  if(n<1){$('zbody').innerHTML=h+'<div style="color:var(--dim);padding:10px">集合を1つ以上選んでください</div>';return}
  const R=ssRegions(P);
  const V=ssVenn(P,R);if(SS.sel==null||!V.R3.has(SS.sel)){let b=0,bn=0;V.R3.forEach((v,m)=>{if(m&(m-1)&&v.length>bn){b=m;bn=v.length}});SS.sel=b||[...V.R3.keys()].find(m=>m)||0}
  h+=`<div class="sec"><h4>ベン図（数字は件数・<span style="color:var(--gold)">金色＝重なり</span>・タップで中身）</h4><div id="vbox" style="text-align:center">${vnDraw(V.P3,V.R3,W,SS.sel)}</div>${n>3?`<div style="font-size:12px;color:var(--dim)">※ ベン図は最初の3つ（A〜C）です。D以降は下の一覧と表で確認できます</div>`:''}
   <div class="legend">${P.map((q,i)=>`<span><i style="background:${PAL[i%7]}"></i>${q.L}＝${X(q.n)}（${q.k.size}件）</span>`).join('')}</div></div>`;
  // 重なりをはっきり明記
  const ov=[...R.entries()].filter(([m,v])=>m&(m-1)&&v.length).sort((a,b)=>popc(b[0])-popc(a[0])||b[1].length-a[1].length),only=[...R.entries()].filter(([m,v])=>m&&!(m&(m-1))&&v.length),none=R.get(0)||[];
  h+=`<div class="sec" style="border-color:rgba(245,200,66,.6)"><h4 style="color:var(--gold)">🟡 重なっている部分（共通する中身）</h4>`;
  if(n<2)h+='<div style="font-size:13px;color:var(--dim)">集合を2つ以上選ぶと、重なりが出ます</div>';
  else if(!ov.length)h+='<div style="font-size:14px">選んだ集合のあいだに<b>重なりはありません</b>（どの項目も1つの集合にしか入っていません）</div>';
  ov.forEach(([m,v])=>{const names=P.filter((_,i)=>m>>i&1);h+=`<div class="ovcard" data-zr="${m}"><div class="ovh"><b>${ssMaskName(m,P,n)}</b> <span class="ovn">${v.length}件</span></div><div style="font-size:12px;color:var(--dim);margin-bottom:6px">${names.map(q=>q.L+'「'+X(tr(q.n,10))+'」').join(' と ')}の<b>両方に入っている</b>${n>2&&names.length<n?'（'+P.filter((_,i)=>!(m>>i&1)).map(q=>q.L).join('・')+'には入らない）':''}</div><div>${ssChips(v,'o'+m)}</div></div>`});h+='</div>';
  h+=`<div class="sec"><h4>それぞれだけに入っているもの</h4>${only.map(([m,v])=>{const q=P[Math.log2(m)];return`<div class="ovcard" data-zr="${m}" style="border-color:${PAL[Math.log2(m)%7]}"><div class="ovh"><b>${q.L}だけ（${X(tr(q.n,10))}）</b> <span class="ovn">${v.length}件</span></div><div>${ssChips(v,'p'+m)}</div></div>`}).join('')||'<div style="color:var(--dim);font-size:13px">なし</div>'}${n>=1&&none.length?`<div class="ovcard" data-zr="0"><div class="ovh"><b>どれにも入らない</b> <span class="ovn">${none.length}件</span></div><div>${ssChips(none,'n0')}</div></div>`:''}</div>`;
  if(n>=2){h+='<div class="sec"><h4>2つずつの関係</h4>';for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)h+=`<div style="font-size:14px;line-height:1.6;margin-bottom:6px">・${ssRelText(P[i],P[j])}</div>`;
    h+=`<div class="pv" style="margin-top:8px"><table><tr><th>重なる件数</th>${P.map(q=>`<th>${q.L}</th>`).join('')}</tr>${P.map((a,i)=>`<tr><td>${a.L} ${X(tr(a.n,6))}</td>${P.map((b,j)=>{const c=[...a.k].filter(x=>b.k.has(x)).length,al=i===j?0:(c/Math.max(1,Math.min(a.k.size,b.k.size)));return`<td style="${i===j?'color:var(--dim)':al?'background:rgba(245,200,66,'+(.12+.5*al).toFixed(2)+')':''}">${c}</td>`}).join('')}</tr>`).join('')}</table></div></div>`}
  // 式
  let res='';try{if(SS.expr.trim()){const r=ssExprEval(SS.expr,P),L=SS.recs.filter(x=>r.has(x.k));res=`<div style="margin-top:8px"><b style="color:var(--gold)">結果：${L.length}件</b></div><div style="margin-top:6px">${ssChips(L,'x')||'<span style="color:var(--dim)">（空集合）</span>'}</div>`}}catch(e){res=`<div style="color:var(--red);font-size:13px;margin-top:6px">${X(e.message)}</div>`}
  h+=`<div class="sec"><h4>集合の式で調べる</h4><div style="font-size:12px;color:var(--dim);line-height:1.6;margin-bottom:6px">${P.map(q=>q.L+'＝'+X(tr(q.n,8))).join('　')}　／　U＝全体</div><input class="lin" id="zEx" placeholder="例）A∩B　／　A−B　／　(A∪B)−C" value="${X(SS.expr)}"><div class="chips" style="margin:8px 0">${['∩','∪','−','Δ','ᶜ','(',')','U'].concat(P.map(q=>q.L)).map(k=>`<button class="chip" data-zq="${k}">${k}</button>`).join('')}</div><div style="font-size:12px;color:var(--dim)">∩共通　∪合わせた　−引く　Δどちらか一方だけ　ᶜ入っていない（補集合）。キーボードでは & | - ^ ~ も使えます</div><div id="zRes">${res}</div></div>`;
  h+=`<div class="sec"><h4>➡ 表・フローにつなぐ</h4><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="pri" data-zo="mem">▦ 所属表（○×の表）</button><button class="pri" data-zo="reg">▦ 領域表（重なりごと）</button><button class="pri" data-zo="flow">🔀 フローにする</button>${SS.expr.trim()?'<button data-zo="res">▦ 式の結果を表に</button>':''}</div>
   <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button data-zo="copy">📋 重なりをコピー</button><button data-zo="send">📤 郵便受け(table-pad-out)へ返す</button><button id="zPng">🖼 ベン図を画像で</button></div>
   <div style="font-size:12px;color:var(--dim);margin-top:8px;line-height:1.6">所属表＝要素ごとに、どの集合に入っているかの表（集計表・グラフにそのまま使えます）。領域表＝「Aだけ」「A∩B」…ごとの件数と中身。フロー＝集合→重なり→要素の流れ図です。</div></div>`;
  $('zbody').innerHTML=h;
  $('ztip').innerHTML=ssDetail(V.P3,V.R3)}
function ssDetail(P,R){const m=SS.sel,v=R.get(m)||[];if(!v.length&&m!==0)return'';return`<span style="color:var(--dim);font-weight:400">選択中：</span>${X(ssMaskName(m,P,P.length))}（${v.length}件）：${X(v.slice(0,30).map(r=>r.l).join('、'))}${v.length>30?' ほか'+(v.length-30)+'件':''}`}
const popc=m=>{let c=0;while(m){c+=m&1;m>>=1}return c};
function ssVenn(P,R){const P3=P.slice(0,3);return{P3,R3:P.length>3?ssRegions(P3):R}}
// ---- 出力
function ssMatrixMem(P){const R=SS.recs.filter(r=>P.some(s=>s.k.has(r.k)));const rows=R.map(r=>{let m=0;P.forEach((s,i)=>{if(s.k.has(r.k))m|=1<<i});return{r,m}});rows.sort((a,b)=>popc(b.m)-popc(a.m)||a.m-b.m||a.r.l.localeCompare(b.r.l,'ja'));
  return[['要素'].concat(P.map(s=>s.L+'：'+s.n)).concat(['所属数','所属パターン'])].concat(rows.map(({r,m})=>[r.l].concat(P.map((s,i)=>m>>i&1?'○':'')).concat([String(popc(m)),ssMaskName(m,P,P.length)])))}
function ssMatrixReg(P,R){const rows=[...R.entries()].sort((a,b)=>popc(b[0])-popc(a[0])||b[1].length-a[1].length);return[['領域','式','件数','中身']].concat(rows.filter(([m,v])=>v.length).map(([m,v])=>[ssMaskName(m,P,P.length),m?P.filter((_,i)=>m>>i&1).map(q=>q.L).join('∩')+(popc(m)<P.length?' − '+P.filter((_,i)=>!(m>>i&1)).map(q=>q.L).join('・'):''):'U − (全部)',String(v.length),v.map(r=>r.l).join('、')]))}
const ssFl=s=>String(s).replace(/->/g,'→').replace(/[(){}\[\]]/g,' ').replace(/\s+/g,' ').replace(/[?？]+$/,'').trim().slice(0,22)||'-';
function ssFlow(P,R){const L=[];
  const nm=new Map(),lab=base=>{let x=ssFl(base),k=2;while(nm.has(x)){x=ssFl(base)+' '+k++}nm.set(x,1);return x};
  const sNode=P.map(q=>lab(q.L+' '+q.n+'（'+q.k.size+'件）'));
  const regs=[...R.entries()].filter(([m,v])=>m&&v.length).sort((a,b)=>popc(b[0])-popc(a[0])||b[1].length-a[1].length);
  regs.forEach(([m,v])=>{const multi=popc(m)>1,rn=lab((multi?'重なり ':'')+ssMaskName(m,P,P.length)+'（'+v.length+'件）');
    P.forEach((q,i)=>{if(m>>i&1)L.push(sNode[i]+' -> '+rn)});
    const cap=8;v.slice(0,cap).forEach(r=>{const en=lab(r.l);L.push(rn+' -> '+en)});if(v.length>cap)L.push(rn+' -> '+lab('ほか'+(v.length-cap)+'件'))});
  return L.join('\n')}
function ssMakeFlowTable(P,R){const d=ssMatrixReg(P,R),nt={id:uid(),title:'集合：'+P.map(q=>q.n).join('・').slice(0,24),d:d.map(r=>r.slice()),header:true,at:Date.now(),flow:{dir:'tb',text:ssFlow(P,R)}};
  tables.push(nt);cur=nt.id;hist=[];sel={r:0,c:0};save();VIEW='f';render();window.scrollTo(0,0);toast('領域表と、フロー図を作りました')}
async function ssSend(P,R){const c=syncCfg();if(!c.ep||!c.tk){toast('エンドポイントとトークンが未設定です（🎙⚙）');return}
  const body={data:{version:1,from:'table-pad',origin:{app:'table-pad'},at:Date.now(),sets:P.map(q=>({name:q.n,letter:q.L,items:SS.recs.filter(r=>q.k.has(r.k)).map(r=>r.l)})),regions:[...R.entries()].filter(([m,v])=>v.length).map(([m,v])=>({label:ssMaskName(m,P,P.length),count:v.length,items:v.map(r=>r.l)}))}};
  try{const r=await fetch(c.ep+'/sync/table-pad-out',{method:'PUT',headers:{Authorization:'Bearer '+c.tk,'Content-Type':'application/json'},body:JSON.stringify(body)});toast(r.ok?'郵便受け「table-pad-out」に返しました':'返せませんでした（'+r.status+'）')}catch(e){toast('通信に失敗しました')}}
// ---- イベント
$('zv').addEventListener('click',async e=>{const t=T();if(!t)return;let b;
  if(b=e.target.closest('[data-ssm]')){SS.mode=b.dataset.ssm;renderSets();return}
  if(b=e.target.closest('[data-zbox]')){SS.box=b.dataset.zbox;ssSave();renderSets();return}
  if(e.target.closest('#zT')){const I=info(t);SS.lc=+$('zLc').value;SS.gc=+$('zGc').value;SS.split=$('zSp').checked;ssSave();ssBuild(ssFromTable(t,SS.lc,SS.gc,SS.split));SS.mode='view';SS.msg='表から集合を作りました（'+SS.recs.length+'件・'+SS.gmap.size+'グループ）';renderSets();return}
  if(e.target.closest('#zFetch')){SS.box=($('zBox').value||'quick-ref').trim();ssSave();SS.msg='受け取り中…';$('ztip').textContent=SS.msg;
    try{const d=await ssFetchBox(SS.box),a=ssRecords(d);if(!a||!a.length)throw new Error('「'+SS.box+'」に、読める一覧（項目の配列）がありません');ssRaw(a);SS.msg='受け取りました（'+SS.rawN+'件）。項目を確かめて「集合にする」を押してください'}catch(err){SS.msg='⚠ '+err.message}renderSets();return}
  if(e.target.closest('#zRaw')){SS.lab=$('zRl').value;SS.grp=$('zRg').value;ssBuild(ssFromRaw());SS.mode='view';SS.msg='集合を作りました（'+SS.recs.length+'件・'+SS.gmap.size+'グループ）';renderSets();return}
  if(e.target.closest('#zPb')){SS.paste=$('zPa').value;ssSave();const L=ssFromPaste(SS.paste);if(!L.length){toast('貼り付ける中身がありません');return}ssBuild(L);SS.mode='view';SS.msg='貼り付けから集合を作りました（'+SS.recs.length+'件・'+SS.gmap.size+'グループ）';renderSets();return}
  if(b=e.target.closest('[data-zg]')){const g=b.dataset.zg,i=SS.picked.indexOf(g);if(i>=0)SS.picked.splice(i,1);else if(SS.picked.length<6)SS.picked.push(g);else{toast('選べるのは6個までです');return}SS.sel=null;renderSets();return}
  if(e.target.closest('#zAuto')){SS.picked=[];ssAuto();renderSets();return}
  if(b=e.target.closest('[data-ssx]')){SS.exp[b.dataset.ssx]=1;renderSets();return}
  if(b=e.target.closest('[data-zq]')){const ta=$('zEx'),s=b.dataset.zq,a=ta.selectionStart==null?ta.value.length:ta.selectionStart,z=ta.selectionEnd==null?a:ta.selectionEnd;ta.value=ta.value.slice(0,a)+s+ta.value.slice(z);SS.expr=ta.value;ta.focus();ta.selectionStart=ta.selectionEnd=a+s.length;ssExprUpdate();return}
  if(e.target.closest('#zPng')){savePng($('vsvg'),'venn');return}
  if(b=e.target.closest('[data-zo]')){const P=ssPick();if(!P.length)return;const R=ssRegions(P),o=b.dataset.zo;
    if(o==='mem')newTable('所属表：'+P.map(q=>q.n).join('・').slice(0,24),ssMatrixMem(P));else if(o==='reg')newTable('領域表：'+P.map(q=>q.n).join('・').slice(0,24),ssMatrixReg(P,R));else if(o==='flow')ssMakeFlowTable(P,R);
    else if(o==='res'){try{const r=ssExprEval(SS.expr,P);newTable('式の結果：'+SS.expr.slice(0,16),[['要素','式']].concat(SS.recs.filter(x=>r.has(x.k)).map(x=>[x.l,SS.expr])))}catch(err){toast(err.message)}}
    else if(o==='copy')copyOut(tsvRows(ssMatrixReg(P,R)),'重なりをコピーしました');else if(o==='send')ssSend(P,R);return}
  if(b=e.target.closest('[data-zr]')){const P=ssPick(),R=ssRegions(P),V=ssVenn(P,R);SS.sel=(+b.dataset.zr)&(P.length>3?7:63);if(!V.R3.has(SS.sel))SS.sel=0;$('vbox').innerHTML=vnDraw(V.P3,V.R3,Math.max(260,$('zv').clientWidth-24),SS.sel);$('ztip').innerHTML=ssDetail(V.P3,V.R3);return}
  const sv=e.target.closest('#vsvg');if(sv){const P=ssPick(),n=Math.min(P.length,3),rc=sv.getBoundingClientRect(),W=Math.max(260,$('zv').clientWidth-24),sc=W/rc.width,x=(e.clientX-rc.left)*sc,y=(e.clientY-rc.top)*sc,G=vnGeo(n,W),m=vnMask(G,x,y);
    if(m){const R=ssRegions(P),V=ssVenn(P,R);SS.sel=m;$('vbox').innerHTML=vnDraw(V.P3,V.R3,W,SS.sel);$('ztip').innerHTML=ssDetail(V.P3,V.R3)}}});
function ssExprUpdate(){const P=ssPick(),box=$('zRes');if(!box)return;let res='';try{if(SS.expr.trim()){const r=ssExprEval(SS.expr,P),L=SS.recs.filter(x=>r.has(x.k));res=`<div style="margin-top:8px"><b style="color:var(--gold)">結果：${L.length}件</b></div><div style="margin-top:6px">${ssChips(L,'x')||'<span style="color:var(--dim)">（空集合）</span>'}</div>`}}catch(err){res=`<div style="color:var(--red);font-size:13px;margin-top:6px">${X(err.message)}</div>`}box.innerHTML=res}
$('zv').addEventListener('input',e=>{const id=e.target.id;if(id==='zEx'){SS.expr=e.target.value;ssExprUpdate()}else if(id==='zQ'){SS.q=e.target.value;const pos=e.target.selectionStart;renderSets();const q=$('zQ');if(q){q.focus();q.selectionStart=q.selectionEnd=pos}}else if(id==='zPa')SS.paste=e.target.value});
$('zv').addEventListener('change',e=>{if(e.target.id==='zRl')SS.lab=e.target.value;else if(e.target.id==='zRg')SS.grp=e.target.value;else if(e.target.id==='zSp'){SS.split=e.target.checked;ssSave()}});
// ---- 外から受け取る（#sets= / #import= / tp_set_transfer）
function ssTransferIn(){let p=null;try{const m=String(location.hash).match(/^#(?:sets|import|act)=(.+)$/);if(m){p=JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));history.replaceState(null,'',location.pathname+location.search)}}catch(e){}
  if(!p){try{const s=localStorage.getItem('tp_set_transfer');if(s){p=JSON.parse(s);localStorage.removeItem('tp_set_transfer')}}catch(e){}}
  if(p&&p.op&&ssAct(p))return;
  if(p&&ssIngest(p)){if(SS.recs.length)SS.mode='view';VIEW='z';render()}}
// ---- 統合AI(ai-hub)などからの「作って」: {op:'table'|'flow'|'sets', ...}
function ssAct(p){const cl=x=>String(x==null?'':x).replace(/[\t\r\n]+/g,' ').trim();
  if(p.op==='table'&&Array.isArray(p.rows)&&p.rows.length){const d=p.rows.slice(0,500).map(r=>(Array.isArray(r)?r:[r]).slice(0,40).map(cl));newTable(cl(p.title).slice(0,40)||'AIが作った表',d);return true}
  if(p.op==='flow'&&p.text){const txt=String(p.text).slice(0,6000),ls=txt.split('\n').map(x=>x.trim()).filter(Boolean);
    const d=[['順','流れ']].concat(ls.slice(0,60).map((x,i)=>[String(i+1),cl(x)]));
    const nt={id:uid(),title:cl(p.title).slice(0,40)||'AIが作ったフロー',d,header:true,at:Date.now(),flow:{dir:'tb',text:txt}};
    tables.push(nt);cur=nt.id;hist=[];sel={r:0,c:0};save();VIEW='f';render();window.scrollTo(0,0);toast('フロー図を作りました');return true}
  if(p.op==='sets'&&Array.isArray(p.sets)){return ssIngest({sets:p.sets})&&((SS.mode='view'),(VIEW='z'),render(),true)}
  return false}

// 公開：他アプリが使えるように
window.TablePad={pullInbox,itemToTable,bk,toISO,num,buildImport,loadImpText,autoCards,recommend,compute,parseFlow,info,list:()=>tables.slice(),get:id=>tables.find(t=>t.id===id),toTSV:tsv,toMarkdown:md,import:importText};
// J-Quants V2 bridge for table-pad. API key is intentionally never persisted.
const JQA_STYLE='stock-api.css';
function jqaDateDays(days){const d=new Date();d.setDate(d.getDate()-days);return d.toISOString().slice(0,10)}
function jqaPanel(){const box=$('sv');if(!box||$('jqa'))return;const html=`<section id="jqa"><h3>🇯🇵 日本株データを銘柄コードから取り込む</h3><p class="jqa-help">J-Quants API V2 を使って日足データを取得し、新しい表として追加します。4桁コード（例 7203）または5桁コードを入力できます。Freeプランはデータに約12週間の遅延があり、最新株価ではありません。Yahoo!ファイナンスは別タブで開き、目視で照合してください。</p><div class="jqa-grid"><label>銘柄コード<input id="jqa-code" inputmode="numeric" autocomplete="off" placeholder="例：7203"></label><label>J-Quants APIキー（直接接続時のみ）<input id="jqa-key" type="password" autocomplete="off" placeholder="APIキーを貼り付け"></label><label>任意：Cloudflare Worker URL<input id="jqa-proxy" type="url" autocomplete="off" placeholder="https://your-worker.workers.dev"></label><label>取得開始日<input id="jqa-from" type="date" value="${jqaDateDays(730)}"></label><label>取得終了日<input id="jqa-to" type="date" value="${jqaDateDays(84)}"></label></div><div class="jqa-actions"><button type="button" class="pri" id="jqa-fetch">株価データを取得して表に追加</button><button type="button" id="jqa-yahoo">Yahoo!ファイナンスで照合</button><button type="button" id="jqa-clear">入力を消去</button></div><div id="jqa-status" class="jqa-status" role="status" aria-live="polite">APIキーは保存されません。ページを閉じる前に入力欄を消去できます。</div><div id="jqa-links" class="jqa-links"></div><hr style="margin:14px 0;border-color:var(--bd)"><h4>🖥️ PCのJ-Quants CLIで自動取得（おすすめ）</h4><p class="jqa-help">CLIにログイン済みならAPIキーをブラウザに入力せず取得できます。先に同梱の PowerShell 起動スクリプトを実行してください。取得した元CSVは Downloads に保存され、分析用テーブルも自動作成します。</p><div class="jqa-actions"><button type="button" class="pri" id="jqa-cli-fetch">CLIから取得してチャートを開く</button><button type="button" id="jqa-cli-check">連携状態を確認</button></div><div id="jqa-cli-status" class="jqa-status" role="status" aria-live="polite">連携サーバー: http://127.0.0.1:8765</div></section>`;box.insertAdjacentHTML('beforeend',html)}
const jqaObserver=new MutationObserver(()=>jqaPanel());jqaObserver.observe($('sv'),{childList:true,subtree:false});setTimeout(jqaPanel,0);
function jqaStatus(msg,kind=''){const el=$('jqa-status');if(el){el.textContent=msg;el.dataset.kind=kind}}
function jqaCleanCode(v){let s=String(v||'').trim().replace(/[^0-9]/g,'');if(s.length===4)s+='0';if(!/^\d{5}$/.test(s))throw new Error('銘柄コードは4桁または5桁の数字で入力してください。');return s}
async function jqaFetch(){const code=jqaCleanCode($('jqa-code').value),key=$('jqa-key').value.trim(),from=$('jqa-from').value,to=$('jqa-to').value;const proxy=String($('jqa-proxy').value||'').trim().replace(/\/$/,'');if(!proxy&&!key)throw new Error('APIキーを入力するか、Worker URL を設定してください。');if(!from||!to||from>to)throw new Error('取得期間の日付を確認してください。');if((new Date(to)-new Date(from))/86400000>760)throw new Error('Freeプランの範囲を想定し、取得期間は約2年以内にしてください。');const status=$('jqa-status');const btn=$('jqa-fetch');btn.disabled=true;status.dataset.kind='';jqaStatus('J-Quants API V2 に接続中…');try{const all=[];let pageKey='';for(let page=0;page<8;page++){const u=new URL(proxy?proxy:'https://api.jquants.com/v2/equities/bars/daily');u.searchParams.set('code',code);u.searchParams.set('from',from.replaceAll('-',''));u.searchParams.set('to',to.replaceAll('-',''));if(pageKey)u.searchParams.set('pagination_key',pageKey);const res=await fetch(u.toString(),{headers:proxy?{}:{'x-api-key':key}});if(!res.ok){let detail='';try{const e=await res.json();detail=e.message||e.Message||e.detail||''}catch(_){}if(res.status===401||res.status===403)throw new Error('認証に失敗しました。APIキーとJ-Quantsの契約状態を確認してください。');if(res.status===429)throw new Error('APIのリクエスト上限に達しました。しばらく待ってから再試行してください。');throw new Error('J-Quants API エラー（HTTP '+res.status+'）'+(detail?'：'+detail:''))}const payload=await res.json();if(!Array.isArray(payload.data))throw new Error('API応答に data 配列がありません。');all.push(...payload.data);pageKey=payload.pagination_key||'';if(!pageKey)break;if(page<7)await new Promise(r=>setTimeout(r,12050));}if(!all.length)throw new Error('指定期間の株価データがありません。コード・日付・プランの提供範囲を確認してください。');all.sort((a,b)=>String(a.Date||'').localeCompare(String(b.Date||'')));const rows=[['日付','銘柄','コード','始値','高値','安値','終値','出来高','情報源']];for(const x of all){const date=String(x.Date||'').replaceAll('-','/');const val=(adj,raw)=>x[adj]??x[raw]??'';rows.push([date,code,code,val('AdjO','O'),val('AdjH','H'),val('AdjL','L'),val('AdjC','C'),val('AdjVo','Vo'),'J-Quants API V2']);}newTable('J-Quants '+code+' 株価日足（'+all.length+'件）',rows);$('jqa-links').innerHTML='<a target="_blank" rel="noopener noreferrer" href="https://finance.yahoo.co.jp/quote/'+encodeURIComponent(code.slice(0,4))+'.T">Yahoo!ファイナンス（日本語）↗</a><a target="_blank" rel="noopener noreferrer" href="https://finance.yahoo.com/quote/'+encodeURIComponent(code.slice(0,4))+'.T/">Yahoo Finance ↗</a>';jqaStatus(all.length+'件を新しい表に取り込みました。調整済み価格がAPIにない項目は未調整値を使用しています。最新12週間の株価はFreeプランでは取得できません。','ok');$('jqa-key').value='';}finally{btn.disabled=false}}
$('sv').addEventListener('click',async e=>{if(e.target.closest('#jqa-fetch')){try{await jqaFetch()}catch(err){jqaStatus(err.message||'取得に失敗しました。','error')}return}if(e.target.closest('#jqa-yahoo')){const code=String($('jqa-code').value||'').trim().replace(/[^0-9]/g,'').slice(0,4);if(!code){jqaStatus('先に銘柄コードを入力してください。','error');return}window.open('https://finance.yahoo.co.jp/quote/'+encodeURIComponent(code)+'.T','_blank','noopener,noreferrer');return}if(e.target.closest('#jqa-clear')){$('jqa-code').value='';$('jqa-key').value='';$('jqa-proxy').value='';$('jqa-from').value=jqaDateDays(730);$('jqa-to').value=jqaDateDays(84);$('jqa-links').innerHTML='';jqaStatus('入力欄を消去しました。');return}});

// Local J-Quants CLI bridge. The Windows helper saves the original CSV in Downloads.
async function jqaCliRequest(path){const r=await fetch('http://127.0.0.1:8765'+path,{method:'GET'});if(!r.ok)throw new Error('ローカル連携エラー（HTTP '+r.status+'）。PowerShell連携スクリプトが起動中か確認してください。');return await r.json()}
function jqaParseCsv(text){text=String(text||'').replace(/^\uFEFF/,'');const out=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')q=false;else cell+=c}else if(c==='"')q=true;else if(c===','){row.push(cell);cell=''}else if(c==='\n'){row.push(cell);out.push(row);row=[];cell=''}else if(c!=='\r')cell+=c}if(cell!==''||row.length){row.push(cell);out.push(row)}return out.filter(r=>r.some(v=>v!==''))}
async function jqaCliFetch(){const code=jqaCleanCode($('jqa-code').value);const btn=$('jqa-cli-fetch');btn.disabled=true;const st=$('jqa-cli-status');try{st.textContent='J-Quants CLIで取得中…（銘柄や期間により時間がかかります）';const result=await jqaCliRequest('/stock?code='+encodeURIComponent(code));if(!result.csv)throw new Error(result.error||'CSVデータが返りませんでした');const parsed=jqaParseCsv(result.csv);if(parsed.length<2)throw new Error('CSVに株価データがありません');const originalHeaders=parsed[0].map(x=>String(x).trim());const idx={Date:originalHeaders.indexOf('Date'),Code:originalHeaders.indexOf('Code'),O:originalHeaders.indexOf('O'),H:originalHeaders.indexOf('H'),L:originalHeaders.indexOf('L'),C:originalHeaders.indexOf('C'),Vo:originalHeaders.indexOf('Vo')};if(['Date','O','H','L','C'].some(k=>idx[k]<0))throw new Error('CSVに必要な列（Date/O/H/L/C）がありません。CLIのCSV形式を確認してください。');const extra=originalHeaders.map((h,i)=>({h,i})).filter(x=>!['Date','Code','O','H','L','C','Vo'].includes(x.h));const headers=['日付','銘柄','コード','始値','高値','安値','終値','出来高',...extra.map(x=>x.h)];const rows=[headers];for(const raw of parsed.slice(1)){const get=k=>idx[k]>=0?(raw[idx[k]]??''):'';const date=String(get('Date')).replaceAll('-','/');if(!date)continue;rows.push([date,code,code,get('O'),get('H'),get('L'),get('C'),get('Vo'),...extra.map(x=>raw[x.i]??'')])}if(rows.length<2)throw new Error('分析できる株価行がありません');newTable('J-Quants CLI '+code+' 株価日足（'+(rows.length-1)+'件）',rows);st.textContent='取得・登録完了：'+(rows.length-1)+'件。元CSV: '+(result.fileName||'Downloads');st.dataset.kind='ok';jqaStatus('CLI経由で株価データを取り込みました。元CSVはJ-Quantsの列形式でDownloadsに保存されています。','ok');$('jqa-links').innerHTML='<a target="_blank" rel="noopener noreferrer" href="https://finance.yahoo.co.jp/quote/'+encodeURIComponent(code.slice(0,4))+'.T">Yahoo!ファイナンスで照合 ↗</a>'; }catch(e){st.textContent='⚠ '+(e.message||String(e));st.dataset.kind='error'}finally{btn.disabled=false}}
$('sv').addEventListener('click',async e=>{if(e.target.closest('#jqa-cli-fetch')){await jqaCliFetch();return}if(e.target.closest('#jqa-cli-check')){const st=$('jqa-cli-status');try{const x=await jqaCliRequest('/health');st.textContent=x.message||'連携サーバーに接続できました。';st.dataset.kind='ok'}catch(err){st.textContent='⚠ '+err.message;st.dataset.kind='error'}return}});
window.tablePadCreateStockTable=(title,rows)=>newTable(title,rows);
load();setTimeout(()=>pullInbox(false),600);if(!tables.length){const t=mk('はじめての表',4,3);t.d[0]=['項目','内容','メモ'];tables.push(t);cur=t.id;save()}if(!T())cur=tables[0].id;render();ssTransferIn();
if('serviceWorker' in navigator&&location.protocol.startsWith('http')){navigator.serviceWorker.register('sw.js').catch(function(){})}
})();
