(function(){
'use strict';
if(window.TablePadOfficialInfo)return;
function make(){
 if(document.getElementById('tpOfficialInfo'))return;
 const box=document.createElement('div');box.id='tpOfficialInfo';box.style.cssText='position:fixed;right:14px;bottom:74px;z-index:9998;font-family:system-ui,sans-serif;';
 const b=document.createElement('button');b.type='button';b.textContent='🌐 公的情報';b.style.cssText='padding:10px 13px;border:1px solid #aaa;border-radius:12px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.15);font-weight:700;cursor:pointer;';
 const panel=document.createElement('div');panel.hidden=true;panel.style.cssText='position:absolute;right:0;bottom:48px;width:min(410px,calc(100vw - 28px));max-height:72vh;overflow:auto;background:#fff;border:1px solid #aaa;border-radius:14px;padding:14px;box-shadow:0 8px 28px rgba(0,0,0,.22);color:#222;';
 const title=document.createElement('div');title.textContent='🌐 公的情報源';title.style.fontWeight='700';panel.appendChild(title);
 const sub=document.createElement('div');sub.textContent='公式サイトを開いて確認し、必要な情報だけtable-padへ記録します。';sub.style.cssText='font-size:12px;margin-top:4px;color:#666';panel.appendChild(sub);
 const status=document.createElement('div');status.style.cssText='margin-top:10px;padding:9px;border:1px solid #ddd;border-radius:10px;font-size:12px;line-height:1.5';panel.appendChild(status);
 const renderStatus=()=>{status.textContent='確認中…';if(!window.TablePadOfficialStatus){status.textContent='状態チェッカー未読込';return}const s=window.TablePadOfficialStatus.summary();status.textContent='実装済み '+s.ready+' / API設定待ち '+s.config+' / 次段階 '+s.next+' / 未読込 '+s.missing+'　（'+new Date(s.checkedAt).toLocaleString('ja-JP')+'）'};
 ['現実世界','社会・経済','技術'].forEach(layer=>{const h=document.createElement('h4');h.textContent=layer;h.style.margin='14px 0 6px';panel.appendChild(h);(window.TablePadOfficialSources?TablePadOfficialSources.byLayer(layer):[]).forEach(x=>{const row=document.createElement('div');row.style.cssText='padding:8px 0;border-top:1px solid #eee';const a=document.createElement('a');a.href=x.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=x.icon+' '+x.name+' ↗';a.style.fontWeight='700';const d=document.createElement('div');d.textContent=x.detail;d.style.cssText='font-size:12px;color:#666;margin-top:3px;line-height:1.45';row.appendChild(a);row.appendChild(d);panel.appendChild(row)})});
 const note=document.createElement('div');note.textContent='※ 通信節約のため、状態確認はローカル実装の読込状態だけを見ます。公式API・公式サイトへの通信は各「取得」操作時だけです。';note.style.cssText='font-size:11px;color:#777;border-top:1px solid #eee;padding-top:9px;margin-top:10px';panel.appendChild(note);
 b.onclick=function(){panel.hidden=!panel.hidden;if(!panel.hidden)renderStatus()};document.addEventListener('click',function(e){if(!box.contains(e.target))panel.hidden=true});box.appendChild(panel);box.appendChild(b);document.body.appendChild(box);
}
window.TablePadOfficialInfo={make};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',make);else make();
})();
