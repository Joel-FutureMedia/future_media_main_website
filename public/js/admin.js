(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  function buttonFrom(event) {
    const node = event.target && event.target.closest
      ? event.target.closest("button, a, [data-close], [data-create], [data-edit], [data-del], [data-view], [data-act], [data-filter], [data-cv], [data-fcv], [data-file], [data-reqs], [data-img]")
      : null;
    return node || event.target;
  }
  const view = $("#view");
  const tokenKey = "fm_admin_token";
  const userKey = "fm_admin_user";
  const NAV = [
    { group: "Home", items: [{ id: "overview", label: "Overview" }] },
    { group: "Inbox", items: [
      { id: "leads", label: "Leads" },
      { id: "contacts", label: "Contact Us" },
      { id: "audits", label: "Media Audits" },
      { id: "shopbeat", label: "Shopbeat" },
      { id: "subscribers", label: "Newsletter" },
      { id: "downloads", label: "Gated downloads" },
      { id: "applications", label: "Job applications" },
      { id: "freelancer-applications", label: "Freelancer applications" }
    ]},
    { group: "Content", items: [
      { id: "news", label: "News" },
      { id: "events", label: "Events" },
      { id: "gallery", label: "Gallery" },
      { id: "vacancies", label: "Vacancies" },
      { id: "freelancers", label: "Freelancer roles" },
      { id: "banners", label: "Banners" },
      { id: "documents", label: "Documents" }
    ]},
    { group: "Email", items: [
      { id: "templates", label: "Templates" },
      { id: "campaigns", label: "Campaigns" }
    ]},
    { group: "Catalog", items: [
      { id: "brands", label: "Brands" },
      { id: "sales", label: "Sales options" },
      { id: "services", label: "Services" },
      { id: "sources", label: "Lead sources" },
      { id: "feelings", label: "Shopbeat feelings" }
    ]},
    { group: "Admin", items: [{ id: "users", label: "Users", super: true }] }
  ];

  const state = { user: null, token: localStorage.getItem(tokenKey) };

  function toast(message, bad) {
    const node = document.createElement("div");
    node.className = "toast" + (bad ? " bad" : "");
    node.textContent = message;
    $("#toasts").appendChild(node);
    setTimeout(() => node.remove(), 3200);
  }

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function fmt(value) {
    if (!value) return "—";
    const text = String(value).replace("T", " ");
    return text.length > 19 ? text.slice(0, 16) : text;
  }

  function pill(label, tone = "navy") {
    return `<span class="pill ${tone}">${escape(label)}</span>`;
  }

  function user() {
    try { return JSON.parse(localStorage.getItem(userKey) || "null"); } catch { return null; }
  }

  async function api(path, options = {}) {
    try {
      return await FM.request(path, Object.assign({ token: state.token }, options));
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        if (!location.hash.includes("login")) signOut(true);
      }
      throw error;
    }
  }

  function signOut(silent) {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    state.token = null;
    state.user = null;
    $("#shell").hidden = true;
    $("#login").hidden = false;
    if (!silent) toast("Signed out");
  }

  function signIn(data) {
    state.token = data.token;
    state.user = data;
    localStorage.setItem(tokenKey, data.token);
    localStorage.setItem(userKey, JSON.stringify(data));
    $("#login").hidden = true;
    $("#shell").hidden = false;
    $("#who").textContent = data.fullName + " · " + data.role;
    renderNav();
    route();
  }

  function renderNav() {
    const role = (state.user || user() || {}).role;
    $("#nav").innerHTML = NAV.map(group => {
      const items = group.items.filter(item => !item.super || role === "SUPER_ADMIN");
      if (!items.length) return "";
      return `<details class="nav-group" open><summary>${group.group}</summary>` + items.map(item =>
        `<a href="#/${item.id}" data-id="${item.id}">${item.label}</a>`
      ).join("") + `</details>`;
    }).join("");
  }

  function setActive(id) {
    document.querySelectorAll("#nav a").forEach(link => link.classList.toggle("on", link.dataset.id === id));
    const item = NAV.flatMap(group => group.items).find(entry => entry.id === id);
    $("#crumb").textContent = item ? (NAV.find(group => group.items.includes(item))?.group || "Home") : "Home";
    $("#pageTitle").textContent = item ? item.label : "Dashboard";
  }

  function toolbar(title, actions = "") {
    return `<div class="toolbar"><div class="grow"><h2 style="font-size:18px">${title}</h2></div>${actions}</div>`;
  }

  function table(headers, rowsHtml) {
    if (!rowsHtml) return `<div class="empty">Nothing here yet.</div>`;
    return `<div class="card" style="overflow:auto"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
  }

  function actions(id, extra = "") {
    return `<div class="row-actions">${extra}<button type="button" class="mini" data-view="${id}">View</button><button type="button" class="mini danger" data-del="${id}">Delete</button></div>`;
  }

  function openModal(html, wide) {
    $("#modalCard").className = "modal-card" + (wide ? " wide" : "");
    $("#modalCard").innerHTML = html;
    $("#modal").hidden = false;
  }

  function closeModal() { $("#modal").hidden = true; }

  function field(label, name, value = "", type = "text", extra = "") {
    if (type === "textarea") return `<label class="full">${label}<textarea name="${name}" rows="5">${escape(value)}</textarea></label>`;
    if (type === "select") return `<label>${label}<select name="${name}">${extra}</select></label>`;
    if (type === "checkbox") return `<label><input type="checkbox" name="${name}" ${value ? "checked" : ""}> ${label}</label>`;
    if (type === "color") return `<label>${label}<span class="color"><input type="color" value="${escape(value || "#0b1f3a")}" data-color="${name}"><input name="${name}" value="${escape(value || "")}"></span></label>`;
    if (type === "file") return `<label class="${extra}">${label}<input type="file" name="${name}" ${name === "images" ? "multiple accept='image/*'" : ""}></label>`;
    return `<label>${label}<input name="${name}" type="${type}" value="${escape(value)}"></label>`;
  }

  async function confirmDelete(path, label) {
    if (!confirm("Delete this " + label + "?")) return false;
    await api(path, { method: "DELETE" });
    toast("Deleted");
    return true;
  }

  async function download(path, name) {
    const response = await fetch(FM.base + path, { headers: { Authorization: "Bearer " + state.token } });
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name || "download";
    link.click();
    URL.revokeObjectURL(url);
  }

  function dl(obj) {
    return `<div class="activity">` + Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `<article><b>${escape(k)}</b><span>${escape(typeof v === "object" ? JSON.stringify(v) : v)}</span><span></span></article>`).join("") + `</div>`;
  }

  async function pageOverview() {
    const data = (await api("/api/dashboard/overview")).data || {};
    const k = data.kpis || {};
    const content = data.content || {};
    const sources = data.sources || [];
    const forms = sources.filter(s => s.kind !== "lead-source");
    const tags = sources.filter(s => s.kind === "lead-source");
    const bars = (rows) => {
      const max = Math.max(1, ...rows.map(s => Number(s.count || 0)));
      return rows.length ? rows.map(s => `
        <div class="bar"><span>${escape(s.name)}</span><i><em style="width:${Math.round((Number(s.count)/max)*100)}%"></em></i><b>${s.count}</b></div>
      `).join("") : "<p class='empty'>No inbound data yet.</p>";
    };
    view.innerHTML = `
      <div class="kpis">
        ${kpi("Captured people", k.capturedTotal, "All inbound forms")}
        ${kpi("Leads", k.leads, "Tagged by source")}
        ${kpi("Media audits", k.mediaAudits, "Campaign requests")}
        ${kpi("Applications", k.applications, "Vacancies")}
      </div>
      <div class="kpis">
        ${kpi("Contact Us", k.contacts)}
        ${kpi("Shopbeat", k.shopbeat)}
        ${kpi("Subscribers", k.activeSubscribers, k.subscribers + " total")}
        ${kpi("Gated downloads", k.gatedRequests)}
      </div>
      <div class="pipes">${(data.pipeline || []).map(p => `
        <a class="pipe" href="#/${p.id}"><span>${escape(p.name)}</span><b>${p.count}</b></a>
      `).join("")}</div>
      <div class="grid-2">
        <section class="card">
          <h2>Where people come from</h2>
          <p class="hint">Form channels</p>
          <div class="bars">${bars(forms)}</div>
          <p class="hint" style="margin-top:18px">Lead source tags</p>
          <div class="bars">${bars(tags)}</div>
        </section>
        <section class="card">
          <h2>Content health</h2>
          <div class="activity">
            <article><span>News pending</span><b>${content.newsPending || 0}</b><span>${pill((content.newsApproved || 0) + " live", "green")}</span></article>
            <article><span>Vacancies live</span><b>${content.vacanciesLive || 0}</b><span>${content.vacancies || 0} total</span></article>
            <article><span>Campaigns sent</span><b>${content.campaignsSent || 0}</b><span>${content.campaignsDraft || 0} drafts</span></article>
            <article><span>Gallery / events</span><b>${content.gallery || 0}</b><span>${content.events || 0} events</span></article>
            <article><span>Templates</span><b>${content.templates || 0}</b><span>${content.banners || 0} banners</span></article>
          </div>
        </section>
      </div>
      <section class="card">
        <h2>Recent activity</h2>
        <div class="activity">${(data.recent || []).map(item => `
          <article>
            ${pill(item.source, "red")}
            <div><b>${escape(item.name)}</b><div style="color:var(--muted);font-size:13px">${escape(item.email || item.detail || "")}</div></div>
            <span>${fmt(item.at)}</span>
          </article>
        `).join("") || "<p class='empty'>No recent captures.</p>"}</div>
      </section>`;
  }

  function kpi(label, value, hint = "") {
    return `<article class="kpi"><span>${label}</span><b>${value ?? 0}</b>${hint ? `<small>${hint}</small>` : ""}</article>`;
  }

  async function pageLeads() {
    const [leads, sources] = await Promise.all([
      api("/api/leads"),
      api("/api/leads/sources")
    ]);
    const sourceFilter = `<select id="sourceFilter"><option value="">All sources</option>${(sources.data || []).map(s => `<option value="${s.id}">${escape(s.name)}</option>`).join("")}</select>`;
    view.innerHTML = toolbar("Every captured lead, tagged by source", `<div class="filters">${sourceFilter}<input id="q" placeholder="Search"></div>`) +
      `<div id="leadTable"></div>`;
    const draw = async () => {
      const q = $("#q").value.trim();
      const sourceId = $("#sourceFilter").value;
      const res = sourceId ? await api("/api/leads/source/" + sourceId) : q ? await api("/api/leads/search?keyword=" + encodeURIComponent(q)) : leads;
      const rows = (res.data || []).map(row => `<tr>
        <td><b>${escape(row.name)}</b><div style="color:var(--muted)">${escape(row.email)}</div></td>
        <td>${escape(row.telephone)}</td>
        <td>${escape(row.company)}</td>
        <td>${pill(row.source?.name || "Unknown", "red")}</td>
        <td>${fmt(row.capturedDate)}</td>
        <td>${actions(row.id)}</td>
      </tr>`).join("");
      $("#leadTable").innerHTML = table(["Person", "Phone", "Company", "Source", "Captured", ""], rows);
    };
    $("#q").addEventListener("input", () => { clearTimeout(pageLeads.t); pageLeads.t = setTimeout(draw, 240); });
    $("#sourceFilter").addEventListener("change", draw);
    $("#leadTable").addEventListener("click", async e => {
      const id = buttonFrom(e).dataset.view || buttonFrom(e).dataset.del;
      if (!id) return;
      if (buttonFrom(e).dataset.del) { if (await confirmDelete("/api/leads/" + id, "lead")) pageLeads(); return; }
      const item = (await api("/api/leads/" + id)).data;
      openModal(`<h2>${escape(item.name)}</h2>${dl({ Email: item.email, Phone: item.telephone, Company: item.company, Source: item.source?.name, Date: fmt(item.capturedDate) })}<div class="modal-actions"><button type="button" class="ghost" data-close>Close</button></div>`);
    });
    draw();
  }

  function listPage(opts) {
    return async function () {
      const res = await api(opts.path);
      const rows = (res.data || []).map(opts.row).join("");
      view.innerHTML = toolbar(opts.title, opts.action || "") + table(opts.headers, rows);
      view.onclick = async e => {
        if ("create" in buttonFrom(e).dataset) return opts.onCreate && opts.onCreate();
        const id = buttonFrom(e).dataset.view || buttonFrom(e).dataset.del || buttonFrom(e).dataset.act;
        if (!id) return;
        if (buttonFrom(e).dataset.del) { if (await confirmDelete(opts.path + "/" + id, opts.noun)) listPage(opts)(); return; }
        if (buttonFrom(e).dataset.act) return opts.onAct && opts.onAct(buttonFrom(e).dataset.act, buttonFrom(e).dataset.kind);
        const item = (await api(opts.path + "/" + id)).data;
        opts.onView(item);
      };
    };
  }

  const pageContacts = listPage({
    path: "/api/contact", noun: "contact", title: "Contact form submissions",
    headers: ["Person", "Company", "Brand / sales / service", "Date", ""],
    row: c => `<tr><td><b>${escape(c.name)}</b><div style="color:var(--muted)">${escape(c.email)} · ${escape(c.telephone)}</div></td><td>${escape(c.company)}</td><td>${pill("Contact Us","blue")} ${escape(c.brand?.name)} / ${escape(c.sales?.name)} / ${escape(c.service?.name)}</td><td>${fmt(c.submittedDate)}</td><td>${actions(c.id)}</td></tr>`,
    onView: c => openModal(`<h2>${escape(c.name)}</h2>${dl({ Email: c.email, Phone: c.telephone, Company: c.company, Brand: c.brand?.name, Sales: c.sales?.name, Service: c.service?.name, Source: "Contact Us", Sent: c.emailSent ? "Yes" : "No", Date: fmt(c.submittedDate) })}<div class="modal-actions"><button type="button" class="ghost" data-close>Close</button></div>`)
  });

  const pageAudits = listPage({
    path: "/api/media-audit", noun: "audit", title: "Media audit requests",
    headers: ["Person", "Campaign", "Audience / budget", "Date", ""],
    row: a => `<tr><td><b>${escape(a.name)}</b><div style="color:var(--muted)">${escape(a.email)}</div></td><td>${escape(a.campaignName)}<div style="color:var(--muted)">${escape(a.location)}</div></td><td>${pill("Media Audit","red")}<div>${escape(a.primaryAudience || "")}</div><div style="color:var(--muted)">${escape(a.advertisingBudget || "Budget skipped")}</div></td><td>${fmt(a.submittedDate)}</td><td>${actions(a.id)}</td></tr>`,
    onView: a => openModal(`<h2>${escape(a.campaignName)}</h2>${dl({
      Name: a.name, Email: a.email, Phone: a.telephone, Company: a.company, Location: a.location,
      Business: a.businessDescription, "Campaign type": a.campaignType, Other: a.campaignTypeOther,
      Audience: a.primaryAudience, Advertising: a.currentAdvertising, Timing: a.advertiseTimeline,
      Budget: a.advertisingBudget, Details: a.additionalDetails, Source: "Media Audit", Date: fmt(a.submittedDate)
    })}<div class="modal-actions"><button type="button" class="ghost" data-close>Close</button></div>`)
  });

  const pageShopbeat = listPage({
    path: "/api/shopbeat", noun: "request", title: "Shopbeat demo requests",
    headers: ["Person", "Feeling", "Company", "Date", ""],
    row: r => `<tr><td><b>${escape(r.name)}</b><div style="color:var(--muted)">${escape(r.email)}</div></td><td>${pill("Shopbeat","amber")} ${escape(r.feeling?.name)}</td><td>${escape(r.company)}</td><td>${fmt(r.submittedDate)}</td><td>${actions(r.id)}</td></tr>`,
    onView: r => openModal(`<h2>${escape(r.name)}</h2>${dl({ Email: r.email, Phone: r.telephone, Company: r.company, Feeling: r.feeling?.name, Inspiration: r.hasSoundInspiration ? r.soundInspiration : "No", Message: r.message, Source: "Shopbeat", Date: fmt(r.submittedDate) })}<div class="modal-actions"><button type="button" class="ghost" data-close>Close</button></div>`)
  });

  async function pageSubscribers() {
    const activeOnly = pageSubscribers.activeOnly;
    const res = await api(activeOnly ? "/api/subscriptions/active" : "/api/subscriptions");
    const rows = (res.data || []).map(s => `<tr>
      <td>${escape(s.fullName)}</td><td>${escape(s.email)}</td><td>${escape(s.language)}</td>
      <td>${s.active ? pill("Active","green") : pill("Unsubscribed","amber")}</td>
      <td>${fmt(s.subscribedDate)}</td>
      <td><div class="row-actions">${s.active ? `<button type="button" class="mini" data-act="${s.id}">Unsubscribe</button>` : ""}<button class="mini danger" data-del="${s.id}">Delete</button></div></td>
    </tr>`).join("");
    view.innerHTML = toolbar("Newsletter subscribers", `<button class="mini ${activeOnly ? "on" : ""}" id="activeOnly" type="button">${activeOnly ? "Show all" : "Active only"}</button>`) +
      table(["Name", "Email", "Language", "Status", "Date", ""], rows);
    $("#activeOnly").onclick = () => { pageSubscribers.activeOnly = !activeOnly; pageSubscribers(); };
    view.onclick = async e => {
      const id = buttonFrom(e).dataset.act || buttonFrom(e).dataset.del;
      if (!id) return;
      if (buttonFrom(e).dataset.del) { if (await confirmDelete("/api/subscriptions/" + id, "subscriber")) pageSubscribers(); return; }
      await api("/api/subscriptions/" + id + "/unsubscribe", { method: "PUT" });
      toast("Unsubscribed");
      pageSubscribers();
    };
  }

  async function pageDownloads() {
    const res = await api("/api/gated-documents/requests");
    const rows = (res.data || []).map(r => `<tr>
      <td><b>${escape(r.name)}</b><div style="color:var(--muted)">${escape(r.email)}</div></td>
      <td>${pill("Gated download","blue")} ${escape(r.document?.title)}</td>
      <td>${escape(r.company)}</td>
      <td>${r.emailSent ? pill("Emailed","green") : pill("Pending","amber")}</td>
      <td>${fmt(r.submittedDate)}</td>
    </tr>`).join("");
    view.innerHTML = toolbar("People who requested a document") + table(["Person", "Document / source", "Company", "Email", "Date"], rows);
  }

  async function pageApplications() {
    const vacancies = (await api("/api/vacancies")).data || [];
    view.innerHTML = toolbar("Vacancy applications", `<div class="filters"><input id="q" placeholder="Search applicants"><select id="vacancyFilter"><option value="">All roles</option>${vacancies.map(v => `<option value="${v.id}">${escape(v.title)}</option>`).join("")}</select></div>`) + `<div id="appTable"></div>`;
    const draw = async () => {
      const q = $("#q").value.trim();
      const vacancyId = $("#vacancyFilter").value;
      const res = vacancyId
        ? await api("/api/applications/vacancy/" + vacancyId)
        : q
          ? await api("/api/applications/search?keyword=" + encodeURIComponent(q))
          : await api("/api/applications");
      const rows = (res.data || []).map(a => `<tr>
        <td><b>${escape(a.name)} ${escape(a.surname)}</b></td>
        <td>${pill("Application","navy")} ${escape(a.vacancy?.title)}</td>
        <td>${escape(a.highestQualification)}</td>
        <td>${a.namibian ? "Namibian" : "Other"}</td>
        <td>${fmt(a.appliedDate)}</td>
        <td><div class="row-actions"><button type="button" class="mini" data-view="${a.id}">View</button><button type="button" class="mini" data-cv="${a.id}">CV</button><button class="mini danger" data-del="${a.id}">Delete</button></div></td>
      </tr>`).join("");
      $("#appTable").innerHTML = table(["Applicant", "Role / source", "Qualification", "Nationality", "Date", ""], rows);
    };
    $("#q").addEventListener("input", () => { clearTimeout(pageApplications.t); pageApplications.t = setTimeout(draw, 240); });
    $("#vacancyFilter").addEventListener("change", draw);
    $("#appTable").addEventListener("click", async e => {
      const id = buttonFrom(e).dataset.view || buttonFrom(e).dataset.del || buttonFrom(e).dataset.cv;
      if (!id) return;
      if (buttonFrom(e).dataset.del) { if (await confirmDelete("/api/applications/" + id, "application")) pageApplications(); return; }
      if (buttonFrom(e).dataset.cv) { await download("/api/applications/" + id + "/cv", "cv"); return; }
      const item = (await api("/api/applications/" + id)).data;
      openModal(`<h2>${escape(item.name)} ${escape(item.surname)}</h2>${dl({ Role: item.vacancy?.title, DOB: item.dateOfBirth, Qualification: item.highestQualification, Experience: item.workExperience, Namibian: item.namibian ? "Yes" : "No", Date: fmt(item.appliedDate) })}<div class="modal-actions"><button type="button" class="ghost" data-close>Close</button><button data-cv="${item.id}">Download CV</button></div>`);
    });
    draw();
  }

  async function pageFreelancerApplications() {
    const roles = (await api("/api/freelancers")).data || [];
    view.innerHTML = toolbar("Freelancer applications", `<div class="filters"><input id="q" placeholder="Search applicants"><select id="roleFilter"><option value="">All roles</option>${roles.map(role => `<option value="${role.id}">${escape(role.title)}</option>`).join("")}</select></div>`) + `<div id="appTable"></div>`;
    const draw = async () => {
      const q = $("#q").value.trim();
      const roleId = $("#roleFilter").value;
      const res = roleId
        ? await api("/api/freelancer-applications/role/" + roleId)
        : q
          ? await api("/api/freelancer-applications/search?keyword=" + encodeURIComponent(q))
          : await api("/api/freelancer-applications");
      const rows = (res.data || []).map(a => `<tr>
        <td><b>${escape(a.name)} ${escape(a.surname)}</b><div style="color:var(--muted)">${escape(a.email)}</div></td>
        <td>${pill("Freelancer","blue")} ${escape(a.role?.title)}</td>
        <td>${escape(a.skill)}</td>
        <td>${a.namibian ? "Namibian" : "Other"}</td>
        <td>${fmt(a.appliedDate)}</td>
        <td><div class="row-actions"><button type="button" class="mini" data-view="${a.id}">View</button><button type="button" class="mini" data-fcv="${a.id}">CV</button><button type="button" class="mini danger" data-del="${a.id}">Delete</button></div></td>
      </tr>`).join("");
      $("#appTable").innerHTML = table(["Applicant", "Role / source", "Skill", "Nationality", "Date", ""], rows);
    };
    $("#q").addEventListener("input", () => { clearTimeout(pageFreelancerApplications.t); pageFreelancerApplications.t = setTimeout(draw, 240); });
    $("#roleFilter").addEventListener("change", draw);
    $("#appTable").addEventListener("click", async e => {
      const target = buttonFrom(e);
      const id = target.dataset.view || target.dataset.del || target.dataset.fcv;
      if (!id) return;
      if (target.dataset.del) { if (await confirmDelete("/api/freelancer-applications/" + id, "application")) pageFreelancerApplications(); return; }
      if (target.dataset.fcv) { await download("/api/freelancer-applications/" + id + "/cv", "cv"); return; }
      const item = (await api("/api/freelancer-applications/" + id)).data;
      openModal(`<h2>${escape(item.name)} ${escape(item.surname)}</h2>${dl({ Role: item.role?.title, Email: item.email, Phone: item.telephone, Based: item.location, Skill: item.skill, Experience: item.experience, Namibian: item.namibian ? "Yes" : "No", Date: fmt(item.appliedDate) })}<div class="modal-actions"><button type="button" class="ghost" data-close>Close</button><button type="button" data-fcv="${item.id}">Download CV</button></div>`);
    });
    draw();
  }

  function mediaCell(url) {
    return url ? `<img class="list-media" src="${escape(FM.fileUrl(url))}" alt="">` : "";
  }

  async function pageNews() {
    const filter = pageNews.filter || "all";
    const path = filter === "pending" ? "/api/news/pending" : filter === "mine" ? "/api/news/my" : "/api/news";
    const res = await api(path);
    const rows = (res.data || []).map(n => `<tr>
      <td>${mediaCell(n.mediaPath)}</td>
      <td><b>${escape(n.title)}</b></td>
      <td>${n.approvalStatus === "APPROVED" ? pill("Approved","green") : n.approvalStatus === "REJECTED" ? pill("Rejected","red") : pill("Pending","amber")}</td>
      <td>${escape(n.createdBy?.fullName)}</td>
      <td>${fmt(n.createdDate)}</td>
      <td><div class="row-actions">
        ${n.approvalStatus === "PENDING" ? `<button type="button" class="mini" data-act="${n.id}" data-kind="approve">Approve</button><button type="button" class="mini" data-act="${n.id}" data-kind="reject">Reject</button>` : ""}
        <button type="button" class="mini" data-edit="${n.id}">Edit</button>
        <button class="mini danger" data-del="${n.id}">Delete</button>
      </div></td>
    </tr>`).join("");
    view.innerHTML = toolbar("News", `<div class="filters">
      <button class="mini ${filter === "all" ? "on" : ""}" data-filter="all">All</button>
      <button class="mini ${filter === "pending" ? "on" : ""}" data-filter="pending">Pending</button>
      <button class="mini ${filter === "mine" ? "on" : ""}" data-filter="mine">Mine</button>
    </div><button type="button" class="btn" data-create style="width:auto">New story</button>`) + table(["", "Title", "Status", "Author", "Date", ""], rows);
    view.onclick = async e => {
      if (buttonFrom(e).dataset.filter) { pageNews.filter = buttonFrom(e).dataset.filter; return pageNews(); }
      if ("create" in buttonFrom(e).dataset) return newsForm();
      const id = buttonFrom(e).dataset.edit || buttonFrom(e).dataset.del || buttonFrom(e).dataset.act;
      if (!id) return;
      if (buttonFrom(e).dataset.del) { if (await confirmDelete("/api/news/" + id, "story")) pageNews(); return; }
      if (buttonFrom(e).dataset.kind === "approve") { await api("/api/news/" + id + "/approve", { method: "PUT" }); toast("Approved"); return pageNews(); }
      if (buttonFrom(e).dataset.kind === "reject") { await api("/api/news/" + id + "/reject", { method: "PUT" }); toast("Rejected"); return pageNews(); }
      newsForm((await api("/api/news/" + id)).data);
    };
  }

  function newsForm(item) {
    openModal(`<h2>${item ? "Edit story" : "New story"}</h2><form id="mform" class="form-grid">
      ${field("Title", "title", item?.title || "", "text")}
      ${field("Media", "media", "", "file")}
      ${field("Description", "description", item?.description || "", "textarea")}
      <div class="modal-actions full"><button type="button" class="ghost" data-close type="button">Cancel</button><button type="submit">Save</button></div>
    </form>`);
    $("#mform").onsubmit = async ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      if (!item && !fd.get("media")?.size) return toast("Media is required", true);
      if (item && !fd.get("media")?.size) fd.delete("media");
      await api(item ? "/api/news/" + item.id : "/api/news", { method: item ? "PUT" : "POST", form: true, body: fd });
      closeModal(); toast("Saved"); pageNews();
    };
  }

  async function simpleMediaPage(cfg) {
    const res = await api(cfg.path);
    const rows = (res.data || []).map(cfg.row).join("");
    view.innerHTML = toolbar(cfg.title, `<button type="button" class="btn" data-create style="width:auto">${cfg.createLabel}</button>`) + table(cfg.headers, rows);
    view.onclick = async e => {
      if ("create" in buttonFrom(e).dataset) return cfg.form();
      const id = buttonFrom(e).dataset.edit || buttonFrom(e).dataset.del || buttonFrom(e).dataset.act;
      if (!id) return;
      if (buttonFrom(e).dataset.del) { if (await confirmDelete(cfg.deletePath(id), cfg.noun)) simpleMediaPage(cfg); return; }
      if (buttonFrom(e).dataset.kind) return cfg.onAct(id, buttonFrom(e).dataset.kind);
      cfg.form((await api(cfg.itemPath(id))).data);
    };
  }

  function multipartForm(title, fields, onSubmit) {
    openModal(`<h2>${title}</h2><form id="mform" class="form-grid">${fields}<div class="modal-actions full"><button type="button" class="ghost" data-close type="button">Cancel</button><button type="submit">Save</button></div></form>`);
    $("#mform").onsubmit = onSubmit;
  }

  const pageEvents = () => simpleMediaPage({
    path: "/api/events", noun: "event", title: "Events", createLabel: "New event",
    headers: ["", "Title", "Date", ""],
    row: e => `<tr><td>${mediaCell(e.mediaPath)}</td><td>${escape(e.title)}</td><td>${fmt(e.createdDate)}</td><td><div class="row-actions"><button type="button" class="mini" data-edit="${e.id}">Edit</button><button class="mini danger" data-del="${e.id}">Delete</button></div></td></tr>`,
    deletePath: id => "/api/events/" + id, itemPath: id => "/api/events/" + id,
    form: item => multipartForm(item ? "Edit event" : "New event",
      field("Title", "title", item?.title || "") + field("Media", "media", "", "file") + field("Description", "description", item?.description || "", "textarea"),
      async ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        if (!item && !fd.get("media")?.size) return toast("Media is required", true);
        if (item && !fd.get("media")?.size) fd.delete("media");
        await api(item ? "/api/events/" + item.id : "/api/events", { method: item ? "PUT" : "POST", form: true, body: fd });
        closeModal(); toast("Saved"); pageEvents();
      })
  });

  const pageGallery = () => simpleMediaPage({
    path: "/api/gallery", noun: "image", title: "Gallery", createLabel: "Upload",
    headers: ["", "Title", "Date", ""],
    row: g => `<tr><td>${mediaCell(g.imagePath)}</td><td>${escape(g.title)}</td><td>${fmt(g.createdDate)}</td><td><div class="row-actions"><button type="button" class="mini" data-edit="${g.id}">Edit</button><button class="mini danger" data-del="${g.id}">Delete</button></div></td></tr>`,
    deletePath: id => "/api/gallery/" + id, itemPath: id => "/api/gallery/" + id,
    form: item => multipartForm(item ? "Edit image" : "Upload images",
      field("Title", "title", item?.title || "") + field(item ? "Replace image" : "Images", item ? "image" : "images", "", "file", "full"),
      async ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        if (item) {
          if (!fd.get("image")?.size) fd.delete("image");
          await api("/api/gallery/" + item.id, { method: "PUT", form: true, body: fd });
        } else {
          const files = ev.target.images.files;
          if (!files.length) return toast("Choose images", true);
          if (files.length === 1) {
            const single = new FormData();
            if (fd.get("title")) single.append("title", fd.get("title"));
            single.append("image", files[0]);
            await api("/api/gallery/single", { method: "POST", form: true, body: single });
          } else {
            const multi = new FormData();
            if (fd.get("title")) multi.append("title", fd.get("title"));
            [...files].forEach(file => multi.append("images", file));
            await api("/api/gallery/multiple", { method: "POST", form: true, body: multi });
          }
        }
        closeModal(); toast("Saved"); pageGallery();
      })
  });

  const pageVacancies = () => simpleMediaPage({
    path: "/api/vacancies", noun: "vacancy", title: "Vacancies", createLabel: "New vacancy",
    headers: ["", "Role", "Status", "Closes", ""],
    row: v => `<tr><td>${mediaCell(v.mediaPath)}</td><td><b>${escape(v.title)}</b></td><td>${v.published ? pill("Live","green") : pill("Hidden","amber")}</td><td>${v.closingDate || "—"}</td><td><div class="row-actions"><button type="button" class="mini" data-act="${v.id}" data-kind="${v.published ? "unpublish" : "publish"}">${v.published ? "Unpublish" : "Publish"}</button><button type="button" class="mini" data-edit="${v.id}">Edit</button><button class="mini danger" data-del="${v.id}">Delete</button></div></td></tr>`,
    deletePath: id => "/api/vacancies/" + id, itemPath: id => "/api/vacancies/" + id,
    onAct: async (id, kind) => { await api("/api/vacancies/" + id + "/" + kind, { method: "PUT" }); pageVacancies(); },
    form: item => multipartForm(item ? "Edit vacancy" : "New vacancy",
      field("Title", "title", item?.title || "") + field("Closing date", "closingDate", item?.closingDate || "", "date") +
      field("Media", "media", "", "file") + `<label>Published <select name="published"><option value="true" ${item?.published !== false ? "selected" : ""}>Yes</option><option value="false">No</option></select></label>` +
      field("Description", "description", item?.description || "", "textarea"),
      async ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        if (!item && !fd.get("media")?.size) return toast("Media is required", true);
        if (item && !fd.get("media")?.size) fd.delete("media");
        await api(item ? "/api/vacancies/" + item.id : "/api/vacancies", { method: item ? "PUT" : "POST", form: true, body: fd });
        closeModal(); toast("Saved"); pageVacancies();
      })
  });

  const pageFreelancers = () => simpleMediaPage({
    path: "/api/freelancers", noun: "role", title: "Freelancer roles", createLabel: "New role",
    headers: ["Role", "Status", "Closes", ""],
    row: role => `<tr><td><b>${escape(role.title)}</b></td><td>${role.published ? pill("Live","green") : pill("Hidden","amber")}</td><td>${role.closingDate || "—"}</td><td><div class="row-actions"><button type="button" class="mini" data-act="${role.id}" data-kind="${role.published ? "unpublish" : "publish"}">${role.published ? "Unpublish" : "Publish"}</button><button type="button" class="mini" data-edit="${role.id}">Edit</button><button type="button" class="mini danger" data-del="${role.id}">Delete</button></div></td></tr>`,
    deletePath: id => "/api/freelancers/" + id, itemPath: id => "/api/freelancers/" + id,
    onAct: async (id, kind) => { await api("/api/freelancers/" + id + "/" + kind, { method: "PUT" }); pageFreelancers(); },
    form: item => {
      openModal(`<h2>${item ? "Edit role" : "New freelancer role"}</h2><form id="mform" class="form-grid">
        ${field("Title", "title", item?.title || "")}
        ${field("Closing date", "closingDate", item?.closingDate || "", "date")}
        <label>Published <select name="published"><option value="true" ${item?.published !== false ? "selected" : ""}>Yes</option><option value="false" ${item?.published === false ? "selected" : ""}>No</option></select></label>
        ${field("Description", "description", item?.description || "", "textarea")}
        <div class="modal-actions full"><button type="button" class="ghost" data-close>Cancel</button><button type="submit">Save</button></div>
      </form>`);
      $("#mform").onsubmit = async ev => {
        ev.preventDefault();
        const body = Object.fromEntries(new FormData(ev.target).entries());
        body.published = body.published !== "false";
        await api(item ? "/api/freelancers/" + item.id : "/api/freelancers", { method: item ? "PUT" : "POST", body });
        closeModal(); toast("Saved"); pageFreelancers();
      };
    }
  });

  const pageBanners = () => simpleMediaPage({
    path: "/api/banners", noun: "banner", title: "Banners", createLabel: "New banner",
    headers: ["", "Title", "Status", ""],
    row: b => `<tr><td>${mediaCell(b.imagePath)}</td><td>${escape(b.title)}</td><td>${b.active ? pill("Active","green") : pill("Off","amber")}</td><td><div class="row-actions"><button type="button" class="mini" data-edit="${b.id}">Edit</button><button class="mini danger" data-del="${b.id}">Delete</button></div></td></tr>`,
    deletePath: id => "/api/banners/" + id, itemPath: id => "/api/banners/" + id,
    form: item => multipartForm(item ? "Edit banner" : "New banner",
      field("Title", "title", item?.title || "") + field("Image", "image", "", "file") +
      (item ? `<label>Active <select name="active"><option value="true" ${item.active ? "selected" : ""}>Yes</option><option value="false">No</option></select></label>` : "") +
      field("Description", "description", item?.description || "", "textarea"),
      async ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        if (!item && !fd.get("image")?.size) return toast("Image is required", true);
        if (item && !fd.get("image")?.size) fd.delete("image");
        await api(item ? "/api/banners/" + item.id : "/api/banners", { method: item ? "PUT" : "POST", form: true, body: fd });
        closeModal(); toast("Saved"); pageBanners();
      })
  });

  const pageDocuments = () => simpleMediaPage({
    path: "/api/gated-documents", noun: "document", title: "Gated documents", createLabel: "Upload document",
    headers: ["Title", "Status", "Date", ""],
    row: d => `<tr><td><b>${escape(d.title)}</b><div style="color:var(--muted)">${escape(d.description || "")}</div></td><td>${d.active ? pill("Live","green") : pill("Hidden","amber")}</td><td>${fmt(d.createdDate)}</td><td><div class="row-actions"><button type="button" class="mini" data-reqs="${d.id}">Requests</button><button type="button" class="mini" data-file="${d.id}">File</button><button type="button" class="mini" data-edit="${d.id}">Edit</button><button class="mini danger" data-del="${d.id}">Delete</button></div></td></tr>`,
    deletePath: id => "/api/gated-documents/" + id, itemPath: id => "/api/gated-documents/" + id,
    form: item => multipartForm(item ? "Edit document" : "Upload document",
      field("Public title", "title", item?.title || "") + field("File", "file", "", "file") +
      (item ? `<label>Active <select name="active"><option value="true" ${item.active ? "selected" : ""}>Yes</option><option value="false">No</option></select></label>` : "") +
      field("Description", "description", item?.description || "", "textarea"),
      async ev => {
        ev.preventDefault();
        const fd = new FormData(ev.target);
        if (!item && !fd.get("file")?.size) return toast("File is required", true);
        if (item && !fd.get("file")?.size) fd.delete("file");
        await api(item ? "/api/gated-documents/" + item.id : "/api/gated-documents", { method: item ? "PUT" : "POST", form: true, body: fd });
        closeModal(); toast("Saved"); pageDocuments();
      })
  });

  document.body.addEventListener("click", async e => {
    if (buttonFrom(e).dataset.close != null || e.target.id === "modal") closeModal();
    if (buttonFrom(e).dataset.file) { e.stopPropagation(); await download("/api/gated-documents/" + buttonFrom(e).dataset.file + "/file", "document"); }
    if (buttonFrom(e).dataset.reqs) {
      const res = await api("/api/gated-documents/" + buttonFrom(e).dataset.reqs + "/requests");
      openModal(`<h2>Download requests</h2>${table(["Name","Email","Company","Date"], (res.data || []).map(r => `<tr><td>${escape(r.name)}</td><td>${escape(r.email)}</td><td>${escape(r.company)}</td><td>${fmt(r.submittedDate)}</td></tr>`).join(""))}<div class="modal-actions"><button type="button" class="ghost" data-close>Close</button></div>`);
    }
    if (buttonFrom(e).dataset.cv) { try { await download("/api/applications/" + buttonFrom(e).dataset.cv + "/cv", "cv"); } catch (err) { toast(err.message, true); } }
    if (buttonFrom(e).dataset.fcv) { try { await download("/api/freelancer-applications/" + buttonFrom(e).dataset.fcv + "/cv", "cv"); } catch (err) { toast(err.message, true); } }
  });

  function catalogPage(cfg) {
    return async function () {
      const res = await api(cfg.path);
      const rows = (res.data || []).map(item => `<tr>
        <td>${escape(item.name)}</td>
        <td>${item.active !== false ? pill("Active","green") : pill("Off","amber")}</td>
        <td><div class="row-actions"><button type="button" class="mini" data-edit="${item.id}">Edit</button><button class="mini danger" data-del="${item.id}">Delete</button></div></td>
      </tr>`).join("");
      view.innerHTML = toolbar(cfg.title, `<button type="button" class="btn" data-create style="width:auto">Add</button>`) + table(["Name", "Status", ""], rows);
      view.onclick = async e => {
        if ("create" in buttonFrom(e).dataset) return catalogForm(cfg);
        const id = buttonFrom(e).dataset.edit || buttonFrom(e).dataset.del;
        if (!id) return;
        if (buttonFrom(e).dataset.del) { if (await confirmDelete(cfg.path + "/" + id, cfg.noun)) catalogPage(cfg)(); return; }
        const loaded = (await api(cfg.path + "/" + id)).data;
        catalogForm(cfg, loaded || (res.data || []).find(item => String(item.id) === String(id)));
      };
    };
  }

  function catalogForm(cfg, item) {
    openModal(`<h2>${item ? "Edit" : "Add"} ${cfg.noun}</h2><form id="mform">
      ${field("Name", "name", item?.name || "")}
      ${item ? `<label>Active <select name="active"><option value="true" ${item.active !== false ? "selected" : ""}>Yes</option><option value="false">No</option></select></label>` : ""}
      <div class="modal-actions"><button type="button" class="ghost" data-close type="button">Cancel</button><button type="submit">Save</button></div>
    </form>`);
    $("#mform").onsubmit = async ev => {
      ev.preventDefault();
      const body = Object.fromEntries(new FormData(ev.target).entries());
      await api(item ? cfg.path + "/" + item.id : cfg.path, { method: item ? "PUT" : "POST", body });
      closeModal(); toast("Saved"); catalogPage(cfg)();
    };
  }

  const pageBrands = catalogPage({ path: "/api/brands", title: "Brands", noun: "brand" });
  const pageSales = catalogPage({ path: "/api/sales", title: "Sales options", noun: "sales option" });
  const pageServices = catalogPage({ path: "/api/services", title: "Services", noun: "service" });
  const pageSources = catalogPage({ path: "/api/leads/sources", title: "Lead sources", noun: "source" });
  const pageFeelings = catalogPage({ path: "/api/shopbeat/feelings", title: "Shopbeat feelings", noun: "feeling" });

  async function pageUsers() {
    view.innerHTML = toolbar("Users", `<div class="filters"><input id="q" placeholder="Search users"></div><button type="button" class="btn" data-create style="width:auto">New user</button>`) + `<div id="userTable"></div>`;
    const draw = async () => {
      const q = $("#q").value.trim();
      const res = q ? await api("/api/users/search?keyword=" + encodeURIComponent(q)) : await api("/api/users");
      const rows = (res.data || []).map(u => `<tr>
        <td>${escape(u.fullName)}</td><td>${escape(u.email)}</td><td>${pill(u.role)}</td>
        <td>${u.enabled ? pill("Enabled","green") : pill("Disabled","red")}</td>
        <td><div class="row-actions">
          <button type="button" class="mini" data-act="${u.id}" data-kind="${u.enabled ? "disable" : "enable"}">${u.enabled ? "Disable" : "Enable"}</button>
          <button type="button" class="mini" data-edit="${u.id}">Edit</button>
          <button class="mini danger" data-del="${u.id}">Delete</button>
        </div></td>
      </tr>`).join("");
      $("#userTable").innerHTML = table(["Name","Email","Role","Status",""], rows);
    };
    $("#q").addEventListener("input", () => { clearTimeout(pageUsers.t); pageUsers.t = setTimeout(draw, 240); });
    view.onclick = async e => {
      if ("create" in buttonFrom(e).dataset) return userForm();
      const id = buttonFrom(e).dataset.edit || buttonFrom(e).dataset.del || buttonFrom(e).dataset.act;
      if (!id) return;
      if (buttonFrom(e).dataset.del) { if (await confirmDelete("/api/users/" + id, "user")) pageUsers(); return; }
      if (buttonFrom(e).dataset.kind) { await api("/api/users/" + id + "/" + buttonFrom(e).dataset.kind, { method: "PUT" }); return pageUsers(); }
      userForm((await api("/api/users/" + id)).data);
    };
    draw();
  }

  function userForm(item) {
    openModal(`<h2>${item ? "Edit user" : "New user"}</h2><form id="mform" class="form-grid">
      ${field("Full name", "fullName", item?.fullName || "")}
      ${field("Email", "email", item?.email || "", "email")}
      ${field(item ? "New password (optional)" : "Password", "password", "", "password")}
      <label>Role<select name="role"><option ${item?.role === "USER" ? "selected" : ""}>USER</option><option ${item?.role === "SUPER_ADMIN" ? "selected" : ""}>SUPER_ADMIN</option></select></label>
      <div class="modal-actions full"><button type="button" class="ghost" data-close type="button">Cancel</button><button type="submit">Save</button></div>
    </form>`);
    $("#mform").onsubmit = async ev => {
      ev.preventDefault();
      const body = Object.fromEntries(new FormData(ev.target).entries());
      if (item && !body.password) delete body.password;
      await api(item ? "/api/users/" + item.id : "/api/users", { method: item ? "PUT" : "POST", body });
      closeModal(); toast("Saved"); pageUsers();
    };
  }

  async function pageTemplates() {
    const res = await api("/api/email-templates");
    const rows = (res.data || []).map(t => `<tr>
      <td><b>${escape(t.name)}</b><div style="color:var(--muted)">${escape(t.headerHeadline || t.preheader || "")}</div></td>
      <td>${t.active ? pill("Active","green") : pill("Off","amber")}</td>
      <td>${fmt(t.updatedDate || t.createdDate)}</td>
      <td><div class="row-actions"><a class="mini" href="#/templates/${t.id}" style="display:inline-flex">Edit</a><button class="mini danger" data-del="${t.id}">Delete</button></div></td>
    </tr>`).join("");
    view.innerHTML = toolbar("Email templates", `<button type="button" class="btn" data-create style="width:auto">New template</button>`) + table(["Template","Status","Updated",""], rows);
    view.onclick = async e => {
      if ("create" in buttonFrom(e).dataset) return createTemplate();
      if (buttonFrom(e).dataset.del) { if (await confirmDelete("/api/email-templates/" + buttonFrom(e).dataset.del, "template")) pageTemplates(); }
    };
  }

  async function createTemplate() {
    openModal(`<h2>New template</h2><form id="mform">${field("Name", "name")}<div class="modal-actions"><button type="button" class="ghost" data-close type="button">Cancel</button><button type="submit">Create</button></div></form>`);
    $("#mform").onsubmit = async ev => {
      ev.preventDefault();
      const created = await api("/api/email-templates", { method: "POST", body: { name: ev.target.name.value, headerHeadline: "Hello {{name}}", bodyContent: "Write your message here.", ctaText: "Visit FutureMedia", ctaUrl: "https://futuremedia.simplyfound.com.na", footerText: "Future Media · Namibia" } });
      closeModal();
      location.hash = "#/templates/" + created.data.id;
    };
  }

  async function pageTemplateEditor(id) {
    const item = (await api("/api/email-templates/" + id)).data;
    const defaults = (await api("/api/email-templates/defaults")).data || {};
    view.innerHTML = `
      ${toolbar("Edit template", `<button type="button" class="ghost" id="testBtn" type="button">Send test</button><button type="button" class="btn" id="saveBtn" type="button" style="width:auto">Save</button>`)}
      <div class="split">
        <form id="tpl" class="card">
          ${field("Name", "name", item.name)}
          ${field("Inbox preview", "preheader", item.preheader)}
          ${field("Header headline", "headerHeadline", item.headerHeadline)}
          ${field("Header subheadline", "headerSubheadline", item.headerSubheadline, "textarea")}
          ${field("Header colour", "headerColor", item.headerColor || defaults.headerColor, "color")}
          ${field("Header text", "headerTextColor", item.headerTextColor || defaults.headerTextColor, "color")}
          ${field("Body headline", "bodyHeadline", item.bodyHeadline)}
          ${field("Body copy  — use {{name}}, {{email}}, {{company}}", "bodyContent", item.bodyContent, "textarea")}
          ${field("Body colour", "bodyColor", item.bodyColor || defaults.bodyColor, "color")}
          ${field("Body text", "bodyTextColor", item.bodyTextColor || defaults.bodyTextColor, "color")}
          ${field("Button text", "ctaText", item.ctaText)}
          ${field("Button URL", "ctaUrl", item.ctaUrl)}
          ${field("Button colour", "ctaButtonColor", item.ctaButtonColor || defaults.ctaButtonColor, "color")}
          ${field("Button text colour", "ctaTextColor", item.ctaTextColor || defaults.ctaTextColor, "color")}
          ${field("Footer", "footerText", item.footerText, "textarea")}
          ${field("Footer colour", "footerColor", item.footerColor || defaults.footerColor, "color")}
          ${field("Footer text", "footerTextColor", item.footerTextColor || defaults.footerTextColor, "color")}
          <label><input type="checkbox" name="useCompanyLogo" ${item.useCompanyLogo ? "checked" : ""}> Show company logo</label>
          <label><input type="checkbox" name="active" ${item.active ? "checked" : ""}> Active</label>
          <hr style="border:0;border-top:1px solid var(--line);margin:12px 0">
          <b>Images</b>
          <div class="thumbs" id="tplImages">${(item.images || []).map(img => `<span><img src="${escape(FM.fileUrl(img.imageUrl))}" alt=""><br><button type="button" class="mini danger" data-img="${img.id}">×</button></span>`).join("")}</div>
          <label>Add image<select name="section"><option>HEADER</option><option>BODY</option><option>FOOTER</option></select></label>
          <input type="file" id="tplFile">
        </form>
        <div class="preview"><iframe id="preview" title="Preview"></iframe></div>
      </div>`;
    async function payload() {
      const form = $("#tpl");
      const data = Object.fromEntries(new FormData(form).entries());
      ["headerColor","headerTextColor","bodyColor","bodyTextColor","ctaButtonColor","ctaTextColor","footerColor","footerTextColor"].forEach(key => {
        data[key] = form[key].value;
      });
      data.useCompanyLogo = form.useCompanyLogo.checked;
      data.active = form.active.checked;
      delete data.section;
      return data;
    }
    async function refresh() {
      await api("/api/email-templates/" + id, { method: "PUT", body: await payload() });
      const html = (await api("/api/email-templates/" + id + "/preview")).data.html;
      $("#preview").srcdoc = html;
    }
    $("#saveBtn").onclick = async () => { await refresh(); toast("Template saved"); };
    $("#tpl").addEventListener("input", e => {
      if (buttonFrom(e).dataset.color) {
        const linked = e.target.closest("label")?.querySelector(`[name="${buttonFrom(e).dataset.color}"]`);
        if (linked) linked.value = e.target.value;
      }
      const colorPick = e.target.name && e.target.closest("label")?.querySelector(`[data-color="${e.target.name}"]`);
      if (colorPick && /^#?[0-9a-fA-F]{6}$/.test(e.target.value)) colorPick.value = e.target.value.startsWith("#") ? e.target.value : "#" + e.target.value;
      clearTimeout(pageTemplateEditor.t);
      pageTemplateEditor.t = setTimeout(refresh, 450);
    });
    $("#tplFile").onchange = async ev => {
      if (!ev.target.files[0]) return;
      const fd = new FormData();
      fd.append("section", $("#tpl").section.value);
      fd.append("file", ev.target.files[0]);
      await api("/api/email-templates/" + id + "/images", { method: "POST", form: true, body: fd });
      toast("Image added"); pageTemplateEditor(id);
    };
    $("#tplImages")?.addEventListener("click", async e => {
      if (!buttonFrom(e).dataset.img) return;
      await api("/api/email-templates/" + id + "/images/" + buttonFrom(e).dataset.img, { method: "DELETE" });
      pageTemplateEditor(id);
    });
    $("#testBtn").onclick = () => {
      openModal(`<h2>Send test email</h2><form id="mform">${field("Email","email", state.user?.email || "", "email")}${field("Name","name", state.user?.fullName || "")}${field("Company","company","Future Media")}<div class="modal-actions"><button type="button" class="ghost" data-close type="button">Cancel</button><button type="submit">Send</button></div></form>`);
      $("#mform").onsubmit = async ev => {
        ev.preventDefault();
        await api("/api/email-templates/" + id + "/test", { method: "POST", body: Object.fromEntries(new FormData(ev.target).entries()) });
        closeModal(); toast("Test email sent");
      };
    };
    refresh();
  }

  async function pageCampaigns() {
    const res = await api("/api/email-campaigns");
    const rows = (res.data || []).map(c => `<tr>
      <td><b>${escape(c.name)}</b><div style="color:var(--muted)">${escape(c.subject)}</div></td>
      <td>${pill(c.audience)} ${c.leadSource ? escape(c.leadSource.name) : ""}</td>
      <td>${pill(c.status, c.status === "SENT" ? "green" : c.status === "FAILED" ? "red" : "amber")}</td>
      <td>${c.sentCount}/${c.totalRecipients}</td>
      <td><div class="row-actions"><a class="mini" href="#/campaigns/${c.id}">Open</a><button class="mini danger" data-del="${c.id}">Delete</button></div></td>
    </tr>`).join("");
    view.innerHTML = toolbar("Campaigns", `<button type="button" class="btn" data-create style="width:auto">New campaign</button>`) + table(["Campaign","Audience","Status","Sent",""], rows);
    view.onclick = async e => {
      if ("create" in buttonFrom(e).dataset) return createCampaign();
      if (buttonFrom(e).dataset.del) { if (await confirmDelete("/api/email-campaigns/" + buttonFrom(e).dataset.del, "campaign")) pageCampaigns(); }
    };
  }

  async function createCampaign() {
    const templates = (await api("/api/email-templates")).data || [];
    const sources = (await api("/api/leads/sources")).data || [];
    const audiences = (await api("/api/email-campaigns/audiences")).data || [];
    openModal(`<h2>New campaign</h2><form id="mform" class="form-grid">
      ${field("Name","name")}
      ${field("Subject","subject")}
      <label>Template<select name="templateId">${templates.map(t => `<option value="${t.id}">${escape(t.name)}</option>`).join("")}</select></label>
      <label>Audience<select name="audience">${audiences.map(a => `<option>${a}</option>`).join("")}</select></label>
      <label class="full">Lead source (if LEAD_SOURCE)<select name="leadSourceId"><option value=""></option>${sources.map(s => `<option value="${s.id}">${escape(s.name)}</option>`).join("")}</select></label>
      <div class="modal-actions full"><button type="button" class="ghost" data-close type="button">Cancel</button><button type="submit">Create draft</button></div>
    </form>`);
    $("#mform").onsubmit = async ev => {
      ev.preventDefault();
      const body = Object.fromEntries(new FormData(ev.target).entries());
      const created = await api("/api/email-campaigns", { method: "POST", body });
      closeModal(); location.hash = "#/campaigns/" + created.data.id;
    };
  }

  async function pageCampaignEditor(id) {
    const item = (await api("/api/email-campaigns/" + id)).data;
    const preview = await api("/api/email-campaigns/" + id + "/preview");
    const audience = await api("/api/email-campaigns/audience?audience=" + encodeURIComponent(item.audience) + (item.leadSource ? "&leadSourceId=" + item.leadSource.id : ""));
    const templates = item.status === "DRAFT" ? ((await api("/api/email-templates")).data || []) : [];
    const sources = item.status === "DRAFT" ? ((await api("/api/leads/sources")).data || []) : [];
    const audiences = item.status === "DRAFT" ? ((await api("/api/email-campaigns/audiences")).data || []) : [];
    let recipients = [];
    try { recipients = (await api("/api/email-campaigns/" + id + "/recipients")).data || []; } catch {}
    view.innerHTML = `
      ${toolbar(item.name, item.status === "DRAFT" ? `<button type="button" class="ghost" id="saveCamp" type="button">Save draft</button><button type="button" class="btn" id="sendBtn" style="width:auto">Broadcast</button>` : "")}
      <div class="kpis">
        ${kpi("Audience", audience.data?.total || item.totalRecipients, item.audience)}
        ${kpi("Sent", item.sentCount)}
        ${kpi("Failed", item.failedCount)}
        ${kpi("Status", item.status)}
      </div>
      <div class="grid-2">
        <section class="card">
          <h2>Campaign</h2>
          ${item.status === "DRAFT" ? `<form id="campForm">
            ${field("Name","name", item.name)}
            ${field("Subject","subject", item.subject)}
            <label>Template<select name="templateId">${templates.map(t => `<option value="${t.id}" ${t.id === item.template?.id ? "selected" : ""}>${escape(t.name)}</option>`).join("")}</select></label>
            <label>Audience<select name="audience">${audiences.map(a => `<option ${a === item.audience ? "selected" : ""}>${a}</option>`).join("")}</select></label>
            <label>Lead source<select name="leadSourceId"><option value=""></option>${sources.map(s => `<option value="${s.id}" ${item.leadSource?.id === s.id ? "selected" : ""}>${escape(s.name)}</option>`).join("")}</select></label>
            <div class="thumbs">${(item.images || []).map(img => `<span><img src="${escape(FM.fileUrl(img.imageUrl))}" alt=""><br><button type="button" class="mini danger" data-camp-img="${img.id}">×</button></span>`).join("")}</div>
            <label>Add image<input id="campFile" type="file"></label>
          </form>` : dl({ Subject: item.subject, Template: item.template?.name, Audience: item.audience, Source: item.leadSource?.name, Created: fmt(item.createdDate) })}
        </section>
        <section class="preview"><iframe id="campPreview" title="Preview"></iframe></section>
      </div>
      <section class="card">
        <h2>Recipients</h2>
        ${table(["Name","Email","Source","Status"], recipients.map(r => `<tr><td>${escape(r.name)}</td><td>${escape(r.email)}</td><td>${pill(r.source || "—")}</td><td>${escape(r.status)}</td></tr>`).join(""))}
      </section>`;
    const frame = $("#campPreview");
    if (frame) frame.srcdoc = preview.data?.html || "";
    const save = $("#saveCamp");
    if (save) save.onclick = async () => {
      const body = Object.fromEntries(new FormData($("#campForm")).entries());
      await api("/api/email-campaigns/" + id, { method: "PUT", body });
      toast("Draft saved");
      pageCampaignEditor(id);
    };
    const send = $("#sendBtn");
    if (send) send.onclick = async () => {
      if (!confirm("Send this campaign to the selected audience?")) return;
      await api("/api/email-campaigns/" + id + "/broadcast", { method: "POST" });
      toast("Broadcast started");
      pageCampaignEditor(id);
    };
    const file = $("#campFile");
    if (file) file.onchange = async ev => {
      if (!ev.target.files[0]) return;
      const fd = new FormData();
      fd.append("file", ev.target.files[0]);
      await api("/api/email-campaigns/" + id + "/images", { method: "POST", form: true, body: fd });
      toast("Image added"); pageCampaignEditor(id);
    };
    view.querySelectorAll("[data-camp-img]").forEach(btn => {
      btn.onclick = async () => {
        await api("/api/email-campaigns/" + id + "/images/" + btn.dataset.campImg, { method: "DELETE" });
        pageCampaignEditor(id);
      };
    });
  }

  const pages = {
    overview: pageOverview,
    leads: pageLeads,
    contacts: pageContacts,
    audits: pageAudits,
    shopbeat: pageShopbeat,
    subscribers: pageSubscribers,
    downloads: pageDownloads,
    applications: pageApplications,
    "freelancer-applications": pageFreelancerApplications,
    news: pageNews,
    events: pageEvents,
    gallery: pageGallery,
    vacancies: pageVacancies,
    freelancers: pageFreelancers,
    banners: pageBanners,
    documents: pageDocuments,
    templates: pageTemplates,
    campaigns: pageCampaigns,
    brands: pageBrands,
    sales: pageSales,
    services: pageServices,
    sources: pageSources,
    feelings: pageFeelings,
    users: pageUsers
  };

  async function route() {
    if (!state.token) return;
    const hash = (location.hash || "#/overview").replace(/^#\/?/, "");
    const [id, extra] = hash.split("/");
    setActive(id || "overview");
    view.innerHTML = `<div class="empty">Loading…</div>`;
    try {
      if (id === "templates" && extra) return await pageTemplateEditor(extra);
      if (id === "campaigns" && extra) return await pageCampaignEditor(extra);
      const page = pages[id] || pageOverview;
      await page();
    } catch (error) {
      view.innerHTML = `<div class="card"><p>${escape(error.message)}</p></div>`;
      toast(error.message, true);
    }
  }

  $("#loginForm").addEventListener("submit", async ev => {
    ev.preventDefault();
    $("#loginError").hidden = true;
    try {
      const body = Object.fromEntries(new FormData(ev.target).entries());
      const res = await FM.request("/api/auth/login", { method: "POST", body });
      signIn(res.data);
    } catch (error) {
      $("#loginError").hidden = false;
      $("#loginError").textContent = error.message;
    }
  });

  $("#logout").onclick = () => signOut();
  $("#menuBtn").onclick = e => { e.stopPropagation(); $("#drawer").classList.toggle("open"); };
  window.addEventListener("hashchange", route);
  document.addEventListener("click", e => {
    if (e.target.closest("#drawer") || e.target.closest("#menuBtn")) return;
    $("#drawer").classList.remove("open");
  });
  window.addEventListener("unhandledrejection", event => {
    const message = event.reason && event.reason.message;
    if (message) toast(message, true);
  });

  if (state.token) {
    state.user = user();
    $("#login").hidden = true;
    $("#shell").hidden = false;
    $("#who").textContent = (state.user?.fullName || "") + " · " + (state.user?.role || "");
    renderNav();
    route();
  }
})();
