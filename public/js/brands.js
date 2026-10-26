const svgText = fetch("/assets/namibia.svg").then(r => r.text());

svgText.then(svg => {
  document.querySelectorAll(".nam-map").forEach(el => {
    el.innerHTML = svg.replace(/<\?xml[\s\S]*?\?>/, "");
    const root = el.querySelector("svg");
    if (root && !root.getAttribute("viewBox")) {
      root.setAttribute("viewBox", `0 0 ${root.getAttribute("width")} ${root.getAttribute("height")}`);
    }
    const on = new Set((el.dataset.regions || "").split(",").map(s => s.trim()));
    el.querySelectorAll("path").forEach(path => {
      const name = path.getAttribute("title") || "";
      if (name && !path.querySelector("title")) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
        t.textContent = name;
        path.appendChild(t);
      }
      if (on.has(path.id)) path.classList.add("on");
    });
  });
});

document.querySelectorAll(".gender").forEach(el => {
  const f = Number(el.dataset.f);
  const m = Number(el.dataset.m);
  const R = 36;
  const ring = 2 * Math.PI * R;
  el.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true">
    <circle class="ring" cx="60" cy="60" r="${R}"></circle>
    <circle class="arc" cx="60" cy="60" r="${R}" stroke-dasharray="${ring}" stroke-dashoffset="${ring}"></circle>
  </svg>
  <div class="glegend"><span>${f}% Female</span><span>${m}% Male</span></div>`;
  el.dataset.off = String(ring * (1 - f / 100));
});

function runCount(el) {
  if (el.dataset.ran) return;
  el.dataset.ran = "1";
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  const start = performance.now();
  const step = now => {
    const p = Math.min(1, (now - start) / 1100);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const deck = document.querySelector(".branddeck");
const slides = [...document.querySelectorAll(".brandstage .slide")];
const links = [...document.querySelectorAll(".rail a")];
let index = 0;
let lock = false;

function show(slide) {
  slide.classList.add("in");
  slide.querySelectorAll(".count").forEach(runCount);
  slide.querySelectorAll(".gender .arc").forEach(arc => {
    arc.style.strokeDashoffset = arc.closest(".gender").dataset.off;
  });
  links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + slide.id));
}

function go(next, fromScroll) {
  next = Math.max(0, Math.min(slides.length - 1, next));
  if (next === index) return;
  const dir = next > index ? "down" : "up";
  const prev = slides[index];
  prev.classList.remove("on", "dir-down", "dir-up");
  prev.classList.add("out");
  index = next;
  const slide = slides[index];
  slide.classList.remove("out");
  slide.classList.add("on", dir === "down" ? "dir-down" : "dir-up");
  show(slide);
  setTimeout(() => prev.classList.remove("out"), 40);
  if (!fromScroll && deck) {
    const span = deck.offsetHeight - window.innerHeight;
    const y = deck.offsetTop + (slides.length === 1 ? 0 : (index / (slides.length - 1)) * span);
    lock = true;
    window.scrollTo({ top: y, behavior: "smooth" });
    const release = () => { lock = false; };
    window.addEventListener("scrollend", release, { once: true });
    setTimeout(release, 900);
  }
}

if (deck && slides.length) {
  const start = slides.findIndex(slide => slide.id === location.hash.replace("#", ""));
  show(slides[0]);
  if (start > 0) go(start, true);
  window.addEventListener("scroll", () => {
    if (lock) return;
    const span = deck.offsetHeight - window.innerHeight;
    if (span <= 0) return;
    const p = Math.min(1, Math.max(0, (window.scrollY - deck.offsetTop) / span));
    go(Math.round(p * (slides.length - 1)), true);
  }, { passive: true });
  window.addEventListener("wheel", event => {
    if (event.target.closest(".rows, .panel")) return;
    const box = deck.getBoundingClientRect();
    const inside = box.top <= 2 && box.bottom >= window.innerHeight - 2;
    if (!inside || Math.abs(event.deltaY) < 12) return;
    const next = index + (event.deltaY > 0 ? 1 : -1);
    if (next < 0 || next > slides.length - 1) return;
    event.preventDefault();
    if (lock) return;
    go(next, false);
  }, { passive: false });
  let touchY = 0;
  window.addEventListener("touchstart", event => { touchY = event.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", event => {
    const box = deck.getBoundingClientRect();
    if (box.top > 2 || box.bottom < window.innerHeight - 2) return;
    const delta = touchY - event.changedTouches[0].clientY;
    if (Math.abs(delta) < 40) return;
    const next = index + (delta > 0 ? 1 : -1);
    if (next < 0 || next > slides.length - 1) return;
    go(next, false);
  }, { passive: true });
  links.forEach(link => {
    link.addEventListener("click", event => {
      const id = link.getAttribute("href").slice(1);
      const next = slides.findIndex(slide => slide.id === id);
      if (next < 0) return;
      event.preventDefault();
      go(next, false);
    });
  });
}
