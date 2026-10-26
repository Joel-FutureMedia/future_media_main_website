const NAV=[
  {href:"/conferences.html",label:"Conferences"},
  {href:"/brands.html",label:"Brands",menu:[["/brands.html","Broadcast"],["/digital.html","Digital"]]},
  {href:"/advertise.html",label:"Advertise",menu:[["/advertise.html","Solutions"],["/advertise.html","Advertise"],["/terms.html","Policy"],["/index.html#offers","Offers"]]},
  {href:"/audience.html",label:"Audience Insights",menu:[["/audience.html","Insights"],["/media-audit.html","Media Audit"]]},
  {href:"/news.html",label:"News"}
];
const file=(location.pathname.split("/").filter(Boolean).pop()||"index").replace(/\.html$/,"");
const page=file+".html";
const brandPages=["brands.html","digital.html"];
const link=(href,label,mark)=>{
  const path=href.split("#")[0].split("/").pop();
  const on=mark&&(path===page||(label==="Brands"&&brandPages.includes(page)));
  return `<a href="${href}" class="${on?"on":""}">${label}</a>`;
};
document.querySelector("#hdr").innerHTML=`<header><a class="logo" href="/index.html"><img src="/assets/logo.png" alt="FutureMedia"></a>
<div class="nav-bar"><nav id="nav">${NAV.map(item=>item.menu?`<div class="drop">${link(item.href,item.label,true)}<div class="menu">${item.menu.map(([h,t])=>link(h,t,item.label==="Brands")).join("")}</div></div>`:link(item.href,item.label,true)).join("")}</nav>
<div class="head-actions"><a class="pill" href="/contact.html">Contact Us</a><a class="search" href="/search.html" aria-label="Search"><img src="/assets/search.svg" alt=""></a></div></div>
<button class="burger" aria-label="Menu" onclick="nav.classList.toggle('open')">☰</button></header>`;
document.querySelectorAll(".drop").forEach(drop=>{
  drop.querySelector(":scope > a").addEventListener("click",e=>{
    if(window.matchMedia("(max-width:900px)").matches){e.preventDefault();drop.classList.toggle("open")}
  });
});
document.querySelector("#ftr").innerHTML=`<footer>
<a class="lg" href="/index.html" aria-label="FutureMedia"><img src="/assets/Broadcast%20Brands/logo-cirlce.png" alt=""></a>
<ul><li><a href="/team.html">Team</a></li><li><a href="/gallery.html">Gallery</a></li><li><a href="/about.html">About Us</a></li></ul>
<ul><li><a href="/vacancies.html">Vacancies</a></li><li><a href="/terms.html">Terms &amp; Conditions</a></li><li><a href="/audience.html" data-company-profile>Company Profile</a></li></ul>
<div class="ct">Unit 44, Hyper Motor City, Maxwell Street, Windhoek<br><a href="tel:+264830001000">+264 83 000 1000</a><br><a href="mailto:sales@futuremedia.com.na">sales@futuremedia.com.na</a>
<form data-subscribe class="sub-form"><input name="fullName" placeholder="Name" required><input name="email" type="email" placeholder="Email" required><button type="submit">Subscribe</button></form>
</div>
</footer>
<button class="wa" id="waOpen" type="button" aria-label="Chat with FutureMedia"><img src="/assets/whatsapp%20(1).png" alt=""></button>
<div class="chat" id="chat" hidden role="dialog" aria-label="FutureMedia chat">
<div class="chat-head"><img src="/assets/whatsapp%20(1).png" alt=""><div><b>FutureMedia</b><small>Usually replies instantly</small></div><button type="button" id="chatClose" aria-label="Close chat">×</button></div>
<div class="chat-log" id="chatLog"></div>
<div class="chat-quick" id="chatQuick"></div>
<form id="chatForm"><input id="chatInput" autocomplete="off" placeholder="Type a message"><button type="submit">Send</button></form>
</div>`;
document.querySelectorAll(".panel[data-offers]").forEach(panel=>{
  const offers=JSON.parse(panel.dataset.offers);
  const rows=panel.querySelector(".rows");
  rows.innerHTML=offers.map(o=>{
    const img=`<img class="${o[4]==="contain"?"contain":"cover"}" src="${o[3]}" alt="" decoding="async" loading="lazy">`;
    return `<a class="offer" href="${o[2]}"><span class="thumb">${img}</span><span><b>${o[0]}</b><small>${o[1]}</small></span></a>`;
  }).join("");
  panel.querySelector(".arrows")?.remove();
});
document.querySelectorAll("[data-bg]").forEach(el=>{
  const io=new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    el.style.backgroundImage=el.dataset.bg;
    io.disconnect();
  },{rootMargin:"700px"});
  io.observe(el);
});
const chat=document.querySelector("#chat");
const chatLog=document.querySelector("#chatLog");
const chatForm=document.querySelector("#chatForm");
const chatInput=document.querySelector("#chatInput");
const chatQuick=document.querySelector("#chatQuick");
const answers={};
let chatStep=0, chatStarted=false;
const chatScript=[
  {id:"name",ask:"Hi, I'm Nia from FutureMedia. What is your name?",placeholder:"Your name"},
  {id:"contact",ask:()=>`Good to meet you, ${answers.name}. What phone number or email should we use?`,placeholder:"Phone or email",valid:v=>/@/.test(v)||/\d{6,}/.test(v),error:"Please share a phone number or an email so the team can reply."},
  {id:"need",ask:"What can we help you with?",choices:["Advertising","A conference","A media audit","A general question"]},
  {id:"detail",ask:"Tell us a little more and I'll pass it to the right person.",placeholder:"Your message"}
];
function chatBubble(text,who){
  const bubble=document.createElement("div");
  bubble.className="bubble "+who;
  bubble.textContent=text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop=chatLog.scrollHeight;
  return bubble;
}
function askChat(){
  const step=chatScript[chatStep];
  if(!step){finishChat();return}
  const typing=chatBubble("…","bot typing");
  setTimeout(()=>{
    typing.remove();
    chatBubble(typeof step.ask==="function"?step.ask():step.ask,"bot");
    chatQuick.innerHTML="";
    if(step.choices){
      chatInput.disabled=true;
      step.choices.forEach(choice=>{
        const button=document.createElement("button");
        button.type="button";
        button.textContent=choice;
        button.addEventListener("click",()=>answerChat(choice));
        chatQuick.appendChild(button);
      });
    }else{
      chatInput.disabled=false;
      chatInput.placeholder=step.placeholder||"Type a message";
      chatInput.focus();
    }
  },620);
}
function answerChat(value){
  const step=chatScript[chatStep];
  value=(value||"").trim();
  if(!value||!step) return;
  chatBubble(value,"me");
  if(step.valid&&!step.valid(value)){
    chatBubble(step.error,"bot");
    return;
  }
  answers[step.id]=value;
  chatInput.value="";
  chatQuick.innerHTML="";
  if(step.id==="need"&&value.toLowerCase()==="a media audit"){
    chatInput.disabled=true;
    const typing=chatBubble("…","bot typing");
    setTimeout(()=>{
      typing.remove();
      chatBubble("Great — the media audit is a short 7-step form. Open it here and we’ll recommend the right mix.","bot");
      const link=document.createElement("a");
      link.className="bubble bot link";
      link.href="/media-audit.html";
      link.textContent="Start the media audit";
      chatLog.appendChild(link);
      chatLog.scrollTop=chatLog.scrollHeight;
    },620);
    return;
  }
  chatStep++;
  askChat();
}
function finishChat(){
  chatInput.disabled=true;
  chatQuick.innerHTML="";
  const typing=chatBubble("…","bot typing");
  const summary=`Hello FutureMedia, my name is ${answers.name}. Contact: ${answers.contact}. I need help with: ${answers.need}. ${answers.detail}`;
  setTimeout(()=>{
    typing.remove();
    chatBubble(`Thanks ${answers.name}. I've got that. A producer will follow up, or you can send this chat on WhatsApp now.`,"bot");
    const link=document.createElement("a");
    link.className="bubble bot link";
    link.href="https://wa.me/264830001000?text="+encodeURIComponent(summary);
    link.target="_blank";
    link.rel="noopener";
    link.textContent="Send this chat on WhatsApp";
    chatLog.appendChild(link);
    chatLog.scrollTop=chatLog.scrollHeight;
  },620);
}
document.querySelector("#waOpen").addEventListener("click",()=>{
  chat.hidden=!chat.hidden;
  if(!chat.hidden&&!chatStarted){chatStarted=true;askChat()}
  if(!chat.hidden&&!chatInput.disabled) chatInput.focus();
});
document.querySelector("#chatClose").addEventListener("click",()=>{chat.hidden=true});
if(!matchMedia("(prefers-reduced-motion: reduce)").matches){
  const revealNodes=[...document.querySelectorAll(".team h1, .member, .about-story, .about-stats, .belief, main.sub > *, .wrap .card, .hero .panel, .upc h2, .upc .e, .quotes article")];
  const reveal=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const el=entry.target;
      el.style.transitionDelay=(revealNodes.indexOf(el)%4)*70+"ms";
      el.classList.add("reveal-in");
      reveal.unobserve(el);
    });
  },{rootMargin:"0px 0px -6% 0px",threshold:.14});
  revealNodes.forEach(el=>reveal.observe(el));
}
chatForm.addEventListener("submit",event=>{
  event.preventDefault();
  if(!chatInput.disabled) answerChat(chatInput.value);
});
