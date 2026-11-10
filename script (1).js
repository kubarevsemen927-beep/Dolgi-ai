/* ДОЛГИ AI — логика: без ключей, до 100 попыток достучаться */
const API_URL='https://text.pollinations.ai/';
const MAX_TRIES=100, PAUSE=1200;
const LS='dolgi_ai_chats';

let chats=JSON.parse(localStorage.getItem(LS)||'null')||{};
let cur=Object.keys(chats)[0]||null;
const $=id=>document.getElementById(id);
const store=()=>localStorage.setItem(LS,JSON.stringify(chats));

function newChat(){
  cur='chat_'+Date.now();
  chats[cur]={title:'Новый чат',msgs:[]};
  store(); renderList(); renderMsgs();
}
function renderList(){
  const box=$('chatList'); box.innerHTML='';
  Object.keys(chats).forEach(id=>{
    const d=document.createElement('div');
    d.className='chat-item'+(id===cur?' active':'');
    const t=document.createElement('span'); t.textContent=chats[id].title;
    const x=document.createElement('span'); x.className='del'; x.textContent='✕';
    x.onclick=e=>{e.stopPropagation();delete chats[id];store();
      if(cur===id)cur=Object.keys(chats)[0]||null;
      if(!cur)newChat();else{renderList();renderMsgs();}};
    d.append(t,x);
    d.onclick=()=>{cur=id;store();renderList();renderMsgs();closePanel();};
    box.append(d);
  });
}
function renderMsgs(){
  const box=$('messages'); box.innerHTML='';
  const c=chats[cur]; if(!c)return;
  if(!c.msgs.length){
    const h=document.createElement('div'); h.id='emptyHint';
    h.innerHTML='✦ ДОЛГИ AI ✦<span>Напишите первое сообщение</span>';
    box.append(h); return;
  }
  c.msgs.forEach(m=>addBubble(m.role,m.text));
  box.scrollTop=box.scrollHeight;
}
function addBubble(role,text){
  const box=$('messages');
  const b=document.createElement('div');
  b.className='msg '+(role==='user'?'user':'bot');
  b.textContent=text; box.append(b);
  box.scrollTop=box.scrollHeight;
}

async function ask(text){
  const c=chats[cur];
  c.msgs.push({role:'user',text});
  if(c.title==='Новый чат')c.title=text.slice(0,30);
  store(); renderList();
  addBubble('user',text);
  $('emptyHint')&&$('emptyHint').remove();
  $('typing').hidden=false;
  const prompt=c.msgs.map(m=>(m.role==='user'?'Пользователь: ':'Ассистент: ')+m.text).join('\n')+'\nАссистент:';
  for(let i=1;i<=MAX_TRIES;i++){
    try{
      const r=await fetch(API_URL+encodeURIComponent(prompt));
      if(r.ok){const a=await r.text();if(a&&a.trim()){
        $('typing').hidden=true;
        c.msgs.push({role:'bot',text:a.trim()});store();addBubble('bot',a.trim());return;}}
    }catch(e){}
    await new Promise(r=>setTimeout(r,PAUSE));
  }
  $('typing').hidden=true;
  c.msgs.push({role:'bot',text:'Не смогла достучаться — проверьте интернет и попробуйте ещё раз.'});
  store();renderMsgs();
}

function send(){
  const i=$('input'); const v=i.value.trim();
  if(!v||!cur)return; i.value=''; i.style.height='auto'; ask(v);
}
$('sendBtn').onclick=send;
$('input').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}
});
$('input').addEventListener('input',function(){
  this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px';
  fitViewport();
});

/* ---- Главное: строка ввода не прячется под панелью браузера ---- */
const vv=window.visualViewport;
function fitViewport(){
  let extra=0;
  if(vv){ // когда клавиатура поднимается — поднимаем и низ чата
    extra=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);
  }
  document.documentElement.style.setProperty('--extra-bottom',extra+'px');
  $('chat').style.bottom='calc(env(safe-area-inset-bottom,0px)+'+extra+'px)';
  const box=$('messages');
  if(box.scrollHeight>box.clientHeight+60)box.scrollTop=box.scrollHeight;
}
if(vv){vv.addEventListener('resize',fitViewport);vv.addEventListener('scroll',fitViewport);}
window.addEventListener('resize',fitViewport);
fitViewport();

/* ---- Панель истории ---- */
function openPanel(){document.body.classList.add('panel-open');$('menuBtn').textContent='✕';}
function closePanel(){document.body.classList.remove('panel-open');$('menuBtn').textContent='☰';}
$('menuBtn').onclick=()=>document.body.classList.contains('panel-open')?closePanel():openPanel();
$('overlay').onclick=closePanel;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePanel();});
$('newChatBtn').onclick=()=>{newChat();closePanel();};

/* ---- Сохранение и загрузка чатов файлом ---- */
$('saveBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(chats,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download='dolgi_ai_chats.json';a.click();
};
$('loadBtn').onclick=()=>$('fileInput').click();
$('fileInput').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{try{chats=JSON.parse(rd.result)||{};store();
    cur=Object.keys(chats)[0]||null;if(!cur)newChat();else{renderList();renderMsgs();}
    closePanel();}catch(_){alert('Файл повреждён')}};
  rd.readAsText(f);
};

/* ---- Проверка памяти браузера ---- */
setTimeout(()=>{
  const k='dolgi_test';localStorage.setItem(k,'1');
  if(localStorage.getItem(k)!=='1')$('storageWarn').hidden=false;
  localStorage.removeItem(k);
},500);

if(!cur)newChat();else{renderList();renderMsgs();}
closePanel();
