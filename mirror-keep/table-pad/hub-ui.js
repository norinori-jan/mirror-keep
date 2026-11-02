// table-pad -> flow-hub UI bridge
(function(){
  'use strict';
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,160)}
  function readTables(){try{return JSON.parse(localStorage.getItem('tp_tables_v1')||'[]')}catch(e){return[]}}
  function currentTable(){const ts=readTables(),id=localStorage.getItem('tp_cur');return ts.find(t=>t.id===id)||ts[0]||null}
  function session(){return window.TablePadActivity?TablePadActivity.session():[]}
  function activity(){
    const t=currentTable(),ev=session().filter(e=>e&&e.kind==='semantic');
    const types=ev.map(e=>e.type),last=ev.length?ev[ev.length-1]:null;
    const completed=ev.filter(e=>e.type==='completed'||e.type==='sent').map(e=>clean(e.detail));
    const outputs=[];
    if(t)outputs.push('表：'+clean(t.title||'無題'));
    if(t&&t.flow)outputs.push('フロー：'+clean(t.title||'無題'));
    const status=last&&last.type||'opened';
    return {projectName:t?clean(t.title||'無題'):'table-pad',app:'table-pad',stage:'structure',stageLabel:'構造化・整理',currentStatus:status,canAdvance:types.some(x=>['created','edited','saved','completed','sent'].includes(x)),appsUsed:['table-pad'],completedSteps:completed,outputs:[...new Set(outputs)],semanticEvents:ev.slice(-30),summary:t?'「'+clean(t.title||'無題')+'」を表・フローとして整理しました。':'table-padで構造化・整理を行いました。',sourceAction:last?clean(last.detail):'table-padを開いた',sourceRef:location.href};
  }
  function add(){
    if(document.getElementById('hubTablePadBtn'))return;
    const b=document.createElement('button');b.id='hubTablePadBtn';b.type='button';b.textContent='⌂ flow-hubへ';
    Object.assign(b.style,{position:'fixed',right:'12px',top:'62px',zIndex:'9999',padding:'9px 12px',borderRadius:'12px',border:'1px solid #4A9EFF',background:'#181b24',color:'#eef1f7',font:'600 14px -apple-system,BlinkMacSystemFont,"Hiragino Sans",sans-serif',boxShadow:'0 4px 16px #0008'});
    b.addEventListener('click',function(){try{if(window.TablePadActivity)TablePadActivity.semantic('sent','flow-hubへ実績を送る',{source:'hub-ui',target:'flow-hub'});const a=activity();if(window.TablePadHandoff)TablePadHandoff.send({intent:'構造化した表・フローを振り返る',activity:a});else location.href='https://norinori-jan.github.io/flow-hub/'}catch(e){location.href='https://norinori-jan.github.io/flow-hub/'}});
    document.body.appendChild(b);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();
})();
(function(){
  function load(src,id){if(document.getElementById(id))return;var s=document.createElement('script');s.id=id;s.src=src;s.async=false;document.body.appendChild(s)}
  function loadGuide(){load('./input-guide.js','tpInputGuideScript');load('./real-world-entry.js','tpRealWorldScript')}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadGuide);else loadGuide();
})();
