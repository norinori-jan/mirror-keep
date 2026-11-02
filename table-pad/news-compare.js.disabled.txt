(function () {
  "use strict";
  if (window.__tpNewsCompare) return;
  window.__tpNewsCompare = true;
  const API = "https://api.gdeltproject.org/api/v2/doc/doc";
  const KEY = "tablePad.internationalNewsCompare.v1";
  const countries = [["US","United States"],["GB","United Kingdom"],["DE","Germany"],["FR","France"],["BE","Belgium"],["IT","Italy"],["ES","Spain"],["NL","Netherlands"],["PL","Poland"],["CN","China"]];
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const style = document.createElement("style");
  style.textContent = `
  #tpnc-open{position:fixed;right:18px;bottom:18px;z-index:2147483000;border:0;border-radius:30px;padding:13px 18px;background:#173b57;color:white;font:600 14px system-ui;box-shadow:0 5px 22px #0003;cursor:pointer}
  #tpnc-cover{position:fixed;inset:0;z-index:2147483001;background:#0b1724aa;display:none;align-items:center;justify-content:center;padding:14px}
  #tpnc-box{box-sizing:border-box;width:min(1080px,100%);max-height:94vh;overflow:auto;background:#fff;color:#17212b;border-radius:15px;padding:20px;font:14px/1.5 system-ui}
  #tpnc-box *{box-sizing:border-box}#tpnc-box h2{margin:0 0 5px}#tpnc-box label{display:block;font-weight:600;margin:10px 0 4px}
  #tpnc-box input,#tpnc-box select{width:100%;padding:10px;border:1px solid #ccd5dd;border-radius:8px;background:white;color:#17212b}
  #tpnc-box button{border:0;border-radius:8px;padding:10px 13px;background:#173b57;color:white;cursor:pointer;font-weight:600}
  #tpnc-box button.alt{background:#e8eef3;color:#17212b}#tpnc-box button:disabled{opacity:.5;cursor:wait}
  #tpnc-box .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}#tpnc-box .actions{display:flex;gap:8px;flex-wrap:wrap;margin:13px 0}
  #tpnc-box .card{border:1px solid #dce3e9;border-radius:9px;padding:11px;margin:8px 0;overflow-wrap:anywhere}
  #tpnc-box .muted{font-size:12px;color:#596773}#tpnc-box .notice{background:#fff4df;border-radius:8px;padding:10px;margin:12px 0}
  #tpnc-box a{color:#125b91}@media(max-width:650px){#tpnc-box .grid{grid-template-columns:1fr}#tpnc-box{padding:13px}}
  `;
  document.head.appendChild(style);
  const open = document.createElement("button"); open.id = "tpnc-open"; open.textContent = "蝗ｽ髫帙ル繝･繝ｼ繧ｹ豈碑ｼ・;
  const cover = document.createElement("div"); cover.id = "tpnc-cover";
  cover.innerHTML = `<section id="tpnc-box" role="dialog" aria-modal="true" aria-labelledby="tpnc-title">
    <div style="display:flex;justify-content:space-between;gap:12px"><div><h2 id="tpnc-title">AI繝九Η繝ｼ繧ｹ豈碑ｼ・ｼ亥嵜髫帛ｱ驕難ｼ・/h2><div class="muted">蜈ｱ騾壹ユ繝ｼ繝槭〒蜷・嵜繝｡繝・ぅ繧｢縺ｮ蛟呵｣懆ｨ倅ｺ九ｒ荳ｦ縺ｹ縲∝・蜈ｸ莉倥″蛻・梵縺ｮ貅門ｙ繧偵＠縺ｾ縺吶・/div></div><button class="alt" id="tpnc-close">髢峨§繧・/button></div>
    <div class="notice">蝗ｽ蜀・帆蠎懃ｳｻ諠・ｱ縺ｮ繝励Ο繧ｸ繧ｧ繧ｯ繝医→縺ｯ蛻・屬縺励※縺・∪縺吶ゅ％縺ｮ逕ｻ髱｢縺ｧ縺ｯ蝗ｽ髫帛ｱ驕薙Γ繝・ぅ繧｢縺ｮ隕句・縺励・蟐剃ｽ薙・譌･莉倥・URL縺縺代ｒ蜿朱寔縺励∪縺吶・I API縺ｯ譛ｪ謗･邯壹〒縲、I蛻・梵逕ｨ繝励Ο繝ｳ繝励ヨ繧剃ｽ懈・縺励∪縺吶・U讖滄未縺ｮ蜈ｬ蠑剰ｦ玖ｧ｣縺ｨ蜉逶溷嵜繝ｻ闍ｱ蝗ｽ繝｡繝・ぅ繧｢繧貞酔荳隕悶＠縺ｾ縺帙ｓ縲・/div>
    <label for="tpnc-topic">蜈ｱ騾壹ユ繝ｼ繝橸ｼ郁恭隱槭・遏ｭ縺・ｪ槫唱繧呈耳螂ｨ・・/label><input id="tpnc-topic" placeholder="萓・ climate policy / Ukraine aid / AI regulation">
    <div class="grid"><div><label for="tpnc-a">豈碑ｼ・ｯｾ雎｡ A・亥ｪ剃ｽ捺園蝨ｨ蝗ｽ・・/label><select id="tpnc-a"></select></div><div><label for="tpnc-b">豈碑ｼ・ｯｾ雎｡ B・亥ｪ剃ｽ捺園蝨ｨ蝗ｽ・・/label><select id="tpnc-b"></select></div></div>
    <div class="actions"><button id="tpnc-fetch">荳｡蛛ｴ縺ｮ險倅ｺ句呵｣懊ｒ蜿門ｾ・/button><button id="tpnc-copy" class="alt" disabled>AI蛻・梵繝励Ο繝ｳ繝励ヨ繧偵さ繝斐・</button><button id="tpnc-save" class="alt" disabled>JSON菫晏ｭ・/button><button id="tpnc-history" class="alt">驕主悉縺ｮ豈碑ｼ・/button></div>
    <div id="tpnc-status" class="muted" role="status">繝・・繝槭ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・/div>
    <div class="grid"><div><h3 id="tpnc-at">豈碑ｼ・A</h3><div id="tpnc-ar"></div></div><div><h3 id="tpnc-bt">豈碑ｼ・B</h3><div id="tpnc-br"></div></div></div><div id="tpnc-hist"></div>
    <p class="muted">蜿門ｾ怜・: GDELT DOC API縲ょ呵｣懆ｨ倅ｺ九・邯ｲ鄒・ｧ繝ｻ莉｣陦ｨ諤ｧ繝ｻ豁｣遒ｺ諤ｧ繧剃ｿ晁ｨｼ縺励∪縺帙ｓ縲りｨ倅ｺ区悽譁・・蜿門ｾ励＠縺ｾ縺帙ｓ縲る壻ｿ｡迺ｰ蠅・ｄCORS蛻ｶ髯舌↓繧医ｊ蜿門ｾ励〒縺阪↑縺・ｴ蜷医′縺ゅｊ縺ｾ縺吶・/p>
  </section>`;
  document.body.append(open, cover);
  countries.forEach(([code,name]) => { $("tpnc-a").add(new Option(`${name} (${code})`,code)); $("tpnc-b").add(new Option(`${name} (${code})`,code)); });
  $("tpnc-a").value = "US"; $("tpnc-b").value = "DE";
  let current = null;
  open.onclick = () => cover.style.display = "flex";
  $("tpnc-close").onclick = () => cover.style.display = "none";
  cover.onclick = e => { if (e.target === cover) cover.style.display = "none"; };
  document.addEventListener("keydown", e => { if (e.key === "Escape") cover.style.display = "none"; });
  const nameOf = c => (countries.find(x => x[0] === c) || [c,c])[1];
  function dateOf(v) { const m = String(v || "").match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/); return m ? `${m[1]}-${m[2]}-${m[3]}${m[4] ? " "+m[4]+":"+(m[5]||"00")+" UTC" : ""}` : (v || "譌･莉倅ｸ肴・"); }
  function render(id, rows) {
    $(id).innerHTML = rows.length ? rows.map(a => `<article class="card"><div class="muted">${esc(a.date)} ﾂｷ ${esc(a.domain || "蟐剃ｽ謎ｸ肴・")}</div><a target="_blank" rel="noopener noreferrer" href="${esc(a.url)}">${esc(a.title)}</a></article>`).join("") : '<div class="card">隧ｲ蠖灘呵｣懊↑縺励ゅユ繝ｼ繝槭ｒ遏ｭ縺上＠縺ｦ蜀崎ｩｦ陦後＠縺ｦ縺上□縺輔＞縲・/div>';
  }
  async function fetchSide(topic, code) {
    const url = API + "?query=" + encodeURIComponent(`${topic} sourcecountry:${code}`) + "&mode=artlist&format=json&maxrecords=20&sort=datedesc";
    const r = await fetch(url, {mode:"cors",cache:"no-store"});
    if (!r.ok) throw new Error(`${code}: HTTP ${r.status}`);
    const j = await r.json();
    return (Array.isArray(j.articles) ? j.articles : []).map(a => ({title:a.title||"",url:a.url||"",domain:a.domain||"",date:dateOf(a.seendate||a.date),language:a.language||"",sourcecountry:a.sourcecountry||code})).filter(a => a.title && a.url);
  }
  function prompt(d) {
    const list = (n, rows) => `### ${n}\n` + (rows.length ? rows.map((a,i)=>`${i+1}. 隕句・縺・ ${a.title}\n蟐剃ｽ・ ${a.domain||"荳肴・"} / 譌･莉・ ${a.date}\nURL: ${a.url}`).join("\n") : "蛟呵｣懆ｨ倅ｺ九↑縺・);
    return `縺ゅ↑縺溘・諷朱㍾縺ｪ蝗ｽ髫帛ｱ驕捺ｯ碑ｼ・い繝翫Μ繧ｹ繝医〒縺吶よｬ｡縺ｮA/B縺ｯ蟐剃ｽ捺園蝨ｨ蝗ｽ縺ｧ邨槭▲縺溷呵｣懆ｨ倅ｺ九Γ繧ｿ繝・・繧ｿ縺ｧ縲∬ｨ倅ｺ区悽譁・ｄ荳谺｡雉・侭繧堤｢ｺ隱阪＠縺溯ｨｼ諡縺ｧ縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲・n繝・・繝・ ${d.topic}\nA: ${d.an} (${d.ac})\nB: ${d.bn} (${d.bc})\n蜿門ｾ玲凾蛻ｻ: ${d.at}\n\n${list(d.an,d.a)}\n\n${list(d.bn,d.b)}\n\n谺｡縺ｮA-J縺ｧ譌･譛ｬ隱槫・譫舌＠縺ｦ縺上□縺輔＞縲・nA 遒ｺ隱阪〒縺阪◆莠句ｮ滂ｼ郁ｦ句・縺励□縺代〒譁ｭ螳壹＠縺ｪ縺・ｼ噂nB 蜈ｬ蠑乗帆遲悶・荳谺｡雉・侭・・RL縺ｨ遒ｺ隱咲憾豕・ｼ噂nC 蜈ｱ騾夂せ繝ｻ逶ｸ驕慕せ\nD 逶ｸ驕輔ｒ隱ｬ譏弱☆繧区ｹ諡縺ｨ蜃ｺ蜈ｸ\nE 蛻ｩ螳ｳ髢｢菫ゅ・隱ｲ鬘鯉ｼ井ｺ句ｮ溘→謗ｨ隲悶ｒ蛻・屬・噂nF 蝗ｽ蜀・レ譎ｯ・域ｹ諡縺後≠繧句ｴ蜷医・縺ｿ・噂nG 蠖ｱ髻ｿ・井ｺ句ｮ溘・謗ｨ隲悶・莠域ｸｬ繧貞玄蛻･・噂nH 莉雁ｾ檎｢ｺ隱阪☆縺ｹ縺堺ｺ矩・nI 驕主悉蛻・梵縺ｨ縺ｮ螟牙喧繝ｻ邯咏ｶ壹・遏帷崟・磯℃蜴ｻ蛻・梵縺後↑縺代ｌ縺ｰ豈碑ｼ・ｸ榊庄・噂nJ 荳肴・轤ｹ繝ｻ諠・ｱ荳崎ｶｳ\n\n繝ｫ繝ｼ繝ｫ: 蜈ｷ菴鍋噪荳ｻ蠑ｵ縺ｫ蜃ｺ蜈ｸ繧剃ｻ倥￠繧九よ悴遒ｺ隱阪・譛ｪ遒ｺ隱阪→譖ｸ縺上ょｱ驕薙→荳谺｡雉・侭繧貞玄蛻･縺吶ｋ縲・U讖滄未繝ｻ蜉逶溷嵜繝ｻ闍ｱ蝗ｽ繧剃ｸ諡ｬ繧翫↓縺励↑縺・ょｪ剃ｽ捺園蝨ｨ蝗ｽ繧呈帆蠎懆ｦ玖ｧ｣縺ｨ蜷御ｸ隕悶＠縺ｪ縺・よｹ諡縺ｪ縺乗э蝗ｳ繧呈ｱｺ繧√▽縺代★縲∵攝譁吩ｸ崎ｶｳ縺ｪ繧臥ｵ占ｫ悶ｒ菫晉蕗縺吶ｋ縲Ａ;
  }
  function readHistory() { try { return JSON.parse(localStorage.getItem(KEY)||"[]"); } catch (_) { return []; } }
  function saveHistory(d) { try { const h=readHistory(); h.unshift(d); localStorage.setItem(KEY,JSON.stringify(h.slice(0,10))); } catch (_) {} }
  $("tpnc-fetch").onclick = async () => {
    const topic = $("tpnc-topic").value.trim(), ac=$("tpnc-a").value, bc=$("tpnc-b").value;
    if (!topic) { $("tpnc-status").textContent="繝・・繝槭ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞縲・; return; }
    if (ac===bc) { $("tpnc-status").textContent="逡ｰ縺ｪ繧句嵜繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲・; return; }
    const btn=$("tpnc-fetch"); btn.disabled=true; $("tpnc-status").textContent="蜿門ｾ嶺ｸｭ窶ｦ";
    $("tpnc-copy").disabled=true; $("tpnc-save").disabled=true;
    try {
      const [a,b]=await Promise.all([fetchSide(topic,ac),fetchSide(topic,bc)]);
      current={topic,ac,bc,an:nameOf(ac),bn:nameOf(bc),a,b,at:new Date().toISOString(),source:"GDELT DOC API"};
      $("tpnc-at").textContent=`${current.an} (${a.length}莉ｶ)`; $("tpnc-bt").textContent=`${current.bn} (${b.length}莉ｶ)`;
      render("tpnc-ar",a); render("tpnc-br",b);
      $("tpnc-status").textContent=`蜿門ｾ怜ｮ御ｺ・ A ${a.length}莉ｶ / B ${b.length}莉ｶ縲りｦ句・縺励□縺代〒莠句ｮ溯ｪ榊ｮ壹・縺ｧ縺阪∪縺帙ｓ縲Ａ;
      $("tpnc-copy").disabled=false; $("tpnc-save").disabled=false; saveHistory(current);
    } catch(e) { $("tpnc-status").textContent=`蜿門ｾ励お繝ｩ繝ｼ: ${e.message||e}縲る壻ｿ｡/CORS蛻ｶ髯舌・蜿ｯ閭ｽ諤ｧ縺後≠繧翫∪縺吶Ａ; }
    finally { btn.disabled=false; }
  };
  $("tpnc-copy").onclick = async () => {
    if (!current) return; const text=prompt(current);
    try { await navigator.clipboard.writeText(text); $("tpnc-status").textContent="繝励Ο繝ｳ繝励ヨ繧偵さ繝斐・縺励∪縺励◆縲・I繝√Ε繝・ヨ縺ｫ雋ｼ繧贋ｻ倥￠縺ｦ縺上□縺輔＞縲・; }
    catch (_) { const t=document.createElement("textarea");t.value=text;document.body.appendChild(t);t.select();const ok=document.execCommand("copy");t.remove();$("tpnc-status").textContent=ok?"繝励Ο繝ｳ繝励ヨ繧偵さ繝斐・縺励∪縺励◆縲・:"繧ｳ繝斐・縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆縲・; }
  };
  $("tpnc-save").onclick = () => {
    if (!current) return; const blob=new Blob([JSON.stringify(current,null,2)],{type:"application/json;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="international-news-comparison-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  };
  $("tpnc-history").onclick = () => {
    const h=readHistory(); $("tpnc-hist").innerHTML="<h3>驕主悉縺ｮ豈碑ｼ・ｼ医％縺ｮ繝悶Λ繧ｦ繧ｶ繝ｼ蜀・・譛螟ｧ10莉ｶ・・/h3>"+(h.length?h.map((d,i)=>`<div class="card"><b>${esc(d.topic)}</b><br>${esc(d.an)} ${d.a.length}莉ｶ / ${esc(d.bn)} ${d.b.length}莉ｶ ﾂｷ ${esc(d.at)} <button class="alt" data-i="${i}">陦ｨ遉ｺ</button></div>`).join(""):'<div class="card">菫晏ｭ倥↑縺・/div>');
    $("tpnc-hist").querySelectorAll("[data-i]").forEach(btn=>btn.onclick=()=>{current=h[Number(btn.dataset.i)];if(!current)return;$("tpnc-topic").value=current.topic;$("tpnc-a").value=current.ac;$("tpnc-b").value=current.bc;$("tpnc-at").textContent=`${current.an} (${current.a.length}莉ｶ)`;$("tpnc-bt").textContent=`${current.bn} (${current.b.length}莉ｶ)`;render("tpnc-ar",current.a);render("tpnc-br",current.b);$("tpnc-copy").disabled=false;$("tpnc-save").disabled=false;$("tpnc-status").textContent="菫晏ｭ俶ｸ医∩縺ｮ豈碑ｼ・ｒ陦ｨ遉ｺ縺励※縺・∪縺吶・;});
  };
})();