import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const DEFAULT_SITE_URL = "https://99-aktau.vercel.app";
const configuredUrl = process.env.SITE_URL?.trim() || DEFAULT_SITE_URL;
const siteUrl = new URL(configuredUrl);

if (siteUrl.protocol !== "https:") {
  throw new Error("SITE_URL must use HTTPS");
}

siteUrl.pathname = "";
siteUrl.search = "";
siteUrl.hash = "";
const origin = siteUrl.origin;
const publicDirectory = resolve("public");
const lastModified = new Date().toISOString().slice(0, 10);

const routes = [
  { path: "/", changeFrequency: "weekly", priority: "1.0" },
];

const robots = [
  "User-agent: *",
  "Allow: /",
  "",
  `Host: ${origin}`,
  `Sitemap: ${origin}/sitemap.xml`,
  "",
].join("\n");

const sitemapEntries = routes.map(({ path, changeFrequency, priority }) => `  <url>
    <loc>${new URL(path, origin).href}</loc>
    <lastmod>${lastModified}</lastmod>
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
