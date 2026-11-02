(function(){
'use strict';
if(window.TablePadOfficialData)return;
const VERSION='table_pad_official_data_v1';
const SOURCES={
 gsi:{id:'gsi',name:'国土地理院',authority:'国土地理院',mode:'manual',url:'https://maps.gsi.go.jp/'},
 mlit:{id:'mlit',name:'国土交通省',authority:'国土交通省',mode:'manual',url:'https://www.mlit.go.jp/'},
 jma:{id:'jma',name:'気象庁',authority:'気象庁',mode:'manual',url:'https://www.jma.go.jp/'},
 boj:{id:'boj',name:'日本銀行',authority:'日本銀行',mode:'manual',url:'https://www.boj.or.jp/statistics/'},
 mof:{id:'mof',name:'財務省',authority:'財務省',mode:'manual',url:'https://www.mof.go.jp/'},
 fsa:{id:'fsa',name:'金融庁',authority:'金融庁',mode:'manual',url:'https://www.fsa.go.jp/'},
 estat:{id:'estat',name:'e-Stat',authority:'政府統計',mode:'manual',url:'https://www.e-stat.go.jp/'},
 digital:{id:'digital',name:'デジタル庁',authority:'デジタル庁',mode:'manual',url:'https://www.digital.go.jp/resources/open_data'},
 ipa:{id:'ipa',name:'IPA',authority:'情報処理推進機構',mode:'manual',url:'https://www.ipa.go.jp/'},
 nedo:{id:'nedo',name:'NEDO',authority:'新エネルギー・産業技術総合開発機構',mode:'manual',url:'https://www.nedo.go.jp/'},
 aist:{id:'aist',name:'産総研',authority:'産業技術総合研究所',mode:'manual',url:'https://www.aist.go.jp/'}
};
function clean(v,n){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n||500)}
function now(){return new Date().toISOString()}
function normalize(source,input){const s=SOURCES[source]||null;const x=input||{};return {schema:VERSION,source:s?s.id:clean(source,60),sourceName:s?s.name:clean(x.sourceName,120),authority:s?s.authority:clean(x.authority,120),observedAt:x.observedAt||now(),title:clean(x.title,200),category:clean(x.category,100),value:clean(x.value,1000),unit:clean(x.unit,80),location:clean(x.location,160),latitude:x.latitude===''||x.latitude==null?null:Number(x.latitude),longitude:x.longitude===''||x.longitude==null?null:Number(x.longitude),sourceUrl:clean(x.sourceUrl||(s&&s.url),500),method:clean(x.method||'official-manual',80),raw:x.raw==null?null:clean(x.raw,3000),notes:clean(x.notes,1000)}}
function rows(items){const h=['観測日時','情報源','所管','項目','分類','値','単位','場所','緯度','経度','情報源URL','取得方法','備考'];return [h].concat((items||[]).map(x=>[x.observedAt,x.sourceName,x.authority,x.title,x.category,x.value,x.unit,x.location,x.latitude==null?'':x.latitude,x.longitude==null?'':x.longitude,x.sourceUrl,x.method,x.notes]))}
function make(source,input){const item=normalize(source,input);return {schema:VERSION,item,rows:rows([item])}}
function addTable(source,input,title){const r=make(source,input);if(window.TablePadOfficialStore&&typeof window.TablePadOfficialStore.append==='function')return window.TablePadOfficialStore.append(r.rows,title||('公的情報・'+r.item.sourceName));if(typeof window.newTable==='function'){window.newTable(title||('公的情報・'+r.item.sourceName),r.rows);return {created:true,added:1,mode:'legacy'}}return {created:false,added:0,error:'保存機能が未読込',rows:r.rows,item:r.item}}
window.TablePadOfficialData={VERSION,SOURCES,normalize,rows,make,addTable};
})();
