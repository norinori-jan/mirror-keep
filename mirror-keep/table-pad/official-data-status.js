(function(){
'use strict';
if(window.TablePadOfficialStatus)return;
const VERSION='table_pad_official_status_v1';
const SOURCES=[
 {id:'estat',name:'e-Stat',module:'TablePadEStat',needs:'appId'},
 {id:'mlit',name:'国土交通省',module:null,needs:'adapter'},
 {id:'digital',name:'デジタル庁',module:null,needs:'adapter'},
 {id:'ipa',name:'IPA',module:null,needs:'adapter'},
 {id:'nedo',name:'NEDO',module:null,needs:'adapter'},
 {id:'aist',name:'産総研',module:null,needs:'adapter'},
 {id:'gsi',name:'国土地理院',module:'TablePadGSI',needs:'ready'},
 {id:'jma',name:'気象庁',module:'TablePadJMA',needs:'ready'},
 {id:'boj',name:'日本銀行',module:'TablePadBOJ',needs:'ready'},
 {id:'mof',name:'財務省',module:'TablePadMOF',needs:'ready'},
 {id:'fsa',name:'金融庁',module:'TablePadFSA',needs:'ready'}
];
function hasModule(name){return !!(name&&window[name])}
function state(x){
 if(x.id==='estat'){
  if(!hasModule(x.module))return {state:'missing',label:'未読込'};
  return window.TablePadEStat.appId()?{state:'ready',label:'API設定済み'}:{state:'config',label:'API ID未設定'};
 }
 if(x.module&&hasModule(x.module))return {state:'ready',label:'実装済み'};
 if(x.needs==='adapter')return {state:'next',label:'次段階'};
 return {state:'missing',label:'未読込'};
}
function check(){return {schema:VERSION,checkedAt:new Date().toISOString(),sources:SOURCES.map(x=>Object.assign({},x,state(x)))} }
function summary(){const r=check();return {checkedAt:r.checkedAt,ready:r.sources.filter(x=>x.state==='ready').length,config:r.sources.filter(x=>x.state==='config').length,next:r.sources.filter(x=>x.state==='next').length,missing:r.sources.filter(x=>x.state==='missing').length}}
window.TablePadOfficialStatus={VERSION,SOURCES,check,summary};
})();
