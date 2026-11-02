// table-pad -> flow-hub semantic activity
(function(){
 const KEY='table_pad_hub_activity_v1',SESSION='table_pad_hub_activity_session_v1',MAX=120;
 function read(k){try{return JSON.parse(localStorage.getItem(k)||'[]')}catch(e){return[]}} function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
 function clean(v){return String(v||'').replace(/\s+/g,' ').trim().slice(0,160)}
 function push(e){const a=read(KEY);a.push(e);while(a.length>MAX)a.shift();write(KEY,a);const s=read(SESSION);s.push(e);while(s.length>MAX)s.shift();write(SESSION,s);return e}
 function semantic(type,detail,meta){return push({at:new Date().toISOString(),app:'table-pad',stage:'structure',kind:'semantic',type,detail:clean(detail),...(meta||{})})}
 function record(action,detail,meta){return push({at:new Date().toISOString(),app:'table-pad',stage:'structure',kind:'action',action:clean(action),detail:clean(detail),...(meta||{})})}
 window.TablePadActivity={semantic,mark:semantic,record,session:()=>read(SESSION),all:()=>read(KEY),clearSession:()=>write(SESSION,[])};
 if(!read(SESSION).some(e=>e.kind==='semantic'&&e.type==='opened'))semantic('opened','table-padを開いた');
 document.addEventListener('click',e=>{const el=e.target.closest('button');if(!el)return;const t=clean(el.innerText||el.title);if(!t)return;record('click',t);if(/新しい表|取り込む|取り込み|追加/.test(t))semantic('created',t,{source:'ui'});else if(/保存|コピー/.test(t))semantic('saved',t,{source:'ui'});else if(/声で入れる|受け取/.test(t))semantic('edited',t,{source:'ui'});},true);
 document.addEventListener('input',e=>{if(e.target.matches('#title,#tb input'))semantic('edited',e.target.id||'cell',{source:'input'})},true);
})();
