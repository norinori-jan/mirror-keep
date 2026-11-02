(function(){
'use strict';
if(window.TablePadJMA)return;
const VERSION='table_pad_jma_official_v1';
const AMEDAS='https://www.jma.go.jp/bosai/amedas/data/map/';
const EQFEED='https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
function clean(v,n){return String(v==null?'':v).trim().slice(0,n||500)}
function pad(n){return String(n).padStart(2,'0')}
function jstDate(d){return new Date(d.getTime()+9*3600000)}
function mapUrl(lat,lon){return 'https://www.jma.go.jp/bosai/map.html#8/'+Number(lat).toFixed(3)+'/'+Number(lon).toFixed(3)+'/&contents=amedas&elem=temp&interval=10'}
function amedasUrl(d){const j=jstDate(d);j.setMinutes(Math.floor(j.getMinutes()/10)*10,0,0);return AMEDAS+j.getUTCFullYear()+pad(j.getUTCMonth()+1)+pad(j.getUTCDate())+pad(j.getUTCHours())+pad(j.getUTCMinutes())+'.json'}
function coord(v){if(Array.isArray(v)&&v.length>=2)return Number(v[0])+Number(v[1])/60;if(Number.isFinite(Number(v)))return Number(v);return NaN}
async function getWeatherAt(lat,lon){
 if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon)))throw new Error('緯度・経度が不正です');
 const url=amedasUrl(new Date());const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error('気象庁アメダスデータに接続できませんでした（HTTP '+r.status+'）');
 const data=await r.json();let best=null;
 Object.keys(data||{}).forEach(id=>{const x=data[id]||{};const a=coord(x.lat),b=coord(x.lon);if(!Number.isFinite(a)||!Number.isFinite(b))return;const dist=(a-Number(lat))**2+(b-Number(lon))**2;if(!best||dist<best.dist)best={id,dist,x,lat:a,lon:b}});
 if(!best)throw new Error('現在時刻のアメダス観測点を取得できませんでした');
 const x=best.x;const vals=[];if(x.temp!=null)vals.push('気温 '+x.temp+' ℃');if(x.humidity!=null)vals.push('湿度 '+x.humidity+' %');if(x.precipitation1h!=null)vals.push('1時間降水量 '+x.precipitation1h+' mm');if(x.wind!=null)vals.push('風速 '+x.wind+' m/s');
 return {schema:VERSION,source:'jma',sourceName:'気象庁',authority:'気象庁',title:'アメダス観測',category:'気象・現在観測',value:vals.join(' / '),unit:'複数',location:'アメダス '+best.id,latitude:best.lat,longitude:best.lon,sourceUrl:url,method:'official-api',observedAt:new Date().toISOString(),notes:'端末位置に最も近い観測点。'+(vals.length?'':'利用可能な観測値なし'),mapUrl:mapUrl(best.lat,best.lon),stationId:best.id};
}
function textOf(doc,names){for(const n of names){const e=doc.getElementsByTagNameNS('*',n)[0]||doc.getElementsByTagName(n)[0];if(e&&e.textContent)return clean(e.textContent,1000)}return ''}
async function getLatestEarthquake(){
 const fr=await fetch(EQFEED,{cache:'no-store'});if(!fr.ok)throw new Error('気象庁地震XMLフィードに接続できませんでした（HTTP '+fr.status+'）');
 const text=await fr.text();const doc=new DOMParser().parseFromString(text,'application/xml');const entry=doc.getElementsByTagName('entry')[0]||doc.getElementsByTagNameNS('*','entry')[0];if(!entry)throw new Error('地震情報が見つかりませんでした');
 const link=entry.getElementsByTagName('link')[0];const href=link&&link.getAttribute('href');let xml=text;let sourceUrl=EQFEED;
 if(href){sourceUrl=href;const xr=await fetch(href,{cache:'no-store'});if(xr.ok)xml=await xr.text()}
 const xd=new DOMParser().parseFromString(xml,'application/xml');
 const title=textOf(xd,['Title'])||textOf(doc,['title'])||'地震情報';
 const origin=textOf(xd,['OriginTime']);const arrival=textOf(xd,['DateTime']);const hypo=textOf(xd,['HypocenterName']);const mag=textOf(xd,['jmx_eb:Magnitude','Magnitude']);const maxInt=textOf(xd,['MaxInt','MaxIntChange']);
 const summary=[hypo,mag?'M'+mag:'',maxInt?'最大震度 '+maxInt:''].filter(Boolean).join(' / ');
 return {schema:VERSION,source:'jma',sourceName:'気象庁',authority:'気象庁',title:title||'地震情報',category:'地震',value:summary||'地震情報を取得',unit:'',location:hypo,latitude:null,longitude:null,sourceUrl,method:'official-xml-pull',observedAt:new Date().toISOString(),notes:(origin?'発生時刻 '+origin+'。':'')+(arrival?'情報時刻 '+arrival:'')};
}
async function observeCurrentWeather(){if(!window.TablePadGeo)throw new Error('位置情報モジュールが未読込です');const p=await window.TablePadGeo.getPosition();const x=await getWeatherAt(p.latitude,p.longitude);x.notes+=' 端末位置精度 約'+Math.round(p.accuracy||0)+'m';return x}
function toOfficial(item){return window.TablePadOfficialData.normalize('jma',{title:item.title,category:item.category,value:item.value,unit:item.unit,location:item.location,latitude:item.latitude,longitude:item.longitude,sourceUrl:item.sourceUrl,method:item.method,observedAt:item.observedAt,notes:item.notes})}
window.TablePadJMA={VERSION,AMEDAS,EQFEED,amedasUrl,getWeatherAt,getLatestEarthquake,observeCurrentWeather,toOfficial};
})();
