(function(){
'use strict';
if(window.TablePadOfficialSources)return;
const VERSION='table_pad_official_sources_v1';
const SOURCES=[
{id:'gsi',layer:'現実世界',icon:'🌏',name:'国土地理院',authority:'国土地理院',url:'https://maps.gsi.go.jp/',detail:'地図・空中写真・地形・標高・位置・GIS',actions:['地図','位置','標高','地形','防災']},
{id:'mlit',layer:'現実世界',icon:'🚧',name:'国土交通省',authority:'国土交通省',url:'https://www.mlit.go.jp/',detail:'交通・道路・河川・土地・防災・社会基盤',actions:['交通','道路','河川','防災','土地']},
{id:'jma',layer:'現実世界',icon:'🌦',name:'気象庁',authority:'気象庁',url:'https://www.jma.go.jp/',detail:'天気・雨・台風・地震・津波・警報',actions:['気象','雨','地震','津波','警報']},
{id:'boj',layer:'社会・経済',icon:'💴',name:'日本銀行',authority:'日本銀行',url:'https://www.boj.or.jp/statistics/',detail:'金利・物価・金融・資金循環・短観・国際収支',actions:['金利','物価','金融','資金循環','景気']},
{id:'mof',layer:'社会・経済',icon:'🏛',name:'財務省',authority:'財務省',url:'https://www.mof.go.jp/',detail:'財政・国債・税・予算・国際金融',actions:['財政','国債','税','予算']},
{id:'fsa',layer:'社会・経済',icon:'🏦',name:'金融庁',authority:'金融庁',url:'https://www.fsa.go.jp/',detail:'金融制度・金融機関・監督・金融市場',actions:['金融制度','金融機関','市場','監督']},
{id:'estat',layer:'社会・経済',icon:'📊',name:'e-Stat',authority:'政府統計',url:'https://www.e-stat.go.jp/',detail:'各府省の政府統計を横断して検索・利用',actions:['統計','人口','経済','産業','地域']},
{id:'digital',layer:'技術',icon:'💻',name:'デジタル庁',authority:'デジタル庁',url:'https://www.digital.go.jp/resources/open_data',detail:'オープンデータ・行政データ・デジタル基盤',actions:['オープンデータ','行政','標準']},
{id:'ipa',layer:'技術',icon:'🛡',name:'IPA',authority:'情報処理推進機構',url:'https://www.ipa.go.jp/',detail:'IT・AI・サイバーセキュリティ・DX・技術資料',actions:['AI','セキュリティ','IT','DX']},
{id:'nedo',layer:'技術',icon:'🔬',name:'NEDO',authority:'新エネルギー・産業技術総合開発機構',url:'https://www.nedo.go.jp/',detail:'エネルギー・AI・ロボット・半導体等の技術開発',actions:['技術開発','エネルギー','AI','ロボット']},
{id:'aist',layer:'技術',icon:'🧪',name:'産総研',authority:'産業技術総合研究所',url:'https://www.aist.go.jp/',detail:'産業技術・研究・計測・標準・地質・AI',actions:['研究','計測','標準','地質','AI']}
];
function list(){return SOURCES.slice()}
function byLayer(layer){return SOURCES.filter(x=>x.layer===layer)}
function find(id){return SOURCES.find(x=>x.id===id)||null}
function open(id){const x=find(id);if(!x)return false;window.open(x.url,'_blank','noopener');return true}
window.TablePadOfficialSources={VERSION,SOURCES,list,byLayer,find,open};
})();
