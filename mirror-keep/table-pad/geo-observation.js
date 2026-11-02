(function(){'use strict';
const VERSION='table_pad_geo_observation_v1';
const GSI='https://maps.gsi.go.jp/';
function gsiUrl(lat,lon,z){const a=Number(lat),b=Number(lon);if(!Number.isFinite(a)||!Number.isFinite(b))return '';return GSI+'#'+(z||16)+'/'+a+'/'+b}
function getPosition(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('位置情報を利用できません'));navigator.geolocation.getCurrentPosition(p=>resolve({schema:VERSION,latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy||null,observedAt:new Date().toISOString(),source:'device-geolocation',mapUrl:gsiUrl(p.coords.latitude,p.coords.longitude)}),reject,{enableHighAccuracy:true,timeout:10000,maximumAge:30000})})}
function openMap(x){if(!x||!x.mapUrl)return false;window.open(x.mapUrl,'_blank','noopener');return true}
window.TablePadGeo={VERSION,GSI,getPosition,gsiUrl,openMap};
})();
