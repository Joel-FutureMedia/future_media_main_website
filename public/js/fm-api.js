window.FM = (function () {
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const base = local ? "http://localhost:8980" : (window.FM_API_BASE || "https://futuremediaapi.simplyfound.com.na");

  async function request(path, options = {}) {
    const headers = Object.assign({}, options.headers || {});
    const token = options.token || localStorage.getItem("fm_admin_token");
    if (token) headers.Authorization = "Bearer " + token;
    if (!options.form && options.body && typeof options.body !== "string") {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(base + path, {
      method: options.method || "GET",
      headers,
      body: options.form
        ? options.body
        : options.body && typeof options.body !== "string"
          ? JSON.stringify(options.body)
          : options.body
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
    if (!response.ok || data.success === false) {
      const error = new Error(data.message || "Request failed");
      error.status = response.status;
      error.payload = data;
      throw error;
    }
    return data;
  }

  function fileUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return base.replace(/\/$/, "") + "/" + String(path).replace(/^\/+/, "");
  }

  return { base, request, fileUrl };
})();
