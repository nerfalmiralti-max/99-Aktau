import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const config = JSON.parse(await readFile(resolve("seo.config.json"), "utf8"));
const configuredUrl = process.env.SITE_URL?.trim() || config.siteUrl;
const origin = new URL(configuredUrl).origin;

assert.equal(config.pages.length, 5, "SEO config must describe all five public routes");
assert.equal(new Set(config.pages.map((page) => page.path)).size, config.pages.length, "SEO paths must be unique");
assert.equal(new Set(config.pages.map((page) => page.title)).size, config.pages.length, "Page titles must be unique");

for (const page of config.pages) {
  const file = page.path === "/"
    ? resolve("dist/index.html")
    : resolve("dist", page.path.slice(1), "index.html");
  const html = await readFile(file, "utf8");
  const canonical = new URL(page.path, origin).href;
  assert.ok(html.includes(`<title>${page.title}</title>`), `${page.path} title mismatch`);
  assert.ok(html.includes(`content="${page.description}"`), `${page.path} description mismatch`);
  assert.ok(html.includes(`<link rel="canonical" href="${canonical}" />`), `${page.path} canonical mismatch`);
  assert.ok(html.includes(`<meta property="og:url" content="${canonical}" />`), `${page.path} Open Graph URL mismatch`);
}

const homeHtml = await readFile(resolve("dist/index.html"), "utf8");
const jsonLdMatch = homeHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert.ok(jsonLdMatch, "JSON-LD block is missing");
const structuredData = JSON.parse(jsonLdMatch[1]);
assert.equal(structuredData["@context"], "https://schema.org");
assert.ok(JSON.stringify(structuredData).includes(origin), "JSON-LD must use the configured origin");

const sitemap = await readFile(resolve("dist/sitemap.xml"), "utf8");
for (const page of config.pages) {
  assert.ok(sitemap.includes(`<loc>${new URL(page.path, origin).href}</loc>`), `Sitemap misses ${page.path}`);
}

console.log(`SEO output verified for ${config.pages.length} routes at ${origin}`);
