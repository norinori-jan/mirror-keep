(function(){
'use strict';
if(window.TablePadInputGuide)return;
const DATA={
  stock:{icon:'📈',title:'株価・チッカー',purpose:'株価チッカーや市場データから値を取り込み、あとで比較・グラフ化する',columns:['日時','銘柄','コード','市場','始値','高値','安値','終値','出来高','変化率','情報源'],sample:['2026-10-24 15:30','例: ○○社','1234','東証','1500','1530','1480','1520','120000','+1.2%','JPX/日経'],method:'株価チッカー・市場画面からコピーして貼り付ける。将来はAPIで直接取得し、取得時刻と情報源を自動記録する。',sources:[
    {label:'JPX 日本取引所グループ（一次市場情報）',url:'https://www.jpx.co.jp/'},
    {label:'日経平均プロフィル（指数）',url:'https://indexes.nikkei.co.jp/nkave/index/profile'},
    {label:'Reuters（市場ニュース・背景）',url:'https://www.reuters.com/'},
    {label:'AP News（世界のニュース・背景）',url:'https://apnews.com/'}
  ]},
  train:{icon:'🚆',title:'電車・交通',purpose:'現実の列車運行を、時刻・区間・状態と一緒に記録する',columns:['日時','路線','列車','区間','予定時刻','実績時刻','遅延(分)','運行状態','場所','情報源','備考'],sample:['2026-10-24 18:30','○○線','○○行','A→B','18:25','18:31','6','遅延','A駅','鉄道会社公式','混雑'],method:'まず鉄道事業者の公式運行情報・時刻表を一次情報として取得する。必要に応じて乗換案内などの集約情報を照合し、自分の実測は別に残す。',sources:[
    {label:'国土交通省（鉄道・交通の公的情報）',url:'https://www.mlit.go.jp/tetudo/'},
    {label:'国土交通省 オープンデータ',url:'https://www.mlit.go.jp/chojo/'},
    {label:'JR東日本 運行情報',url:'https://traininfo.jreast.co.jp/train_info/'},
    {label:'Yahoo!路線情報（集約・照合用）',url:'https://transit.yahoo.co.jp/'}
  ]},
  news:{icon:'🌍',title:'世界のニュース',purpose:'世界で起きている出来事を情報源・時刻・地域と一緒に表へする',columns:['日時','地域','媒体','見出し','出来事','分野','情報源URL','確認状態','備考'],sample:['2026-10-24 18:40','欧州','Reuters','例の見出し','出来事の要約','経済','URL','一次情報確認前',''],method:'ニュース本文をそのままデータ化するのではなく、出来事・日時・地域・出典を分離して記録する。数値は可能なら原典・公的統計へ戻る。',sources:[
    {label:'Reuters（国際報道）',url:'https://www.reuters.com/'},
    {label:'AP News（国際報道）',url:'https://apnews.com/'},
    {label:'BBC News（国際報道）',url:'https://www.bbc.com/news'},
    {label:'NHK WORLD-JAPAN（国際報道）',url:'https://www3.nhk.or.jp/nhkworld/'}
  ]},
  ping:{icon:'🌐',title:'ping・電波',purpose:'通信状態を時刻・場所・接続先と一緒に残す',columns:['時刻','接続','接続先','ping平均(ms)','最小(ms)','最大(ms)','packet loss(%)','場所','測定元','備考'],sample:['18:20','Wi-Fi','192.168.1.1','12','8','25','0','自宅','PC','通常'],method:'端末やPCで測った値を貼り付ける。ブラウザだけではICMP pingを直接測れないため、測定と記録を分ける。',sources:[
    {label:'NICT 提供データ',url:'https://www.nict.go.jp/data/db/index.html'},
    {label:'NICT 日本標準時・標準電波',url:'https://www.nict.go.jp/sts/info/'},
    {label:'自分のPC・端末で測定（一次観測）',url:null}
  ]},
  wifi:{icon:'📶',title:'Wi-Fi・電波状況',purpose:'SSID・電波強度・周波数などを時系列で残す',columns:['時刻','接続','SSID','RSSI(dBm)','周波数','場所','端末','情報源','備考'],sample:['18:25','Wi-Fi','MyWiFi','-52','5GHz','書斎','PC','端末測定','安定'],method:'端末のネットワーク情報から値を取得し、貼り付ける。自分の環境のRSSI等は自分の測定値として扱う。',sources:[
    {label:'NICT 提供データ',url:'https://www.nict.go.jp/data/db/index.html'},
    {label:'自分の端末でRSSI・SSID・周波数を測定（一次観測）',url:null}
  ]},
  observe:{icon:'🌡',title:'物理・環境',purpose:'現実で観測した現象を、再現できる形で記録する',columns:['日時','対象','値','単位','場所','条件','測定方法','機器','情報源','備考'],sample:['2026-10-24 18:30','温度','23.4','℃','部屋','窓閉','センサー','機器名','測定ログ',''],method:'「何を・いくつ・何の単位で・どこで・どんな条件で」を最低限残す。公的観測値と自分の測定値を混ぜない。',sources:[
    {label:'気象庁 各種データ・資料（気象・防災）',url:'https://www.jma.go.jp/jma/menu/menureport.html'},
    {label:'気象庁 開発者向け情報・XML',url:'https://www.jma.go.jp/jma/kishou/info/faq.html'},
    {label:'e-Stat 政府統計',url:'https://www.e-stat.go.jp/'},
    {label:'国土地理院 地理空間情報ライブラリー',url:'https://service.gsi.go.jp/geolib/'}
  ]},
  series:{icon:'⏱',title:'時系列観測',purpose:'同じ対象を何度も測って変化を見る',columns:['日時','対象','値','単位','場所','条件','方法','情報源','備考'],sample:['2026-10-24 18:00','対象A','10.2','unit','場所A','条件A','方法A','出典A',''],method:'1回の記録ではなく、同じ列構成で時間を変えて追記する。公的データなら取得時刻・統計系列・出典を残す。',sources:[
    {label:'統計ダッシュボード（政府統計の時系列）',url:'https://dashboard.e-stat.go.jp/'},
    {label:'e-Stat 政府統計',url:'https://www.e-stat.go.jp/'},
    {label:'気象庁 過去の気象データ',url:'https://www.data.jma.go.jp/obd/stats/etrn/'},
    {label:'World Bank Open Data（世界統計）',url:'https://data.worldbank.org/'},
    {label:'UNdata（国際統計）',url:'https://data.un.org/'}
  ]},
  paste:{icon:'📋',title:'Excel・CSV・Web表',purpose:'すでにある表をそのままtable-padへ持ち込む',columns:['元データの列1','元データの列2','元データの列3'],sample:['値A','値B','値C'],method:'Excel/CSV/Web表をコピー → table-padの「📥 貼り付け」へ。可能なら情報源・取得日時の列も残す。',sources:[
    {label:'e-Stat 政府統計',url:'https://www.e-stat.go.jp/'},
    {label:'政府データカタログ data.go.jp',url:'https://www.data.go.jp/'},
    {label:'統計ダッシュボード',url:'https://dashboard.e-stat.go.jp/'},
    {label:'UNdata',url:'https://data.un.org/'},
    {label:'World Bank Open Data',url:'https://data.worldbank.org/'}
  ]},
  voice:{icon:'🎙',title:'声から記録',purpose:'思いついた観測値や現場メモをその場で残す',columns:['日時','対象','値','単位','場所','情報源','備考'],sample:['自動','対象A','12.3','unit','現場','自分の観測','音声入力'],method:'「🎙 声で入れる」でセルへ順番に入力。後から列を整理し、外部情報なら「情報源」列を追加する。',sources:[
    {label:'現場・自分の観測（一次観測）',url:null},
    {label:'必要なら原典・公的データのURLを「情報源」列に記録',url:null}
  ]}
};
const SOURCE_RULES=[
  '一次データ・公式発表',
  '政府・自治体・国際機関の統計',
  '研究機関・観測機関',
  '報道機関（出来事・背景の入口）',
  '自分で測定・観測'
];
function esc(s){return String(s).replace(/[&<>\\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\':'&#92;','"':'&quot;'}[c]))}
function addStyles(){if(document.getElementById('tpInputGuideStyle'))return;const s=document.createElement('style');s.id='tpInputGuideStyle';s.textContent='#tpInputGuide{position:fixed;inset:0;background:#000b;z-index:100;display:none;padding:18px;overflow:auto}#tpInputGuide.on{display:block}.tpig-card{max-width:980px;margin:20px auto;background:#181b24;border:1px solid #323a4d;border-radius:16px;padding:16px;color:#eef1f7}.tpig-head{display:flex;gap:10px;align-items:center}.tpig-head h2{flex:1;margin:0;font-size:20px}.tpig-x{font-size:22px}.tpig-cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:14px 0}.tpig-cat{text-align:left;min-height:60px}.tpig-cat.on{outline:2px solid #4A9EFF}.tpig-meta{color:#9aa3b8;font-size:13px;line-height:1.6}.tpig-cols{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.tpig-col{background:#222735;border:1px solid #323a4d;border-radius:999px;padding:6px 10px;font-size:13px}.tpig-pre{overflow:auto;background:#0f1117;border:1px solid #323a4d;border-radius:10px;padding:10px;white-space:pre;line-height:1.6}.tpig-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.tpig-actions button{flex:1;min-width:180px}.tpig-source{display:block;padding:7px 0;border-bottom:1px solid #2b3040;color:#b9d8ff;text-decoration:none}.tpig-source:hover{text-decoration:underline}.tpig-source-note{display:block;padding:7px 0;border-bottom:1px solid #2b3040;color:#c8cedb}.tpig-rule{margin:4px 0;padding-left:20px;color:#c8cedb}.tpig-flow{background:#11151e;border:1px solid #303849;border-radius:12px;padding:10px;margin:10px 0;font-weight:600;line-height:1.7}';document.head.appendChild(s)}
function ensure(){addStyles();if(document.getElementById('tpInputGuide'))return;const d=document.createElement('div');d.id='tpInputGuide';d.innerHTML='<div class="tpig-card"><div class="tpig-head"><h2>📖 現実の情報を表にする</h2><button class="tpig-x" data-tpig-close>×</button></div><div class="tpig-flow">現実 → 情報源 → データ取得 → 表への変換 → 記録</div><p class="tpig-meta">「表を作る」前に、何を観測して、どこから取得して、どんな列に変換するかを決めます。ニュースは数値の原典ではなく、出来事・背景の入口として使います。</p><div class="tpig-meta"><b>情報源の優先順</b>'+SOURCE_RULES.map(x=>'<div class="tpig-rule">→ '+esc(x)+'</div>').join('')+'</div><div class="tpig-cats" id="tpigCats"></div><div id="tpigBody"></div></div>';document.body.appendChild(d);d.addEventListener('click',e=>{const k=e.target.closest('[data-tpig-cat]');if(k)show(k.dataset.tpigCat);if(e.target.closest('[data-tpig-close]')||e.target===d)d.classList.remove('on');const start=e.target.closest('[data-tpig-start]');if(start)startTable(start.dataset.tpigStart);const copy=e.target.closest('[data-tpig-copy]');if(copy)copyTsv(copy.dataset.tpigCopy)});Object.keys(DATA).forEach(k=>{const x=DATA[k];const b=document.createElement('button');b.className='tpig-cat';b.dataset.tpigCat=k;b.textContent=x.icon+' '+x.title;document.getElementById('tpigCats').appendChild(b)});show('observe')}
function show(k){const x=DATA[k]||DATA.observe;document.querySelectorAll('[data-tpig-cat]').forEach(b=>b.classList.toggle('on',b.dataset.tpigCat===k));const tsv=x.columns.join('\t')+'\n'+x.sample.join('\t');const sources=(x.sources||[]).map(s=>s.url?'<a class="tpig-source" href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">↗ '+esc(s.label)+'</a>':'<span class="tpig-source-note">◎ '+esc(s.label)+'</span>').join('');document.getElementById('tpigBody').innerHTML='<h3>'+x.icon+' '+esc(x.title)+'</h3><p>'+esc(x.purpose)+'</p><p class="tpig-meta">取得・入力方法：'+esc(x.method)+'</p><b>推奨する列</b><div class="tpig-cols">'+x.columns.map(esc).map(v=>'<span class="tpig-col">'+v+'</span>').join('')+'</div><b>情報源</b><div>'+sources+'</div><p class="tpig-meta">※ 数値の原典がある場合は報道記事ではなく原典を優先し、取得日時とURLを表に残します。</p><b>開始例</b><pre class="tpig-pre">'+esc(tsv)+'</pre><div class="tpig-actions"><button class="pri" data-tpig-start="'+esc(k)+'">この形で表を始める</button><button data-tpig-copy="'+esc(k)+'">見本をコピー</button></div>'}
async function copyTsv(k){const x=DATA[k]||DATA.observe;const t=x.columns.join('\t')+'\n'+x.sample.join('\t');try{await navigator.clipboard.writeText(t);toast('見本をコピーしました。表へ貼り付けてください。')}catch(e){const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();toast('見本をコピーしました。')}}
async function startTable(k){await copyTsv(k);document.getElementById('tpInputGuide').classList.remove('on');const buttons=[...document.querySelectorAll('button')];const b=buttons.find(x=>/貼り付け/.test(x.textContent||''));if(b){setTimeout(()=>b.click(),120);return}toast('見本をコピーしました。「📥 貼り付け」から入れてください。')}
function toast(m){if(typeof window.toast==='function'){window.toast(m);return}const d=document.createElement('div');d.textContent=m;d.style='position:fixed;left:50%;bottom:160px;transform:translateX(-50%);z-index:120;background:#000;color:#fff;padding:10px 14px;border-radius:20px';document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}
function open(){ensure();document.getElementById('tpInputGuide').classList.add('on')}
function injectButton(){if(document.getElementById('tpInputGuideBtn'))return;const b=document.createElement('button');b.id='tpInputGuideBtn';b.textContent='📖 入力手引き';b.title='現実の情報を表に変換する';b.addEventListener('click',open);const h=document.querySelector('header');if(h)h.appendChild(b);else document.body.prepend(b)}
window.TablePadInputGuide={open,DATA};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectButton);else injectButton();
})();
