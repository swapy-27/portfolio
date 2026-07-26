// Generates the portfolio-only sitemap at build time.
import { writeFileSync } from "fs";

const today = new Date().toISOString().slice(0, 10);

const urls = [
  `  <url>
    <loc>https://swapnil.one</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`,
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

writeFileSync("public/sitemap.xml", sitemap);
console.log("Sitemap generated for the portfolio home page.");
