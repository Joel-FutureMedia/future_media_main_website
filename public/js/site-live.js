(function () {
  if (!window.FM) return;
  const $ = (sel, root = document) => root.querySelector(sel);

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function note(id, message, ok) {
    const node = $(id);
    if (!node) return;
    node.hidden = false;
    node.className = "note " + (ok ? "ok" : "bad");
    node.textContent = message;
  }

  function pop(html, cardClass = "pop-card") {
    document.querySelector(".pop")?.remove();
    const wrap = document.createElement("div");
    wrap.className = "pop";
    wrap.innerHTML = `<div class="${cardClass}">${html}</div>`;
    wrap.addEventListener("click", e => { if (e.target === wrap || e.target.dataset.close != null) wrap.remove(); });
    document.body.appendChild(wrap);
    return wrap;
  }

  function closingLabel(date) {
    if (!date) return "Open until filled";
    const parsed = new Date(String(date).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(parsed.getTime())) return "Closing Date: " + date;
    return "Closing Date: " + parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }

  function formatJobCopy(text) {
    const lines = String(text || "").replace(/\r/g, "").split("\n");
    let html = "";
    let list = [];
    const flush = () => {
      if (!list.length) return;
      html += "<ul>" + list.map(item => `<li>${item}</li>`).join("") + "</ul>";
      list = [];
    };
    const heading = /^(what you.?ll be doing|what we.?re looking for|bonus points if|what.?s in it for you)\b/i;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) { flush(); continue; }
      const bullet = line.replace(/^[-•–]\s+/, "");
      if (bullet !== line) { list.push(escape(bullet)); continue; }
      flush();
      if (heading.test(line) || (line.endsWith(":") && line.length < 48)) {
        html += `<h3>${escape(line.replace(/:$/, ""))}</h3>`;
      } else {
        html += `<p>${escape(line)}</p>`;
      }
    }
    flush();
    return html || `<p>${escape(text)}</p>`;
  }

  async function fillSelect(select, path, label = "name") {
    if (!select) return;
    const res = await FM.request(path);
    select.innerHTML = `<option value="">Select</option>` + (res.data || []).map(item =>
      `<option value="${item.id}">${escape(item[label])}</option>`
    ).join("");
  }

  function vacancyImage(job) {
    if (!job || job.mediaType !== "IMAGE" || !job.mediaPath) return "";
    return `<img src="${escape(FM.fileUrl(job.mediaPath))}" alt="${escape(job.title || "")}" onerror="this.remove()">`;
  }

  async function vacancies() {
    const grid = $("#jobGrid");
    if (!grid) return;
    try {
      const res = await FM.request("/api/vacancies/public");
      const items = res.data || [];
      if (!items.length) { grid.innerHTML = "<p>No live vacancies right now.</p>"; return; }
      grid.innerHTML = items.map(job => `
        <article class="job-card" data-id="${job.id}">
          ${vacancyImage(job)}
          <div class="job-copy">
            <h3>${escape(job.title)}</h3>
            <small>${closingLabel(job.closingDate)}</small>
          </div>
        </article>`).join("");
      grid.onclick = async e => {
        const card = e.target.closest(".job-card");
        if (!card) return;
        const job = (await FM.request("/api/vacancies/public/" + card.dataset.id)).data;
        const modal = pop(`
          ${vacancyImage(job)}
          <div class="job-detail-title">${escape(job.title)}</div>
          <div class="job-detail-body">${formatJobCopy(job.description)}</div>
          <button class="btn" id="applyBtn" type="button">Apply</button>
        `, "pop-card job-detail");
        modal.querySelector("#applyBtn").onclick = () => applyForm(job);
      };
    } catch (error) {
      grid.innerHTML = `<p>${escape(error.message)}</p>`;
    }
  }

  function applyForm(job) {
    const modal = pop(`
      <h2>Apply for ${escape(job.title)}</h2>
      <form id="applyForm">
        <label>Name<input name="name" required></label>
        <label>Surname<input name="surname" required></label>
        <label>Date of birth<input name="dateOfBirth" type="date" required></label>
        <label>Highest qualification<input name="highestQualification" required></label>
        <label>Work experience<textarea name="workExperience" rows="4" required></textarea></label>
        <label>Namibian?
          <select name="namibian" required>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>
        <label>CV (PDF or Word)<input name="cv" type="file" accept=".pdf,.doc,.docx" required></label>
        <p class="note" id="applyNote" hidden></p>
        <div class="pop-actions"><button class="btn ghost" data-close type="button">Cancel</button><button class="btn" type="submit">Submit application</button></div>
      </form>
    `, "pop-card job-apply");
    modal.querySelector("#applyForm").onsubmit = async ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      fd.append("vacancyId", job.id);
      try {
        await FM.request("/api/applications/apply", { method: "POST", form: true, body: fd });
        note("#applyNote", "Application sent. We’ll be in touch.", true);
        ev.target.querySelector("[type=submit]").disabled = true;
      } catch (error) {
        note("#applyNote", error.message, false);
      }
    };
  }

  async function contact() {
    const form = $("#contactForm");
    if (!form) return;
    await Promise.all([
      fillSelect(form.brandId, "/api/brands/public"),
      fillSelect(form.salesId, "/api/sales/public"),
      fillSelect(form.serviceId, "/api/services/public")
    ]);
    form.onsubmit = async ev => {
      ev.preventDefault();
      try {
        const body = Object.fromEntries(new FormData(form).entries());
        await FM.request("/api/contact", { method: "POST", body });
        note("#contactNote", "Thanks — the sales team will follow up.", true);
        form.reset();
      } catch (error) {
        note("#contactNote", error.message, false);
      }
    };
  }

  async function news() {
    const grid = $("#newsGrid");
    if (!grid) return;
    try {
      const res = await FM.request("/api/news/public");
      const items = res.data || [];
      if (!items.length) { grid.innerHTML = "<p>No published stories yet.</p>"; return; }
      grid.innerHTML = items.map(item => `
        <article class="news-card" data-id="${item.id}">
          ${item.mediaType === "VIDEO"
            ? `<video src="${escape(FM.fileUrl(item.mediaPath))}" muted></video>`
            : `<img src="${escape(FM.fileUrl(item.mediaPath))}" alt="">`}
          <div class="body"><h3>${escape(item.title)}</h3><small>Read story</small></div>
        </article>`).join("");
      grid.onclick = async e => {
        const card = e.target.closest(".news-card");
        if (!card) return;
        const item = (await FM.request("/api/news/public/" + card.dataset.id)).data;
        pop(`
          ${item.mediaType === "VIDEO" ? `<video src="${escape(FM.fileUrl(item.mediaPath))}" controls style="width:100%"></video>` : `<img src="${escape(FM.fileUrl(item.mediaPath))}" alt="">`}
          <h2>${escape(item.title)}</h2>
          <div class="pop-copy">${escape(item.description)}</div>
          <div class="pop-actions"><button class="btn ghost" data-close type="button">Close</button></div>
        `);
      };
    } catch (error) {
      grid.innerHTML = `<p>${escape(error.message)}</p>`;
    }
  }

  async function events() {
    const grid = $("#eventGrid");
    if (!grid) return;
    try {
      const res = await FM.request("/api/events/public");
      const items = res.data || [];
      if (!items.length) { grid.innerHTML = "<p>No upcoming events listed.</p>"; return; }
      grid.innerHTML = items.map(item => `
        <article class="news-card" data-id="${item.id}">
          ${item.mediaType === "VIDEO"
            ? `<video src="${escape(FM.fileUrl(item.mediaPath))}" muted></video>`
            : `<img src="${escape(FM.fileUrl(item.mediaPath))}" alt="">`}
          <div class="body"><h3>${escape(item.title)}</h3><small>View event</small></div>
        </article>`).join("");
      grid.onclick = async e => {
        const card = e.target.closest(".news-card");
        if (!card) return;
        const item = (await FM.request("/api/events/public/" + card.dataset.id)).data;
        pop(`
          ${item.mediaType === "VIDEO" ? `<video src="${escape(FM.fileUrl(item.mediaPath))}" controls style="width:100%"></video>` : `<img src="${escape(FM.fileUrl(item.mediaPath))}" alt="">`}
          <h2>${escape(item.title)}</h2>
          <div class="pop-copy">${escape(item.description)}</div>
          <div class="pop-actions"><button class="btn ghost" data-close type="button">Close</button></div>
        `);
      };
    } catch (error) {
      grid.innerHTML = `<p>${escape(error.message)}</p>`;
    }
  }

  async function gallery() {
    const grid = $("#galleryGrid");
    if (!grid) return;
    try {
      const res = await FM.request("/api/gallery/public");
      const items = res.data || [];
      if (!items.length) { grid.innerHTML = "<p>Gallery is being updated.</p>"; return; }
      grid.innerHTML = items.map(item => `<img src="${escape(FM.fileUrl(item.imagePath))}" alt="${escape(item.title || "")}" data-id="${item.id}">`).join("");
      grid.onclick = async e => {
        if (e.target.tagName !== "IMG") return;
        const item = (await FM.request("/api/gallery/public/" + e.target.dataset.id)).data;
        pop(`<img src="${escape(FM.fileUrl(item.imagePath))}" alt=""><h2>${escape(item.title || "Gallery")}</h2><div class="pop-actions"><button class="btn ghost" data-close type="button">Close</button></div>`);
      };
    } catch (error) {
      grid.innerHTML = `<p>${escape(error.message)}</p>`;
    }
  }

  async function shopbeat() {
    const form = $("#shopbeatForm");
    if (!form) return;
    await fillSelect(form.feelingId, "/api/shopbeat/feelings/public");
    form.onsubmit = async ev => {
      ev.preventDefault();
      try {
        const body = Object.fromEntries(new FormData(form).entries());
        await FM.request("/api/shopbeat/demo", { method: "POST", body });
        note("#shopbeatNote", "Demo request sent.", true);
        form.reset();
      } catch (error) {
        note("#shopbeatNote", error.message, false);
      }
    };
  }

  async function freelancers() {
    const grid = $("#freelanceGrid");
    if (!grid) return;
    try {
      const res = await FM.request("/api/freelancers/public");
      const items = res.data || [];
      if (!items.length) { grid.innerHTML = "<p>No freelance roles are open right now.</p>"; return; }
      grid.innerHTML = items.map(role => `
        <article class="job-card" data-id="${role.id}">
          <div class="job-copy">
            <h3>${escape(role.title)}</h3>
            <small>${closingLabel(role.closingDate)}</small>
          </div>
        </article>`).join("");
      grid.onclick = async e => {
        const card = e.target.closest(".job-card");
        if (!card) return;
        const role = (await FM.request("/api/freelancers/public/" + card.dataset.id)).data;
        const modal = pop(`
          <div class="job-detail-title">${escape(role.title)}</div>
          <div class="job-detail-body">${formatJobCopy(role.description)}</div>
          <button class="btn" id="applyBtn" type="button">Apply</button>
        `, "pop-card job-detail");
        modal.querySelector("#applyBtn").onclick = () => freelancerForm(role);
      };
    } catch (error) {
      grid.innerHTML = `<p>${escape(error.message)}</p>`;
    }
  }

  function freelancerForm(role) {
    const modal = pop(`
      <h2>Join as ${escape(role.title)}</h2>
      <form id="freelanceForm">
        <label>Name<input name="name" required></label>
        <label>Surname<input name="surname" required></label>
        <label>Email<input name="email" type="email" required></label>
        <label>Telephone<input name="telephone" required></label>
        <label>Where you are based<input name="location"></label>
        <label>Skill or craft<input name="skill" required></label>
        <label>Experience<textarea name="experience" rows="4" required></textarea></label>
        <label>Namibian?
          <select name="namibian" required>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>
        <label>CV (PDF or Word)<input name="cv" type="file" accept=".pdf,.doc,.docx" required></label>
        <p class="note" id="freelanceNote" hidden></p>
        <div class="pop-actions"><button class="btn ghost" data-close type="button">Cancel</button><button class="btn" type="submit">Submit application</button></div>
      </form>
    `, "pop-card job-apply");
    modal.querySelector("#freelanceForm").onsubmit = async ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      fd.append("roleId", role.id);
      try {
        await FM.request("/api/freelancer-applications/apply", { method: "POST", form: true, body: fd });
        note("#freelanceNote", "Application sent. We’ll be in touch.", true);
        ev.target.querySelector("[type=submit]").disabled = true;
      } catch (error) {
        note("#freelanceNote", error.message, false);
      }
    };
  }

  async function companyProfile(event) {
    event.preventDefault();
    try {
      const res = await FM.request("/api/gated-documents/public");
      const items = res.data || [];
      if (!items.length) {
        pop(`<h2>Company Profile</h2><p>The company profile is not available for download yet.</p><div class="pop-actions"><button class="btn ghost" data-close type="button">Close</button></div>`);
        return;
      }
      const list = items.map(doc => `<button class="btn ghost" type="button" data-doc="${doc.id}">${escape(doc.title)}</button>`).join("");
      const modal = pop(`
        <h2>Company Profile</h2>
        <p>Tell us where to send it and we’ll email the document to you.</p>
        <div class="pop-actions" id="docChoices">${list}</div>
      `);
      modal.querySelector("#docChoices").onclick = async ev => {
        const choice = ev.target.closest("[data-doc]");
        if (!choice) return;
        const doc = (await FM.request("/api/gated-documents/public/" + choice.dataset.doc)).data;
        const form = pop(`
          <h2>${escape(doc.title)}</h2>
          <p>${escape(doc.description || "We’ll email this document to you.")}</p>
          <form id="docForm">
            <label>Name<input name="name" required></label>
            <label>Email<input name="email" type="email" required></label>
            <label>Telephone<input name="telephone" required></label>
            <label>Company<input name="company" required></label>
            <p class="note" id="docNote" hidden></p>
            <div class="pop-actions"><button class="btn ghost" data-close type="button">Cancel</button><button class="btn" type="submit">Send me the document</button></div>
          </form>
        `);
        form.querySelector("#docForm").onsubmit = async ev2 => {
          ev2.preventDefault();
          try {
            await FM.request("/api/gated-documents/" + doc.id + "/request", { method: "POST", body: Object.fromEntries(new FormData(ev2.target).entries()) });
            note("#docNote", "Sent to your inbox.", true);
            ev2.target.querySelector("[type=submit]").disabled = true;
          } catch (error) {
            note("#docNote", error.message, false);
          }
        };
      };
    } catch (error) {
      pop(`<h2>Company Profile</h2><p>${escape(error.message)}</p><div class="pop-actions"><button class="btn ghost" data-close type="button">Close</button></div>`);
    }
  }

  async function documents() {
    const grid = $("#docGrid");
    if (!grid) return;
    try {
      const res = await FM.request("/api/gated-documents/public");
      const items = res.data || [];
      if (!items.length) { grid.innerHTML = "<p>No documents available yet.</p>"; return; }
      grid.innerHTML = items.map(doc => `
        <article class="doc-card" data-id="${doc.id}">
          <div class="body"><h3>${escape(doc.title)}</h3><p>${escape(doc.description || "Request this briefing and we’ll email it to you.")}</p></div>
        </article>`).join("");
      grid.onclick = async e => {
        const card = e.target.closest(".doc-card");
        if (!card) return;
        const doc = (await FM.request("/api/gated-documents/public/" + card.dataset.id)).data;
        const modal = pop(`
          <h2>${escape(doc.title)}</h2>
          <p>${escape(doc.description || "")}</p>
          <form id="docForm">
            <label>Name<input name="name" required></label>
            <label>Email<input name="email" type="email" required></label>
            <label>Telephone<input name="telephone" required></label>
            <label>Company<input name="company" required></label>
            <p class="note" id="docNote" hidden></p>
            <div class="pop-actions"><button class="btn ghost" data-close type="button">Cancel</button><button class="btn" type="submit">Send me the document</button></div>
          </form>
        `);
        modal.querySelector("#docForm").onsubmit = async ev => {
          ev.preventDefault();
          try {
            await FM.request("/api/gated-documents/" + doc.id + "/request", { method: "POST", body: Object.fromEntries(new FormData(ev.target).entries()) });
            note("#docNote", "Sent to your inbox.", true);
          } catch (error) {
            note("#docNote", error.message, false);
          }
        };
      };
    } catch (error) {
      grid.innerHTML = `<p>${escape(error.message)}</p>`;
    }
  }

  async function homeBanner() {
    if (!document.body.classList.contains("home")) return;
    let banner = null;
    try { banner = (await FM.request("/api/banners/public/latest")).data; } catch {}
    if (!banner) {
      try {
        const list = (await FM.request("/api/banners/public")).data || [];
        banner = list.find(item => item.active !== false) || list[0];
      } catch {}
    }
    if (!banner) return;
    const bar = document.createElement("a");
    bar.className = "promo-banner";
    bar.href = "/news.html";
    bar.innerHTML = `${banner.imagePath ? `<img src="${escape(FM.fileUrl(banner.imagePath))}" alt="">` : "<span></span>"}<div><b>${escape(banner.title)}</b><span>${escape(banner.description || "")}</span></div><em>See more</em>`;
    document.querySelector(".landing")?.after(bar);
  }

  async function homeNews() {
    const wrap = document.querySelector(".cards");
    if (!wrap || !document.body.classList.contains("home")) return;
    try {
      const res = await FM.request("/api/news/public");
      const items = (res.data || []).slice(0, 3);
      if (!items.length) return;
      wrap.innerHTML = items.map(item => `
        <a class="card" href="/news.html" style="background-image:url('${escape(FM.fileUrl(item.mediaPath))}')">
          <span class="tag">News</span>
          <h3>${escape(item.title)}</h3>
          <p>${escape((item.description || "").slice(0, 140))}</p>
        </a>`).join("");
    } catch {}
  }

  async function subscribe(form) {
    form.onsubmit = async ev => {
      ev.preventDefault();
      const body = Object.fromEntries(new FormData(form).entries());
      body.language = body.language || "ENGLISH";
      try {
        await FM.request("/api/subscriptions", { method: "POST", body });
        form.querySelector("button").textContent = "Subscribed";
        form.reset();
      } catch (error) {
        alert(error.message);
      }
    };
  }

  vacancies();
  freelancers();
  contact();
  news();
  events();
  gallery();
  shopbeat();
  documents();
  homeBanner();
  homeNews();
  document.querySelectorAll("[data-subscribe]").forEach(subscribe);
  document.querySelectorAll("[data-company-profile]").forEach(link => {
    link.addEventListener("click", companyProfile);
  });
})();
