const NAV=[
  {href:"advertise.html",label:"Advertise",menu:[["advertise.html","Solutions"],["advertise.html","Advertise"],["terms.html","Policy"],["index.html#offers","Offers"]]},
  {href:"brands.html",label:"Our Brands"},
  {href:"conferences.html",label:"Conferences"},
  {href:"audience.html",label:"Audience Insights"},
  {href:"contact.html",label:"Media Audit"},
  {href:"news.html",label:"News"}
];
const page=location.pathname.split("/").pop()||"index.html";
const link=(href,label,mark)=>`<a href="${href}" class="${mark&&href.split("#")[0]==page?"on":""}">${label}</a>`;
document.querySelector("#hdr").innerHTML=`<header><a class="logo" href="index.html"><img src="assets/logo.png" alt="FutureMedia"></a>
<div class="nav-bar"><nav id="nav">${NAV.map(item=>item.menu?`<div class="drop">${link(item.href,item.label,true)}<div class="menu">${item.menu.map(([h,t])=>link(h,t,false)).join("")}</div></div>`:link(item.href,item.label,true)).join("")}</nav>
<div class="head-actions"><a class="pill" href="contact.html">Contact Us</a><a class="search" href="search.html" aria-label="Search"><img src="assets/search.svg" alt=""></a></div></div>
<button class="burger" aria-label="Menu" onclick="nav.classList.toggle('open')">☰</button></header>`;
document.querySelectorAll(".drop").forEach(drop=>{
  drop.querySelector(":scope > a").addEventListener("click",e=>{
    if(window.matchMedia("(max-width:900px)").matches){e.preventDefault();drop.classList.toggle("open")}
  });
});
document.querySelector("#ftr").innerHTML=`<footer><div class="lg">FUTUREMEDIA</div>
<ul><li><a href="about.html">About</a></li><li><a href="team.html">Team</a></li><li><a href="gallery.html">Gallery</a></li></ul>
<ul><li><a href="vacancies.html">Vacancies</a></li><li><a href="terms.html">Terms &amp; Conditions</a></li><li><a href="about.html">Company Profile</a></li></ul>
<div class="ct">Unit 44, Hyper Motor City, Maxwell Street, Windhoek<br><a href="tel:+264830001000">+264 83 000 1000</a><br><a href="mailto:sales@futuremedia.com.na">sales@futuremedia.com.na</a></div></footer>
<a class="wa" href="https://wa.me/264830001000" target="_blank" rel="noopener"><img src="assets/whatsapp%20(1).png" alt="WhatsApp"></a>`;
const panel=document.querySelector("#offers");
if(panel){const O=JSON.parse(panel.dataset.offers);let i=0;const draw=()=>{panel.querySelector(".rows").innerHTML=[0,1,2].map(k=>{const o=O[(i+k)%O.length];return`<a class="offer ${k==1?"hot":""}" href="${o[2]}"><img src="assets/offer-icon.svg" alt="" onerror="this.remove()"><span><b>${o[0]}</b><small>${o[1]}</small></span></a>`}).join("")};
panel.querySelector(".prev").onclick=()=>{i=(i+O.length-1)%O.length;draw()};panel.querySelector(".next").onclick=()=>{i=(i+1)%O.length;draw()};draw();setInterval(()=>{i=(i+1)%O.length;draw()},6000)}
