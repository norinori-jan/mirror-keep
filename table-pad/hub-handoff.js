// table-pad -> flow-hub handoff builder
(function(){
 const PROTOCOL='hub_handoff_v1';
 function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,160)}
 function build(input={}){const a=input.activity||{};return{protocol:PROTOCOL,id:crypto.randomUUID(),createdAt:new Date().toISOString(),source:'table-pad',sourceRef:a.sourceRef||location.href,intent:clean(input.intent||'構造化した内容を振り返る'),context:{text:clean(a.summary||''),tags:['table-pad'],emotion:null,focus:'structure'},payload:{activity:{...a,app:'table-pad',stage:a.stage||'structure',stageLabel:a.stageLabel||'構造化・整理',currentStatus:a.currentStatus||'opened'}},next:{app:'flow-hub',action:'review'},returnTo:'https://norinori-jan.github.io/flow-hub/'}}
 function send(input={}){const h=build(input);location.href='https://norinori-jan.github.io/flow-hub/#hub_handoff_v1='+encodeURIComponent(JSON.stringify(h));return h}
 window.TablePadHandoff={PROTOCOL,build,send};
})();
