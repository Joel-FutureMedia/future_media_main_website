import fs from "fs";
import path from "path";

const root = path.resolve(".");
const outDir = path.join(root, "src", "pages");
fs.mkdirSync(outDir, { recursive: true });

const pages = [
  ["index.html", "index.astro", "display", ""],
  ["brands.html", "brands.astro", "display", "brands"],
  ["conferences.html", "conferences.astro", "display", "conf"],
  ["about.html", "about.astro", "text", ""],
  ["advertise.html", "advertise.astro", "text", ""],
  ["audience.html", "audience.astro", "text", ""],
  ["contact.html", "contact.astro", "text", ""],
  ["gallery.html", "gallery.astro", "text", ""],
  ["news.html", "news.astro", "text", ""],
  ["search.html", "search.astro", "text", ""],
  ["team.html", "team.astro", "text", ""],
  ["terms.html", "terms.astro", "text", ""],
  ["vacancies.html", "vacancies.astro", "text", ""]
];

for (const [file, out, fonts, bodyClass] of pages) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const title = html.match(/<title>([\s\S]*?)<\/title>/)[1];
  let body = html.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
  body = body.replace('<div id="hdr"></div>', "").replace('<div id="ftr"></div>', "");
  const scripts = [];
  body = body.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/g, (_, attrs, inner) => {
    scripts.push({ attrs: attrs.trim(), inner });
    return "";
  });
  const extra = scripts.filter(script => !/main\.js/.test(script.attrs));
  const scriptBlock = extra.map(script => {
    const src = script.attrs.replace(/\s*src="/, ' src="');
    return `<script is:inline${src ? " " + src : ""}>${script.inner}</script>`;
  }).join("\n");
  const slot = scriptBlock ? `\n<Fragment slot="scripts">\n${scriptBlock}\n</Fragment>` : "";
  const props = [`title="${title}"`, `fonts="${fonts}"`];
  if (bodyClass) props.push(`bodyClass="${bodyClass}"`);
  const astro = `---\nimport Layout from '../layouts/Layout.astro';\n---\n<Layout ${props.join(" ")}>\n${body.trim()}${slot}\n</Layout>\n`;
  fs.writeFileSync(path.join(outDir, out), astro);
  console.log("wrote", out);
}



//
