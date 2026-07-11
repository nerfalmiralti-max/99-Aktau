import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const seoConfig = JSON.parse(await readFile(resolve("seo.config.json"), "utf8"));
const configuredUrl = process.env.SITE_URL?.trim() || seoConfig.siteUrl;
const siteUrl = new URL(configuredUrl);

if (siteUrl.protocol !== "https:") {
  throw new Error("SITE_URL must use HTTPS");
}

const origin = siteUrl.origin;
const sourceHtml = await readFile(resolve("dist/index.html"), "utf8");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceMeta(html, attribute, name, content) {
  const pattern = new RegExp(`<meta\\s+${attribute}="${name}"[\\s\\S]*?\\/>`);
  return html.replace(pattern, `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`);
}

function replaceLink(html, rel, href, hreflang) {
  const language = hreflang ? `\\s+hreflang="${hreflang}"` : "";
  const pattern = new RegExp(`<link\\s+rel="${rel}"${language}[\\s\\S]*?\\/>`);
  const languageAttribute = hreflang ? ` hreflang="${hreflang}"` : "";
  return html.replace(pattern, `<link rel="${rel}"${languageAttribute} href="${href}" />`);
}

for (const page of seoConfig.pages) {
  const canonicalUrl = new URL(page.path, origin).href;
  let html = sourceHtml.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`);
  html = replaceMeta(html, "name", "description", page.description);
  html = replaceMeta(html, "property", "og:title", page.title);
  html = replaceMeta(html, "property", "og:description", page.description);
  html = replaceMeta(html, "property", "og:url", canonicalUrl);
  html = replaceMeta(html, "name", "twitter:title", page.title);
  html = replaceMeta(html, "name", "twitter:description", page.description);
  html = replaceLink(html, "canonical", canonicalUrl);
  html = replaceLink(html, "alternate", canonicalUrl, "ru-KZ");
  html = replaceLink(html, "alternate", canonicalUrl, "x-default");

  const outputPath = page.path === "/"
    ? resolve("dist/index.html")
    : resolve("dist", page.path.slice(1), "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf8");
}
