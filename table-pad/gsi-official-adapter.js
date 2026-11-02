(function(){
'use strict';
if(window.TablePadGSI)return;
const VERSION='table_pad_gsi_official_v1';
const API='https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php';
function clean(v,n){return String(v==null?'':v).trim().slice(0,n||500)}
function validCoord(lat,lon){return Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Number(lat)>=-90&&Number(lat)<=90&&Number(lon)>=-180&&Number(lon)<=180}
function elevationUrl(lat,lon){return API+'?lon='+encodeURIComponent(lon)+'&lat='+encodeURIComponent(lat)+'&outtype=JSON'}
async function getElevation(lat,lon){
 if(!validCoord(lat,lon))throw new Error('緯度・経度が不正です');
 const url=elevationUrl(lat,lon);
 const r=await fetch(url,{cache:'no-store'});
 if(!r.ok)throw new Error('国土地理院の標高APIに接続できませんでした（HTTP '+r.status+'）');
 const data=await r.json();
 if(!data||data.elevation==='-----')throw new Error('この地点の標高値を取得できませんでした');
 return {schema:VERSION,source:'gsi',sourceName:'国土地理院',authority:'国土地理院',title:'標高',category:'地形・標高',value:Number(data.elevation),unit:'m',latitude:Number(lat),longitude:Number(lon),location:clean(Number(lat).toFixed(6)+', '+Number(lon).toFixed(6),80),sourceUrl:url,method:'official-api',observedAt:new Date().toISOString(),elevationSource:clean(data.hsrc,80)};
}
async function observeCurrentPosition(){
 if(!window.TablePadGeo)throw new Error('位置情報モジュールが未読込です');
 const p=await window.TablePadGeo.getPosition();
 const item=await getElevation(p.latitude,p.longitude);
 item.accuracy=p.accuracy;
 item.mapUrl=p.mapUrl;
 item.notes='端末位置情報から取得。標高データ: '+item.elevationSource+(p.accuracy?'。位置精度 約'+Math.round(p.accuracy)+'m':'');
 return item;
}
function toOfficial(item){return window.TablePadOfficialData.normalize('gsi',{title:item.title,category:item.category,value:item.value,unit:item.unit,location:item.location,latitude:item.latitude,longitude:item.longitude,sourceUrl:item.sourceUrl,method:item.method,observedAt:item.observedAt,notes:item.notes})}
window.TablePadGSI={VERSION,API,elevationUrl,getElevation,observeCurrentPosition,toOfficial};
})();
