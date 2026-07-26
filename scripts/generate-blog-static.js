// Prerenders /blog and /blog/<slug> as static HTML into dist/ at build time.
// The SPA still owns those routes for client-side nav; these files exist so
// crawlers, LinkedIn unfurlers, and JS-disabled visitors see real content.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const SITE_URL = "https://swapnil.one";
const SOCIAL = {
  linkedin: "https://www.linkedin.com/in/swapnil2233/",
  x: "https://x.com/Swapnil2233",
  github: "https://github.com/swapy-27",
  opensre: "https://opensre.in",
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseBlogPosts() {
  const file = readFileSync("src/data/blogPosts.ts", "utf-8");
  const re =
    /\{\s*slug:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*date:\s*"([^"]+)",\s*description:\s*"([^"]+)",\s*content:\s*`([\s\S]*?)`,\s*linkedinUrl:\s*([^,]+),\s*tags:\s*\[([^\]]*)\]/g;
  const posts = [];
  let m;
  while ((m = re.exec(file)) !== null) {
    const [, slug, title, date, description, content, linkedinRaw, tagsRaw] = m;
    const linkedinUrl =
      linkedinRaw.trim() === "undefined"
        ? null
        : linkedinRaw.trim().replace(/^"|"$/g, "");
    const tags = [...tagsRaw.matchAll(/"([^"]+)"/g)].map((t) => t[1]);
    posts.push({ slug, title, date, description, content, linkedinUrl, tags });
  }
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const sharedStyles = `
  :root { --accent: #b08eff; --bg: #0a0612; --fg: #eae5ec; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    line-height: 1.6;
  }
  a { color: var(--accent); }
  .container { max-width: 800px; margin: 0 auto; padding: 80px 24px 60px; }
  .back-link { display: inline-block; color: var(--accent); text-decoration: none; font-size: 14px; opacity: 0.8; margin-bottom: 24px; }
  .back-link:hover { opacity: 1; }
  header.page-header h1 { font-size: 48px; font-weight: 400; text-transform: uppercase; margin: 0 0 16px; letter-spacing: 0.02em; }
  header.page-header p { opacity: 0.6; font-size: 16px; margin: 0 0 60px; }
  .post-card { display: block; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 32px 0; color: inherit; text-decoration: none; transition: opacity 0.2s; }
  .post-card:hover { opacity: 0.85; }
  .post-card h2 { font-size: 24px; font-weight: 500; margin: 0 0 8px; }
  .post-date { font-size: 14px; opacity: 0.5; margin: 0 0 12px; }
  .post-excerpt { font-size: 16px; opacity: 0.75; margin: 0 0 12px; }
  .tags { display: flex; gap: 8px; flex-wrap: wrap; }
  .tag { font-size: 12px; padding: 4px 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: var(--accent); opacity: 0.8; }
  article h1 { font-size: 36px; font-weight: 500; margin: 0 0 16px; }
  article .meta { font-size: 14px; opacity: 0.5; margin-bottom: 40px; }
  article .content { font-size: 17px; line-height: 1.8; }
  article .content h3 { font-size: 22px; font-weight: 500; margin: 32px 0 16px; }
  article .content p { margin: 0 0 16px; }
  article .content ul { margin: 0 0 16px; padding-left: 24px; }
  article .content li { margin-bottom: 8px; }
  article .content pre { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 16px; overflow-x: auto; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  article .content code { background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
  .linkedin-link { display: inline-block; margin-top: 40px; padding: 12px 24px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: var(--accent); text-decoration: none; font-size: 14px; }
  .linkedin-link:hover { border-color: var(--accent); }
  footer.site-footer { max-width: 800px; margin: 80px auto 0; padding: 32px 24px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-wrap: wrap; gap: 16px 24px; font-size: 14px; opacity: 0.7; }
  footer.site-footer a { color: var(--fg); text-decoration: none; }
  footer.site-footer a:hover { color: var(--accent); }
  @media (max-width: 768px) {
    .container { padding: 60px 20px 40px; }
    header.page-header h1 { font-size: 32px; }
    .post-card h2 { font-size: 20px; }
    article h1 { font-size: 28px; }
    article .content { font-size: 16px; }
  }
`;

function siteFooter() {
  return `
  <footer class="site-footer">
    <a href="${SITE_URL}/">Home</a>
    <a href="${SITE_URL}/blog">Blog</a>
    <a href="${SOCIAL.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
    <a href="${SOCIAL.x}" target="_blank" rel="noopener">X</a>
    <a href="${SOCIAL.github}" target="_blank" rel="noopener">GitHub</a>
    <a href="${SOCIAL.opensre}" target="_blank" rel="noopener">OpenSRE</a>
  </footer>`;
}

function buildIndexHtml(posts) {
  const cards = posts
    .map((p) => `
      <a class="post-card" href="${SITE_URL}/blog/${p.slug}">
        <h2>${escapeHtml(p.title)}</h2>
        <p class="post-date">${formatDate(p.date)}</p>
        <p class="post-excerpt">${escapeHtml(p.description)}</p>
        <div class="tags">${p.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      </a>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Blog — Swapnil Jain</title>
<meta name="description" content="Thoughts by Swapnil Jain on distributed systems, streaming, big data, agentic AI, and cloud platforms." />
<link rel="canonical" href="${SITE_URL}/blog" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${SITE_URL}/blog" />
<meta property="og:title" content="Blog — Swapnil Jain" />
<meta property="og:description" content="Thoughts by Swapnil Jain on distributed systems, streaming, big data, agentic AI, and cloud platforms." />
<meta property="og:image" content="${SITE_URL}/og-image.svg" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Blog — Swapnil Jain" />
<meta name="twitter:description" content="Thoughts by Swapnil Jain on distributed systems, streaming, big data, agentic AI, and cloud platforms." />
<meta name="twitter:image" content="${SITE_URL}/og-image.svg" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>${sharedStyles}</style>
</head>
<body>
<main class="container">
  <a class="back-link" href="${SITE_URL}/">&larr; Back to Portfolio</a>
  <header class="page-header">
    <h1>Blog</h1>
    <p>Thoughts on distributed systems, streaming, big data, agentic AI, and cloud platforms.</p>
  </header>
  <section>${cards}</section>
</main>
${siteFooter()}
</body>
</html>
`;
}

function buildPostHtml(post) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const plain = post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plain.split(/\s+/).filter(Boolean).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    keywords: post.tags.join(", "),
    inLanguage: "en",
    url,
    wordCount,
    articleBody: plain.slice(0, 500),
    author: { "@type": "Person", name: "Swapnil Jain", url: SITE_URL },
    publisher: { "@type": "Person", name: "Swapnil Jain" },
    mainEntityOfPage: url,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(post.title)} — Swapnil Jain</title>
<meta name="description" content="${escapeHtml(post.description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${escapeHtml(post.title)}" />
<meta property="og:description" content="${escapeHtml(post.description)}" />
<meta property="og:image" content="${SITE_URL}/og-image.svg" />
<meta property="article:published_time" content="${post.date}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(post.title)}" />
<meta name="twitter:description" content="${escapeHtml(post.description)}" />
<meta name="twitter:image" content="${SITE_URL}/og-image.svg" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>${sharedStyles}</style>
</head>
<body>
<main class="container">
  <a class="back-link" href="${SITE_URL}/blog">&larr; Back to Blog</a>
  <article>
    <h1>${escapeHtml(post.title)}</h1>
    <div class="meta">
      ${formatDate(post.date)}
      <div class="tags" style="margin-top:12px">${post.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
    </div>
    <div class="content">${post.content}</div>
    ${post.linkedinUrl ? `<a class="linkedin-link" href="${post.linkedinUrl}" target="_blank" rel="noopener">Originally posted on LinkedIn &rarr;</a>` : ""}
  </article>
</main>
${siteFooter()}
</body>
</html>
`;
}

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

const distRoot = "dist";
if (!existsSync(distRoot)) {
  console.error(`generate-blog-static: ${distRoot}/ not found — run vite build first.`);
  process.exit(1);
}

const posts = parseBlogPosts();
if (posts.length === 0) {
  console.error("generate-blog-static: parsed 0 posts from src/data/blogPosts.ts — check the regex.");
  process.exit(1);
}

const blogDir = join(distRoot, "blog");
ensureDir(blogDir);
writeFileSync(join(blogDir, "index.html"), buildIndexHtml(posts));

for (const post of posts) {
  const dir = join(blogDir, post.slug);
  ensureDir(dir);
  writeFileSync(join(dir, "index.html"), buildPostHtml(post));
}

console.log(`generate-blog-static: wrote ${posts.length} posts + index to ${blogDir}/`);
