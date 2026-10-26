(() => {
  const sl = document.querySelector(".slides");
  const dots = document.querySelector(".dots");
  const title = document.querySelector("#ctitle");
  const desc = document.querySelector("#cdesc");
  const hero = document.querySelector(".confhero");
  if (!sl || !dots || !title || !desc || typeof CONFS === "undefined") return;
  const pics = [...sl.querySelectorAll("img")].map((img) => img.getAttribute("src"));
  let i = 0;
  let timer;
  let token = 0;
  CONFS.forEach((_, k) => {
    const button = document.createElement("button");
    button.setAttribute("aria-label", "Slide " + (k + 1));
    button.onclick = () => {
      go(k);
      reset();
    };
    dots.append(button);
  });
  function go(n) {
    i = (n + CONFS.length) % CONFS.length;
    sl.style.transform = `translateX(-${i * 100}%)`;
    [...dots.children].forEach((dot, k) => dot.classList.toggle("on", k === i));
    if (hero && pics[i]) hero.style.backgroundImage = `url("${pics[i]}")`;
    const current = ++token;
    title.classList.add("fade");
    desc.classList.add("fade");
    setTimeout(() => {
      if (current !== token) return;
      title.textContent = CONFS[i][0];
      desc.textContent = CONFS[i][1];
      title.classList.remove("fade");
      desc.classList.remove("fade");
    }, 250);
  }
  const reset = () => {
    clearInterval(timer);
    timer = setInterval(() => go(i + 1), 5500);
  };
  go(0);
  reset();
})();
