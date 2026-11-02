(function(){
'use strict';
if(window.TablePadMOF)return;
const VERSION='table_pad_mof_official_v1';
const CSV='https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm.csv';
const TENORS=[1,2,3,4,5,6,7,8,9,10,15,20,25,30,40];
function clean(v,n){return String(v==null?'':v).trim().slice(0,n||500)}
function parseCsv(text){return text.replace(/^\uFEFF/,'').split(/\r?\n/).map(line=>{const a=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(q&&line[i+1]==='"'){cur+='"';i++}else q=!q}else if(c===','&&!q){a.push(cur.trim());cur=''}else cur+=c}a.push(cur.trim());return a})}
function eraDate(s){const m=String(s||'').match(/^R(\d+)\.(\d+)\.(\d+)$/i);if(!m)return null;return (2018+Number(m[1]))+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0')}
async function fetchLatest(){const r=await fetch(CSV,{cache:'no-store'});if(!r.ok)throw new Error('財務省の国債金利CSVに接続できませんでした（HTTP '+r.status+'）');const buf=await r.arrayBuffer();const text=new TextDecoder('shift-jis').decode(buf);const table=parseCsv(text);const rows=table.filter(r=>/^R\d+\.\d+\.\d+$/i.test(r[0]||''));if(!rows.length)throw new Error('財務省CSVから観測行を見つけられませんでした');const latest=rows[rows.length-1];const date=eraDate(latest[0]);const observations=TENORS.map((tenor,i)=>({date,tenorYears:tenor,value:clean(latest[i+1]),unit:'%',source:'mof',sourceName:'財務省',authority:'財務省',sourceUrl:CSV,method:'official-csv',observedAt:new Date().toISOString()}));return {schema:VERSION,source:'mof',sourceName:'財務省',authority:'財務省',title:'国債金利情報',observedDate:date,sourceUrl:CSV,observedAt:new Date().toISOString(),observations,rawRow:latest}}
function rows(x){const h=['取得日時','情報源','観測日','年限(年)','利回り(%)','情報源URL','取得方法'];return [h].concat((x&&x.observations||[]).map(o=>[x.observedAt,'財務省',o.date,String(o.tenorYears),o.value,o.sourceUrl,o.method]))}
function toOfficial(x){const o=x&&x.observations&&x.observations[9];return {schema:VERSION,source:'mof',sourceName:'財務省',authority:'財務省',title:'国債金利情報',category:'国債・金利',value:o?String(o.value):'',unit:'%',location:o?String(o.date):'',latitude:null,longitude:null,sourceUrl:CSV,method:'official-csv',observedAt:x.observedAt,notes:'財務省 国債金利情報。主要年限1,2,3,4,5,6,7,8,9,10,15,20,25,30,40年。'}}
window.TablePadMOF={VERSION,CSV,TENORS,fetchLatest,rows,toOfficial};
})();
