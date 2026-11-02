(function(){
'use strict';
if(window.TablePadBOJ)return;
const VERSION='table_pad_boj_official_v1';
const API='https://www.stat-search.boj.or.jp/api/v1/';
function clean(v,n){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,n||1000)}
function validDb(v){return /^[A-Za-z0-9]{2,4}$/.test(String(v||''))}
function validCode(v){return String(v||'').split(',').map(x=>x.trim()).filter(Boolean).every(x=>/^[^<>"!|\\;']+$/.test(x))}
function getUrl(path,p){const q=new URLSearchParams();Object.keys(p||{}).forEach(k=>{if(p[k]!==''&&p[k]!=null)q.set(k,String(p[k]))});return API+path+'?'+q.toString()}
async function request(path,p){const url=getUrl(path,p);const r=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}});const text=await r.text();if(!r.ok)throw new Error('日本銀行APIに接続できませんでした（HTTP '+r.status+'）');let data;try{data=JSON.parse(text)}catch(e){throw new Error('日本銀行APIのJSONを解釈できませんでした')};if(data&&Number(data.STATUS)!==200)throw new Error(clean(data.MESSAGE||'日本銀行APIエラー',300));return {schema:VERSION,source:'boj',sourceName:'日本銀行',authority:'日本銀行',sourceUrl:url,data,observedAt:new Date().toISOString()}}
async function getDataCode(p){const x=Object.assign({format:'json',lang:'jp'},p||{});if(!validDb(x.db))throw new Error('DB名が不正です');if(!validCode(x.code))throw new Error('系列コードが不正です');return request('getDataCode',x)}
async function getMetadata(db){if(!validDb(db))throw new Error('DB名が不正です');return request('getMetadata',{format:'json',lang:'jp',db})}
function results(x){const d=x&&x.data;return Array.isArray(d&&d.RESULTSET)?d.RESULTSET:[]}
function rows(x,limit){const out=[['取得日時','情報源','DB','系列コード','系列名称','カテゴリ','期種','最終更新日','時点','値','単位','情報源URL','取得方法']];const max=Math.max(1,Number(limit)||500);const db=clean(x&&x.data&&x.data.PARAMETER&&x.data.PARAMETER.DB||'',30);let count=0;for(const s of results(x)){const code=clean(s.SERIES_CODE,200);const name=clean(s.NAME_OF_TIME_SERIES_J||s.NAME_OF_TIME_SERIES,300);const cat=clean(s.CATEGORY_J||s.CATEGORY,200);const freq=clean(s.FREQUENCY,80);const updated=clean(s.LAST_UPDATE,30);const unit=clean(s.UNIT_J||s.UNIT,100);const block=s.VALUES&&typeof s.VALUES==='object'?s.VALUES:{};const dates=Array.isArray(block.SURVEY_DATES)?block.SURVEY_DATES:[];const vals=Array.isArray(block.VALUES)?block.VALUES:[];for(let i=0;i<Math.min(dates.length,vals.length);i++){if(count>=max)return out;out.push([new Date().toISOString(),'日本銀行',db,code,name,cat,freq,updated,String(dates[i]),String(vals[i]==null?'':vals[i]),unit,x.sourceUrl,'official-api']);count++}}return out}
function toOfficial(x){const rr=rows(x,1);const r=rr[1];return {schema:VERSION,source:'boj',sourceName:'日本銀行',authority:'日本銀行',title:(r&&r[4])||'日本銀行 時系列統計',category:'金融・経済統計',value:r?String(r[9]):'取得データ',unit:r?String(r[10]||''):'',location:'',latitude:null,longitude:null,sourceUrl:x.sourceUrl,method:'official-api',observedAt:x.observedAt,notes:'日本銀行 時系列統計データ検索サイト API'}}
window.TablePadBOJ={VERSION,API,getUrl,getDataCode,getMetadata,rows,toOfficial};
})();
