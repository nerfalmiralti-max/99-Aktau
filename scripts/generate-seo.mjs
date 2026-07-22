import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const seoConfig = JSON.parse(await readFile(resolve("seo.config.json"), "utf8"));
const configuredUrl = process.env.SITE_URL?.trim() || seoConfig.siteUrl;
const siteUrl = new URL(configuredUrl);

if (siteUrl.protocol !== "https:") {
  throw new Error("SITE_URL must use HTTPS");
}

siteUrl.pathname = "";
siteUrl.search = "";
siteUrl.hash = "";
const origin = siteUrl.origin;
const publicDirectory = resolve("public");

const robots = [
  "User-agent: *",
  "Allow: /",
  "",
  `Host: ${origin}`,
  `Sitemap: ${origin}/sitemap.xml`,
  "",
].join("\n");

const sitemapEntries = seoConfig.pages.map(({ path, changeFrequency, priority }) => `  <url>
    <loc>${new URL(path, origin).href}</loc>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
  </url>`).join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</urlset>
`;

await mkdir(publicDirectory, { recursive: true });
await Promise.all([
  writeFile(resolve(publicDirectory, "robots.txt"), robots, "utf8"),
  writeFile(resolve(publicDirectory, "sitemap.xml"), sitemap, "utf8"),
]);
