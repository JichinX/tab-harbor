/**
 * Tab Harbor - New Tab Page (v2 Glassmorphism)
 */
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
function msg(action,extra={}){return new Promise(r=>{chrome.runtime.sendMessage({action,...extra},resp=>{if(chrome.runtime.lastError){console.error(chrome.runtime.lastError.message);r({success:false});return}r(resp||{success:false})})})}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function domain(u){try{return new URL(u).hostname.replace(/^www\./,'')}catch{return 'unknown'}}
const DEFAULT_FAVICON_API='https://toolb.cn/favicon/{domain}';
let faviconApiUrl=DEFAULT_FAVICON_API;
function favicon(u){if(!faviconApiUrl)return'';try{return faviconApiUrl.replace('{domain}',new URL(u).hostname)}catch{return ''}}
function fixUrl(u){if(!u)return '';return /^https?:\/\//i.test(u)?u:'https://'+u}
function isValidDomain(u){return /^https?:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+([\/?#].*)?$/i.test(u)}
async function cacheIcon(url){if(!url||!url.startsWith('http'))return url;try{const r=await fetch(url);if(!r.ok)return url;const b=await r.blob();return await new Promise(res=>{const fr=new FileReader();fr.onloadend=()=>res(fr.result);fr.onerror=()=>res(url);fr.readAsDataURL(b)})}catch{return url}}
async function migrateIcons(){const sc=getShortcuts();let changed=false;for(const s of sc){if(s.type==='folder'){for(const c of(s.children||[])){if(c.imgUrl&&c.imgUrl.startsWith('http')){const d=await cacheIcon(c.imgUrl);if(d!==c.imgUrl){c.imgUrl=d;changed=true}}}}else if(s.imgUrl&&s.imgUrl.startsWith('http')){const d=await cacheIcon(s.imgUrl);if(d!==s.imgUrl){s.imgUrl=d;changed=true}}}if(changed){D.shortcuts=sc;await msg('updateShortcutOrder',{shortcuts:sc});renderShortcuts()}}
function showToast(m,dur=2000){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),dur)}
const COLORS=['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#8b5cf6','#06b6d4','#f97316','#000','#fff','transparent'];
const FOLDER_SVG='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
const FOLDER_SVG_SM='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';

// State
let D=null,curTab='sc',folderIdx=-1,dragSrc=null;
let addIMode='auto',addIVal='',selColor=COLORS[0],fasIMode='auto',fasIVal='',fasColor=COLORS[0];
let editIMode='auto',editIVal='',editColor=COLORS[0],editIdx=-1;
let addIconOk=null,fasIconOk=null,editIconOk=null; // null=pending, true=ok, false=failed
let addCachedImg=null,editCachedImg=null,fasCachedImg=null; // base64 cached favicon data URL
let engineUrl='https://www.google.com/search?q=',curTheme='system',themeTimer=null;
let curPeriod='week',curFreqLabel='次/周'; // high-frequency period toggle

// Migrate old shortcuts
function migrate(s){if(s.type==='folder')return s;if(s.color&&s.icon!==undefined)return s;const d=domain(s.url);return{name:s.name,url:s.url,color:'#6366f1',icon:s.name?s.name[0].toUpperCase():d[0].toUpperCase(),imgUrl:favicon(s.url)}}
function getShortcuts(){return(D.shortcuts||[]).map(s=>s.color&&s.icon!==undefined?s:migrate(s))}

// ── Clock ──
const DAYS=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
function updateClock(){const n=new Date();$('#cT').innerHTML=`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}<span class="clock-s">${String(n.getSeconds()).padStart(2,'0')}</span>`;$('#cD').textContent=`${n.getFullYear()}年${n.getMonth()+1}月${n.getDate()}日 ${DAYS[n.getDay()]}`}
updateClock();setInterval(updateClock,1000);

// ── Daily Trivia ──
const WHYS=[
{q:'为什么天空是蓝色的？',a:'太阳光由七种颜色组成。当光线进入大气层时，蓝色光波长较短，被空气分子散射得最多，这就是"瑞利散射"。'},
{q:'为什么猫咪会发出呼噜声？',a:'喉部肌肉快速收缩放松（每秒20-30次），通常表示满足。紧张或受伤时也会，有助骨骼组织自我修复。'},
{q:'为什么冰会浮在水面上？',a:'水结冰时形成六角晶格结构，体积膨胀约9%，密度变小。这对地球生态至关重要。'},
{q:'为什么我们能看到月亮的不同形状？',a:'月球只反射太阳光，绕地球公转时被照亮角度变化形成月相，周期约29.5天。'},
{q:'为什么键盘字母不是ABC排列？',a:'早期打字机按键太快会卡住，QWERTY将常用字母分散来减少卡键。'},
{q:'为什么火烈鸟是粉红色的？',a:'它们吃的小虾藻类含β-胡萝卜素，体内累积后羽毛变粉。'},
{q:'为什么我们会做梦？',a:'主流理论认为是大脑处理巩固记忆的过程，一晚经历4-6个梦境。'},
];
const BRAINS=[
{q:'什么东西越洗越脏？',a:'水'},{q:'什么路最窄？',a:'冤家路窄'},{q:'什么天气越热爬得越高？',a:'温度计'},
{q:'什么门永远关不上？',a:'球门'},{q:'什么鸡没有翅膀？',a:'田鸡'},{q:'什么你有别人也有但别人用得多？',a:'你的名字'},
{q:'牛面向北右转三圈左转两圈尾巴朝哪？',a:'朝下'},
];
!function(){const n=new Date(),s=new Date(n.getFullYear(),0,0),doy=Math.floor((n-s)/864e5),isW=doy%2===0,list=isW?WHYS:BRAINS,item=list[doy%list.length],tag=$('#dailyTag');
tag.className='daily-tag '+(isW?'daily-tag--why':'daily-tag--brain');
tag.innerHTML=isW?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> 每日一个为什么':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> 每日一个脑筋急转弯';
$('#dailyQ').textContent=item.q;$('#dailyAText').textContent=item.a;
const q=$('#dailyQ'),a=$('#dailyA'),h=$('#dailyHint');
function rev(){const o=a.classList.toggle('show');h.classList.toggle('hide',o);q.setAttribute('aria-expanded',o)}
q.addEventListener('click',rev);q.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();rev()}})}();

// ── Theme ──
function sunTimes(){const n=new Date(),s=new Date(n.getFullYear(),0,1),doy=Math.floor((n-s)/864e5)+1,tz=-n.getTimezoneOffset()/60,lat=tz*8*Math.PI/180,dec=23.45*Math.sin(2*Math.PI/365*(doy-81))*Math.PI/180,cosHA=-Math.tan(lat)*Math.tan(dec),ha=Math.acos(Math.max(-1,Math.min(1,cosHA)))*180/Math.PI,noon=12-tz*0.02;return{rise:Math.round((noon-ha/15)*60),set:Math.round((noon+ha/15)*60)}}
function effTheme(m){if(m==='dark'||m==='light')return m;if(m==='system')return matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(m==='auto'){const mins=new Date().getHours()*60+new Date().getMinutes(),{rise,set}=sunTimes();return(mins>=set||mins<rise)?'dark':'light'}return'dark'}
function applyTheme(mode){const t=effTheme(mode);document.documentElement.setAttribute('data-theme',t);['icoL','icoD','icoS','icoA'].forEach(id=>{$('#'+id).style.display='none'});({dark:'icoD',light:'icoL',system:'icoS',auto:'icoA'})[mode]&&($('#'+({dark:'icoD',light:'icoL',system:'icoS',auto:'icoA'})[mode]).style.display='')}
function setThemeMode(m){curTheme=m;applyTheme(m);if(themeTimer)clearInterval(themeTimer);if(m==='auto')themeTimer=setInterval(()=>{document.documentElement.setAttribute('data-theme',effTheme('auto'))},60000)}
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(curTheme==='system')document.documentElement.setAttribute('data-theme',effTheme('system'))});
$('#themeBtn').addEventListener('click',async()=>{const i=['dark','light','system','auto'].indexOf(curTheme),n=['dark','light','system','auto'][(i+1)%4],labels={dark:'深色模式',light:'浅色模式',system:'跟随系统',auto:'日出日落自动'};setThemeMode(n);await msg('updateSettings',{settings:{theme:n}});showToast(`主题：${labels[n]}`)});
(async()=>{const r=await msg('loadData');if(r.success&&r.data?.settings?.theme)setThemeMode(r.data.settings.theme);else setThemeMode('system')})();

// ── Search Engine ──
const eBtn=$('#eBtn'),eD=$('#eD');
eBtn.addEventListener('click',e=>{e.stopPropagation();const on=eD.classList.toggle('on');eBtn.setAttribute('aria-expanded',on)});
document.addEventListener('click',()=>{eD.classList.remove('on');eBtn.setAttribute('aria-expanded','false')});
eD.addEventListener('click',e=>e.stopPropagation());
eD.querySelectorAll('.eo').forEach(b=>{b.addEventListener('click',()=>{eD.querySelectorAll('.eo').forEach(x=>x.classList.remove('sel'));b.classList.add('sel');engineUrl=b.dataset.u;$('#eL').textContent=b.dataset.l;eD.classList.remove('on');const name=b.querySelector('.el').nextSibling?b.querySelector('.el').nextSibling.textContent.trim():b.textContent.trim();const ek=Object.entries({'https://www.google.com/search?q=':'google','https://www.bing.com/search?q=':'bing','https://www.baidu.com/s?wd=':'baidu','https://duckduckgo.com/?q=':'ddg'}).find(([k])=>k===b.dataset.u);if(ek)msg('updateSettings',{settings:{searchEngine:ek[1]}});showToast('已切换到 '+name)})});
$('#sI').addEventListener('keydown',e=>{if(e.key==='Enter'){const v=e.target.value.trim();if(!v)return;if(/^https?:\/\//i.test(v)||/^[a-z0-9-]+\.[a-z]{2,}/i.test(v))window.open(v.startsWith('http')?v:'https://'+v,'_blank');else window.open(engineUrl+encodeURIComponent(v),'_blank')}});
(async()=>{const r=await msg('loadData');if(r.success&&r.data?.settings?.searchEngine){const k=r.data.settings.searchEngine,urls={google:'https://www.google.com/search?q=',bing:'https://www.bing.com/search?q=',baidu:'https://www.baidu.com/s?wd=',ddg:'https://duckduckgo.com/?q='};if(urls[k]){engineUrl=urls[k];const mb=eD.querySelector(`.eo[data-u="${urls[k]}"]`);if(mb){eD.querySelectorAll('.eo').forEach(x=>x.classList.remove('sel'));mb.classList.add('sel');$('#eL').textContent=mb.dataset.l}}}})();

// ── Modal ──
function openModal(id){$('#'+id).classList.add('on')}
function closeModal(id){$('#'+id).classList.remove('on')}
$$('.modal-mask').forEach(m=>{m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)})});
$$('[data-close]').forEach(b=>{b.addEventListener('click',()=>closeModal(b.dataset.close))});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$$('.modal-mask.on').forEach(m=>closeModal(m.id))});

// ── Shortcuts ──
function buildIcon(s){const t=s.color==='transparent';if(s.imgUrl)return`<div class="sci has-img" style="background-image:url(${s.imgUrl});${t?'':`background-color:${s.color}`}">${esc(s.icon||'')}</div>`;return t?`<div class="sci sci-t">${esc(s.icon||'A')}</div>`:`<div class="sci" style="background:${s.color}">${esc(s.icon||'A')}</div>`}
function renderShortcuts(){const g=$('#sG'),sc=getShortcuts();let h=sc.map((s,i)=>s.type==='folder'?`<div class="sc" data-i="${i}"><div class="sci" style="background:var(--bg3);color:var(--tx2)">${FOLDER_SVG}</div><span class="scn">${esc(s.name)}</span></div>`:`<div class="sc" data-i="${i}">${buildIcon(s)}<span class="scn">${esc(s.name)}</span></div>`).join('');h+='<div class="sc sc-add" id="scAdd"><div class="sci">+</div><span class="scn">添加</span></div>';g.innerHTML=h;g.querySelectorAll('.sc:not(.sc-add)').forEach(el=>{el.addEventListener('click',()=>{const s=sc[+el.dataset.i];if(!s)return;if(s.type==='folder'){openFolderModal(+el.dataset.i);return}if(s.url)window.open(s.url,'_blank')})});$('#scAdd').addEventListener('click',openAddModal)}

// ── Color Picker ──
function renderCP(cid,ctx){const c=ctx==='add'?selColor:ctx==='fas'?fasColor:editColor,el=$('#'+cid);el.innerHTML=COLORS.map(cl=>{const ext=cl==='#fff'?' co--white':cl==='transparent'?' co--transparent':'';return`<div class="co${cl===c?' sel':''}${ext}" style="background:${cl}" data-c="${cl}"></div>`}).join('');el.querySelectorAll('.co').forEach(b=>{b.addEventListener('click',()=>{if(ctx==='add'){selColor=b.dataset.c;renderCP(cid,ctx);updateIP(addIMode,addIVal,selColor,$('#addName').value.trim(),$('#addUrl').value.trim(),'iconPreview')}else if(ctx==='fas'){fasColor=b.dataset.c;renderCP(cid,ctx);updateIP(fasIMode,fasIVal,fasColor,$('#fasName').value.trim(),$('#fasUrl').value.trim(),'fasIconPreview')}else{editColor=b.dataset.c;renderCP(cid,ctx);updateIP(editIMode,editIVal,editColor,$('#editName').value.trim(),$('#editUrl').value.trim(),'editIconPreview')}})})}

// ── Icon Preview with load detection ──
let _iconLoadTimer=null;
const _statusMap={iconPreview:'addIconUrlStatus',fasIconPreview:'fasIconUrlStatus',editIconPreview:'editIconUrlStatus'};
const _okMap={iconPreview:()=>addIconOk,fasIconPreview:()=>fasIconOk,editIconPreview:()=>editIconOk};
const _okSetMap={iconPreview:v=>{addIconOk=v},fasIconPreview:v=>{fasIconOk=v},editIconPreview:v=>{editIconOk=v}};
function updateIP(mode,val,color,name,url,boxId,onFail){
  const box=$('#'+boxId);
  const statusId=_statusMap[boxId];
  const statusEl=statusId?$('#'+statusId):null;
  box.style.backgroundColor=color;
  box.style.backgroundImage='';
  box.innerHTML='';
  box.className='icon-preview-box';
  if(statusEl){statusEl.textContent='';statusEl.className='icon-url-status'}
  _okSetMap[boxId]?.(null);
  if(_iconLoadTimer){clearTimeout(_iconLoadTimer);_iconLoadTimer=null}
  if(mode==='custom'&&val){
    box.innerHTML=esc(val);
    _okSetMap[boxId]?.(true);
    return;
  }
  const fullUrl=fixUrl(url);
  // URL 校验：必须有合法域名才尝试获取图标
  if(!fullUrl||!isValidDomain(fullUrl)){
    box.innerHTML=name?name[0].toUpperCase():'A';
    if(statusEl&&url){statusEl.textContent='网址格式不正确';statusEl.className='icon-url-status icon-url-status--fail'}
    else if(statusEl){statusEl.textContent='请输入网址后自动获取';statusEl.className='icon-url-status icon-url-status--pending'}
    _okSetMap[boxId]?.(false);
    return;
  }
  const img=favicon(fullUrl);
  if(!img){
    box.innerHTML=name?name[0].toUpperCase():'A';
    if(statusEl){statusEl.textContent='请输入网址后自动获取';statusEl.className='icon-url-status icon-url-status--pending'}
    _okSetMap[boxId]?.(false);
    return;
  }
  // Show favicon URL status + spinner while loading
  if(statusEl){statusEl.textContent=img;statusEl.className='icon-url-status icon-url-status--pending'}
  const testImg=new Image();
  box.innerHTML='<div class="icon-spinner"></div>';
  testImg.onload=()=>{
    if(_iconLoadTimer)clearTimeout(_iconLoadTimer);
    _iconLoadTimer=null;
    box.style.backgroundImage=`url(${img})`;
    box.innerHTML='';
    box.className='icon-preview-box has-img';
    if(statusEl)statusEl.className='icon-url-status icon-url-status--ok';
    _okSetMap[boxId]?.(true);
    // Hide refetch button after successful load (edit modal only)
    const refBtn=$('#editRefetchBtn');if(refBtn)refBtn.style.display='none';
    // Cache image as base64 for persistent storage
    cacheIcon(img).then(d=>{if(boxId==='iconPreview')addCachedImg=d;else if(boxId==='fasIconPreview')fasCachedImg=d;else if(boxId==='editIconPreview')editCachedImg=d});
  };
  testImg.onerror=()=>{
    if(_iconLoadTimer)clearTimeout(_iconLoadTimer);
    _iconLoadTimer=null;
    box.innerHTML=name?name[0].toUpperCase():'A';
    box.className='icon-preview-box';
    if(statusEl){statusEl.textContent='图标获取失败，请使用自定义图标';statusEl.className='icon-url-status icon-url-status--fail'}
    _okSetMap[boxId]?.(false);
    if(typeof onFail==='function')onFail();
  };
  // Timeout: if no response in 3s, fallback
  _iconLoadTimer=setTimeout(()=>{
    if(!box.classList.contains('has-img')&&box.querySelector('.icon-spinner')){
      box.innerHTML=name?name[0].toUpperCase():'A';
      box.className='icon-preview-box';
      if(statusEl){statusEl.textContent='图标获取超时，请使用自定义图标';statusEl.className='icon-url-status icon-url-status--fail'}
      _okSetMap[boxId]?.(false);
      if(typeof onFail==='function')onFail();
    }
  },3000);
  testImg.src=img;
}
function openAddModal(){closeModal('mgModal');$('#addName').value='';$('#addUrl').value='';addIMode='auto';addIVal='';addCachedImg=null;$('#customIconFg').style.display='none';$('#addIcon').value='';selColor=COLORS[0];renderCP('addColors','add');updateIP('auto','',selColor,'','','iconPreview');setTimeout(()=>{openModal('addModal');$('#addName').focus()},200)}
$('#fetchIconBtn').addEventListener('click',()=>{addIMode='auto';addIVal='';$('#customIconFg').style.display='none';updateIP(addIMode,addIVal,selColor,$('#addName').value.trim(),$('#addUrl').value.trim(),'iconPreview')});
$('#customIconBtn').addEventListener('click',()=>{addIMode='custom';$('#customIconFg').style.display='block';$('#addIcon').focus()});
$('#addIcon').addEventListener('input',e=>{addIVal=e.target.value;updateIP(addIMode,addIVal,selColor,$('#addName').value.trim(),$('#addUrl').value.trim(),'iconPreview')});
$('#addName').addEventListener('input',()=>updateIP(addIMode,addIVal,selColor,$('#addName').value.trim(),$('#addUrl').value.trim(),'iconPreview'));
$('#addUrl').addEventListener('input',()=>{const url=$('#addUrl').value.trim();if(addIMode==='auto'&&url){addIVal='';$('#customIconFg').style.display='none'}updateIP(addIMode,addIVal,selColor,$('#addName').value.trim(),url,'iconPreview')});
$('#addConfirm').addEventListener('click',async()=>{const name=$('#addName').value.trim(),url=fixUrl($('#addUrl').value.trim());if(!name){showToast('请输入网站名称');return}if(!url){showToast('请输入网址');return}const imgIco=(addIMode==='auto'&&addIconOk===true)?(addCachedImg||favicon(url)):'';const r=await msg('addShortcut',{shortcut:{name,url,color:selColor,icon:(addIMode==='custom'&&addIVal)?addIVal:name[0].toUpperCase(),imgUrl:imgIco}});if(!r.success){showToast(r.message||'添加失败');return}closeModal('addModal');showToast('已添加 '+name);await refreshUI()});
$('#addUrl').addEventListener('keydown',e=>{if(e.key==='Enter')$('#addConfirm').click()});
$('#addName').addEventListener('keydown',e=>{if(e.key==='Enter')$('#addUrl').focus()});

// ── Management Panel ──
function renderMgSC(){const p=$('#panelSc'),sc=getShortcuts();if(!sc.length){p.innerHTML='<div class="mg-empty">暂无快捷导航，点击上方添加</div>';return}
p.innerHTML='<div style="font-size:.6875rem;color:var(--tx3);margin-bottom:.5rem">提示：拖拽可调整顺序，拖到文件夹上可移入</div>'+sc.map((s,i)=>{const isF=s.type==='folder';const t=!isF&&s.color==='transparent';const ico=isF?`<div class="mg-icon" style="background:var(--bg3);color:var(--tx2)">${FOLDER_SVG_SM}</div>`:(s.imgUrl?`<div class="mg-icon has-img" style="background-image:url(${s.imgUrl});${t?'':`background-color:${s.color}`}"></div>`:(t?`<div class="mg-icon mg-icon-t">${esc(s.icon)}</div>`:`<div class="mg-icon" style="background:${s.color}">${esc(s.icon)}</div>`));const url=isF?`文件夹 · ${(s.children||[]).length} 个网站`:s.url;return `<div class="mg-item" data-i="${i}">${ico}<div class="mg-info"><div class="mg-name">${esc(s.name)}</div><div class="mg-url">${esc(url)}</div></div>${isF?'':`<button class="mg-del" style="color:var(--accent);background:var(--accent-l)" data-act="es" title="编辑">✎</button>`}<button class="mg-del" data-act="ds">✕</button></div>`}).join('');
initDrag();
p.querySelectorAll('[data-act="ds"]').forEach(b=>b.addEventListener('click',async()=>{const item=b.closest('.mg-item');item.classList.add('removing');await new Promise(r=>setTimeout(r,400));await msg('removeShortcut',{index:+item.dataset.i});showToast('已删除');await refreshUI();renderMgSC()}));
p.querySelectorAll('[data-act="es"]').forEach(b=>b.addEventListener('click',()=>openEditModal(+b.closest('.mg-item').dataset.i)));
p.querySelectorAll('[data-act="ef"]').forEach(b=>b.addEventListener('click',()=>openFolderModal(+b.closest('.mg-item').dataset.i)))}
function renderMgFR(){const p=$('#panelFr'),sites=D.frequentSites||[];if(!sites.length){p.innerHTML='<div class="mg-empty">暂无高频使用记录</div>';return}const fl=curFreqLabel||'次/周';p.innerHTML=sites.map((s,i)=>`<div class="mg-item" data-i="${i}"><div class="mg-icon" style="background:${s.color}">${esc(s.letter)}</div><div class="mg-info"><div class="mg-name">${esc(s.title)}</div><div class="mg-url">${esc(s.url)} · ${s.freq} ${fl}</div></div><button class="mg-del" data-act="df">✕</button></div>`).join('');p.querySelectorAll('[data-act="df"]').forEach(b=>b.addEventListener('click',async()=>{const item=b.closest('.mg-item');item.classList.add('removing');await new Promise(r=>setTimeout(r,400));await msg('removeFrequentSite',{index:+item.dataset.i});showToast('已删除');await refreshUI();renderMgFR();renderRecent()}))}
function switchTab(t){curTab=t;$$('.tabs .tab').forEach(x=>x.classList.toggle('on',x.dataset.tab===t));$$('.mg-panel').forEach(x=>x.classList.toggle('on',x.id===(t==='sc'?'panelSc':'panelFr')));$('#mgAddBtn').style.display=t==='sc'?'inline-flex':'none';$('#mgAddFolderBtn').style.display=t==='sc'?'inline-flex':'none'}
$$('.tabs .tab').forEach(t=>t.addEventListener('click',()=>switchTab(t.dataset.tab)));
$('#mgScBtn').addEventListener('click',()=>{switchTab('sc');renderMgSC();renderMgFR();openModal('mgModal')});
$('#clearRecent').addEventListener('click',()=>{switchTab('fr');renderMgSC();renderMgFR();openModal('mgModal')});
$('#mgAddBtn').addEventListener('click',openAddModal);
$('#mgAddFolderBtn').addEventListener('click',()=>{$('#cfName').value='';setTimeout(()=>{openModal('createFolderModal');$('#cfName').focus()},200)});
$('#cfConfirm').addEventListener('click',async()=>{const n=$('#cfName').value.trim();if(!n){showToast('请输入文件夹名称');return}await msg('addFolder',{folder:{name:n,type:'folder',color:'#6366f1',children:[]}});closeModal('createFolderModal');showToast(`已创建文件夹 "${n}"`);await refreshUI();renderMgSC()});
$('#cfName').addEventListener('keydown',e=>{if(e.key==='Enter')$('#cfConfirm').click()});

// ── Edit Shortcut Modal ──
function openEditModal(idx){const sc=getShortcuts();const s=sc[idx];if(!s||s.type==='folder')return;editIdx=idx;$('#editName').value=s.name;$('#editUrl').value=s.url;editColor=s.color||COLORS[0];editIMode=s.imgUrl?'auto':'custom';editIVal=s.imgUrl?'':(s.icon||'');editCachedImg=(s.imgUrl&&!s.imgUrl.startsWith('http'))?s.imgUrl:null;$('#editCustomFg').style.display=editIMode==='custom'?'block':'none';$('#editIcon').value=editIVal;renderCP('editColors','edit');const box=$('#editIconPreview'),refBtn=$('#editRefetchBtn'),statusEl=$('#editIconUrlStatus');const t=editColor==='transparent';box.style.backgroundColor=t?'':editColor;box.style.backgroundImage='';box.innerHTML='';box.className='icon-preview-box';statusEl.textContent='';statusEl.className='icon-url-status';editIconOk=null;if(s.imgUrl){box.style.backgroundImage=`url(${s.imgUrl})`;box.className='icon-preview-box has-img';box.style.backgroundColor=t?'':editColor;refBtn.style.display='flex';statusEl.textContent='已保存的图标';statusEl.className='icon-url-status icon-url-status--ok'}else{box.innerHTML=esc(s.icon||'A');if(t)box.className='icon-preview-box icon-preview-t';refBtn.style.display='none'}setTimeout(()=>{openModal('editModal');$('#editName').focus()},200)}
$('#editFetchBtn').addEventListener('click',()=>{editIMode='auto';editIVal='';$('#editCustomFg').style.display='none';$('#editRefetchBtn').style.display='none';updateIP(editIMode,editIVal,editColor,$('#editName').value.trim(),$('#editUrl').value.trim(),'editIconPreview')});
$('#editRefetchBtn').addEventListener('click',()=>{editIMode='auto';editIVal='';$('#editCustomFg').style.display='none';$('#editRefetchBtn').style.display='none';updateIP('auto','',editColor,$('#editName').value.trim(),$('#editUrl').value.trim(),'editIconPreview')});
$('#editCustomBtn').addEventListener('click',()=>{editIMode='custom';$('#editCustomFg').style.display='block';$('#editIcon').focus();$('#editRefetchBtn').style.display='none'});
$('#editIcon').addEventListener('input',e=>{editIVal=e.target.value;updateIP(editIMode,editIVal,editColor,$('#editName').value.trim(),$('#editUrl').value.trim(),'editIconPreview')});
$('#editName').addEventListener('input',()=>updateIP(editIMode,editIVal,editColor,$('#editName').value.trim(),$('#editUrl').value.trim(),'editIconPreview'));
$('#editUrl').addEventListener('input',()=>{const url=$('#editUrl').value.trim();if(editIMode==='auto'&&url){editIVal='';$('#editCustomFg').style.display='none'}updateIP(editIMode,editIVal,editColor,$('#editName').value.trim(),url,'editIconPreview')});
$('#editConfirm').addEventListener('click',async()=>{const name=$('#editName').value.trim(),url=fixUrl($('#editUrl').value.trim());if(!name){showToast('请输入网站名称');return}if(!url){showToast('请输入网址');return}const sc=getShortcuts();const icon=(editIMode==='custom'&&editIVal)?editIVal:name[0].toUpperCase();let imgIco;if(editIMode==='custom'){imgIco=''}else if(editIconOk===true){imgIco=editCachedImg||favicon(url)}else{imgIco=sc[editIdx].imgUrl||''}sc[editIdx]={...sc[editIdx],name,url,color:editColor,icon,imgUrl:imgIco};await msg('updateShortcutOrder',{shortcuts:sc});closeModal('editModal');showToast('已更新');await refreshUI();renderMgSC()});
$('#editUrl').addEventListener('keydown',e=>{if(e.key==='Enter')$('#editConfirm').click()});
$('#editName').addEventListener('keydown',e=>{if(e.key==='Enter')$('#editUrl').focus()});

// Drag sort with insert line + folder drop
let dragLine=null;
function initDrag(){
  const panel=$('#panelSc');
  if(!panel)return;
  // Remove old drag line
  const oldLine=panel.querySelector('.drag-line');
  if(oldLine)oldLine.remove();
  // Create drag line indicator
  dragLine=document.createElement('div');
  dragLine.className='drag-line';
  panel.style.position='relative';
  panel.appendChild(dragLine);

  $$('#panelSc .mg-item').forEach(el=>{
    el.draggable=true;
    el.addEventListener('dragstart',e=>{
      dragSrc=+el.dataset.i;
      el.style.opacity='.4';
      e.dataTransfer.effectAllowed='move';
      e.dataTransfer.setData('text/plain',el.dataset.i);
      // Mark source type
      const sc=getShortcuts();
      const srcItem=sc[dragSrc];
      el.dataset.dragType=srcItem?.type==='folder'?'folder':'item';
    });
    el.addEventListener('dragend',()=>{
      el.style.opacity='';
      el.dataset.dragType='';
      dragLine.classList.remove('show');
      $$('#panelSc .mg-item').forEach(x=>{x.classList.remove('drag-over','drag-folder-target');x.style.borderStyle=''});
    });
    el.addEventListener('dragover',e=>{
      e.preventDefault();
      const rect=el.getBoundingClientRect();
      const y=e.clientY-rect.top;
      const h=rect.height;
      const sc=getShortcuts();
      const tgt=sc[+el.dataset.i];
      const isFolder=tgt?.type==='folder';
      const srcType=el.dataset.dragType||'item';
      // Cannot drag folder into folder
      if(isFolder&&srcType==='folder'){
        e.dataTransfer.dropEffect='none';
        dragLine.classList.remove('show');
        $$('#panelSc .mg-item').forEach(x=>x.classList.remove('drag-folder-target'));
        el.style.borderStyle='';
        return;
      }
      if(isFolder&&srcType==='item'){
        // Dropping item into folder
        e.dataTransfer.dropEffect='move';
        dragLine.classList.remove('show');
        $$('#panelSc .mg-item').forEach(x=>{x.classList.remove('drag-folder-target');x.style.borderStyle=''});
        el.classList.add('drag-folder-target');
        el.style.borderStyle='';
        return;
      }
      // Non-folder: show insert line (above or below)
      el.classList.remove('drag-folder-target');
      el.style.borderStyle='';
      const above=y<h/2;
      dragLine.classList.add('show');
      const panelRect=panel.getBoundingClientRect();
      const lineTop=rect.top-panelRect.top+(above?0:h);
      dragLine.style.top=lineTop+'px';
    });
    el.addEventListener('dragleave',e=>{
      el.classList.remove('drag-folder-target');
      el.style.borderStyle='';
      // Only hide line if leaving the panel area
      const rect=el.getBoundingClientRect();
      const x=e.clientX,y=e.clientY;
      if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom){
        dragLine.classList.remove('show');
      }
    });
    el.addEventListener('drop',async e=>{
      e.preventDefault();
      e.stopPropagation();
      dragLine.classList.remove('show');
      el.classList.remove('drag-folder-target');
      el.style.borderStyle='';
      const from=dragSrc;
      if(from===null||from===undefined)return;
      const to=+el.dataset.i;
      const sc=getShortcuts();
      const srcItem=sc[from];
      const tgtItem=sc[to];
      const srcType=srcItem?.type==='folder'?'folder':'item';
      // Drag item into folder
      if(tgtItem?.type==='folder'&&srcType==='item'){
        const child={...srcItem};
        if(!sc[to].children)sc[to].children=[];
        sc[to].children.push(child);
        sc.splice(from,1);
        await msg('updateShortcutOrder',{shortcuts:sc});
        D.shortcuts=sc;
        renderMgSC();renderShortcuts();
        showToast(`已将 "${srcItem.name}" 移入 "${tgtItem.name}"`);
        return;
      }
      // Reorder
      const rect=el.getBoundingClientRect();
      const y=e.clientY-rect.top;
      const above=y<rect.height/2;
      const arr=[...sc];
      const[mv]=arr.splice(from,1);
      let insertAt=to;
      if(from<to)insertAt=above?to-1:to;
      else insertAt=above?to:to+1;
      insertAt=Math.max(0,Math.min(insertAt,arr.length));
      arr.splice(insertAt,0,mv);
      D.shortcuts=arr;
      await msg('updateShortcutOrder',{shortcuts:arr});
      renderMgSC();renderShortcuts();
      showToast('排序已更新');
    });
  });
}

// ── Folder Modal ──
function openFolderModal(idx){folderIdx=idx;const f=(D.shortcuts||[])[idx];if(!f||f.type!=='folder')return;$('#folderTitle').textContent=f.name;renderFolderContent();openModal('folderModal')}
function renderFolderContent(){const body=$('#folderBody'),f=(D.shortcuts||[])[folderIdx];if(!f||!(f.children||[]).length){body.innerHTML='<div class="folder-empty">文件夹为空，点击下方添加网站</div>';return}
body.innerHTML=f.children.map((s,i)=>{const t=s.color==='transparent';const ico=s.imgUrl?`<div class="mg-icon has-img" style="background-image:url(${s.imgUrl});${t?'':`background-color:${s.color}`}"></div>`:(t?`<div class="mg-icon mg-icon-t">${esc(s.icon)}</div>`:`<div class="mg-icon" style="background:${s.color}">${esc(s.icon)}</div>`);return `<div class="folder-item" data-ci="${i}">${ico}<div class="mg-info"><div class="mg-name">${esc(s.name)}</div><div class="mg-url">${esc(s.url)}</div></div><button class="mg-del" data-act="dc">✕</button></div>`}).join('');
body.querySelectorAll('.folder-item').forEach(el=>{el.addEventListener('click',e=>{if(e.target.closest('.mg-del'))return;const ci=+el.dataset.ci,child=D.shortcuts[folderIdx]?.children?.[ci];if(child?.url)window.open(child.url,'_blank')})});
body.querySelectorAll('[data-act="dc"]').forEach(b=>b.addEventListener('click',async()=>{const item=b.closest('.folder-item');item.classList.add('removing');await new Promise(r=>setTimeout(r,400));await msg('removeSiteFromFolder',{folderIndex:folderIdx,siteIndex:+item.dataset.ci});showToast('已删除');await refreshUI();renderFolderContent();renderMgSC()}))}

// Folder add site
function updateFIP(){updateIP(fasIMode,fasIVal,fasColor,$('#fasName').value.trim(),$('#fasUrl').value.trim(),'fasIconPreview')}
$('#folderAddBtn').addEventListener('click',()=>{$('#fasName').value='';$('#fasUrl').value='';fasIMode='auto';fasIVal='';fasCachedImg=null;$('#fasCustomFg').style.display='none';$('#fasIcon').value='';fasColor=COLORS[0];renderCP('fasColors','fas');updateFIP();setTimeout(()=>{openModal('folderAddSiteModal');$('#fasName').focus()},200)});
$('#fasFetchBtn').addEventListener('click',()=>{fasIMode='auto';fasIVal='';$('#fasCustomFg').style.display='none';updateFIP()});
$('#fasCustomBtn').addEventListener('click',()=>{fasIMode='custom';$('#fasCustomFg').style.display='block';$('#fasIcon').focus()});
$('#fasIcon').addEventListener('input',e=>{fasIVal=e.target.value;updateFIP()});
$('#fasName').addEventListener('input',updateFIP);
$('#fasUrl').addEventListener('input',()=>{const url=$('#fasUrl').value.trim();if(fasIMode==='auto'&&url){fasIVal='';$('#fasCustomFg').style.display='none'}updateFIP()});
$('#fasConfirm').addEventListener('click',async()=>{const name=$('#fasName').value.trim(),url=fixUrl($('#fasUrl').value.trim());if(!name){showToast('请输入网站名称');return}if(!url){showToast('请输入网址');return}const imgIco=(fasIMode==='auto'&&fasIconOk===true)?(fasCachedImg||favicon(url)):'';await msg('addSiteToFolder',{folderIndex:folderIdx,site:{name,url,color:fasColor,icon:(fasIMode==='custom'&&fasIVal)?fasIVal:name[0].toUpperCase(),imgUrl:imgIco}});closeModal('folderAddSiteModal');showToast('已添加到文件夹');await refreshUI();renderFolderContent();renderMgSC()});
$('#fasUrl').addEventListener('keydown',e=>{if(e.key==='Enter')$('#fasConfirm').click()});

// ── Frequent Sites ──
function renderRecent(filter=''){const g=$('#rG'),kw=(filter||'').toLowerCase(),all=D.frequentSites||[],sites=all.map((s,i)=>({...s,_i:i})).filter(s=>!kw||s.title.toLowerCase().includes(kw)||s.url.toLowerCase().includes(kw));
if(!sites.length){g.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--tx3);font-size:.875rem">${kw?'没有找到匹配的站点':'暂无高频使用记录'}</div>`;return}
const fl=curFreqLabel||'次/周';
g.innerHTML=sites.map(s=>`<a class="rc" href="https://${esc(s.url)}" target="_blank" rel="noopener"><div class="rcf" style="background:${s.color}">${esc(s.letter)}</div><div class="rci"><div class="rct">${esc(s.title)}</div><div class="rcu">${esc(s.url)}</div></div><span class="rcfm">${s.freq} ${fl}</span><button class="rx" data-oi="${s._i}" data-act="rf" title="删除">✕</button></a>`).join('');
g.querySelectorAll('[data-act="rf"]').forEach(b=>b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();const card=b.closest('.rc');card.classList.add('removing');await new Promise(r=>setTimeout(r,400));await msg('removeFrequentSite',{index:+b.dataset.oi});showToast('已删除');await refreshUI();renderRecent($('#frSearchInput')?.value.trim()||'')}))}

$('#frSearchIcon').addEventListener('click',()=>{$('#frInlineSearch').classList.add('on');$('#frSearchInput').focus()});
$('#frSearchClear').addEventListener('click',()=>{$('#frInlineSearch').classList.remove('on');$('#frSearchInput').value='';renderRecent()});
$('#frSearchInput').addEventListener('input',e=>renderRecent(e.target.value.trim()));
$('#frSearchInput').addEventListener('keydown',e=>{if(e.key==='Escape')$('#frSearchClear').click();if(e.key==='Enter')e.preventDefault()});
$('#frSearchInput').addEventListener('blur',()=>{if(!$('#frSearchInput').value.trim()){$('#frInlineSearch').classList.remove('on');$('#frSearchInput').value='';renderRecent()}});

// ── Period Toggle (周/月/年) ──
const _freqLabelMap={week:'次/周',month:'次/月',year:'次/年'};
$$('.fr-period-btn').forEach(b=>b.addEventListener('click',async()=>{
  const p=b.dataset.period;if(p===curPeriod)return;
  curPeriod=p;curFreqLabel=_freqLabelMap[p]||'次/周';
  $$('.fr-period-btn').forEach(x=>x.classList.toggle('on',x.dataset.period===p));
  showToast(`统计周期：${b.textContent}`);
  // Re-fetch with new period
  const topN=D?.settings?.frequentTopN||30;
  const fr=await msg('refreshFrequentSites',{period:curPeriod,maxTop:topN});
  if(fr.success){D.frequentSites=fr.sites||[];if(fr.freqLabel)curFreqLabel=fr.freqLabel}
  renderRecent($('#frSearchInput')?.value.trim()||'');
  renderMgFR();
}));

// ── Keyboard Shortcuts ──
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();$('#sI').focus()}});

// ── Refresh UI ──
let _freqRefreshed=false;
async function refreshUI(){const r=await msg('loadData');if(r.success&&r.data){D=r.data;if(D.settings?.faviconApi)faviconApiUrl=D.settings.faviconApi;if(D.settings?.frequentPeriod)curPeriod=D.settings.frequentPeriod;curFreqLabel=_freqLabelMap[curPeriod]||'次/周'}if(!D)return;if(!D.shortcuts)D.shortcuts=[];if(!D.frequentSites)D.frequentSites=[];renderShortcuts();if(!_freqRefreshed){_freqRefreshed=true;const topN=D?.settings?.frequentTopN||30;const fr=await msg('refreshFrequentSites',{period:curPeriod,maxTop:topN});if(fr.success){D.frequentSites=fr.sites||[];if(fr.freqLabel)curFreqLabel=fr.freqLabel;if(fr.period)curPeriod=fr.period}}renderRecent()}

// ── Settings ──
$('#settingsBtn').addEventListener('click',async()=>{const r=await msg('loadData');if(r.success&&r.data?.settings){if(r.data.settings.faviconApi)$('#faviconApi').value=r.data.settings.faviconApi;else $('#faviconApi').value=DEFAULT_FAVICON_API;if(r.data.settings.frequentTopN)$('#frequentTopN').value=r.data.settings.frequentTopN}else{$('#faviconApi').value=DEFAULT_FAVICON_API}setTimeout(()=>openModal('settingsModal'),200)});
$$('#settingsModal .preset-api').forEach(b=>b.addEventListener('click',()=>{$('#faviconApi').value=b.dataset.url}));
$('#saveSettings').addEventListener('click',async()=>{const url=$('#faviconApi').value.trim();if(!url){showToast('请输入图标获取地址');return}if(!url.includes('{domain}')){showToast('地址需包含 {domain} 占位符');return}const topN=parseInt($('#frequentTopN').value,10);const settings={faviconApi:url};if(topN>=5&&topN<=100)settings.frequentTopN=topN;faviconApiUrl=url;await msg('updateSettings',{settings});closeModal('settingsModal');showToast('设置已保存')});

// ── Init ──
(async()=>{await refreshUI();migrateIcons();renderCP('addColors','add');renderCP('fasColors','fas')})();
