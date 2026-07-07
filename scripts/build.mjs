import { mkdir, rm, writeFile, cp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { site, categories } from "../src/site.mjs";
import { articles } from "../src/articles.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");
const articleUrl = (article) => `/posts/${article.slug}/`;
const categoryUrl = (slug) => `/category/${slug}/`;
const absoluteUrl = (path) => new URL(path, site.domain).toString();

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

async function writePage(path, html) {
  const dir = join(dist, path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), html, "utf8");
}

function renderAd(comment = "[plus-liferoom-middle]") {
  return `<div class="ad-block">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsenseClient}"
     crossorigin="anonymous"></script>
<!-- ${comment} -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="${site.adsenseClient}"
     data-ad-slot="${site.adsenseSlot}"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
     (adsbygoogle = window.adsbygoogle || []).push({});
</script></div>`;
}

function renderCtas(article) {
  return `<div class="cta-stack">${article.ctas
    .map((cta) => `<a href="${esc(cta.url)}" rel="noopener">${esc(cta.label)}</a>`)
    .join("")}</div>`;
}

function renderQuickCheck(article) {
  const target = article.ctas?.[0]?.url;
  if (!target) return "";
  return `<div class="cta-stack cta-stack-bottom"><a href="${esc(target)}" rel="noopener">바로확인하기</a></div>`;
}

function prepareArticleHtml(article) {
  const cleaned = article.html
    .replaceAll("{{CTA_BUTTONS}}", "")
    .replaceAll("{{MIDDLE_AD}}", "");
  return cleaned.replace(/(<h2\b[\s\S]*?<\/h2>)/i, `$1${renderAd("[plus-liferoom-middle]")}`);
}

function layout({ title, description, path, body, type = "website", jsonLd = "" }) {
  const url = absoluteUrl(path);
  const pageTitle = title === site.name ? title : `${title} | ${site.name}`;
  return `<!DOCTYPE html>
<html lang="ko-KR" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large">
<link rel="canonical" href="${esc(url)}">
<meta property="og:locale" content="ko_KR">
<meta property="og:type" content="${type === "article" ? "article" : "website"}">
<meta property="og:title" content="${esc(pageTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(pageTitle)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="preconnect" href="https://pagead2.googlesyndication.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Inter:500,400,700&display=fallback">
<link rel="stylesheet" href="/assets/styles.css?v=${site.assetVersion}">
<script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsenseClient}"></script>
${jsonLd}
</head>
<body>
<div class="site">
  <main class="site-content">
    ${body}
  </main>
  <footer class="site-footer">
    <div class="footer-inner">
      <p>저작권 &copy; 2026<br>※ 해당 웹사이트는 정보 전달을 목적으로 운영하고 있으며, 금융 상품 판매 및 중개의 목적이 아닌 정보만 전달합니다. 조회, 신청 및 다운로드와 같은 편의 서비스에 관한 내용은 관련 처리기관 홈페이지를 참고하시기 바랍니다.</p>
    </div>
  </footer>
</div>
</body>
</html>`;
}

function renderArticle(article) {
  const category = categories[article.category];
  const jsonLd = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Person", "Organization"],
        "@id": `${site.domain}/#person`,
        name: site.name
      },
      {
        "@type": "WebSite",
        "@id": `${site.domain}/#website`,
        url: site.domain,
        name: site.name,
        publisher: { "@id": `${site.domain}/#person` },
        inLanguage: "ko-KR"
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${absoluteUrl(articleUrl(article))}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, item: { "@id": site.domain, name: "Home" } },
          { "@type": "ListItem", position: 2, item: { "@id": absoluteUrl(categoryUrl(article.category)), name: category.name } },
          { "@type": "ListItem", position: 3, item: { "@id": absoluteUrl(articleUrl(article)), name: article.title } }
        ]
      },
      {
        "@type": "BlogPosting",
        headline: article.title,
        datePublished: `${article.publishedAt}T00:00:00+09:00`,
        dateModified: `${article.modifiedAt}T00:00:00+09:00`,
        articleSection: category.name,
        author: { "@type": "Person", name: article.author },
        publisher: { "@id": `${site.domain}/#person` },
        description: article.description,
        name: article.title,
        "@id": `${absoluteUrl(articleUrl(article))}#richSnippet`,
        isPartOf: { "@id": `${absoluteUrl(articleUrl(article))}#webpage` },
        inLanguage: "ko-KR",
        mainEntityOfPage: { "@id": `${absoluteUrl(articleUrl(article))}#webpage` }
      }
    ]
  })}</script>`;
  const bodyHtml = prepareArticleHtml(article);

  const body = `<div class="container">
  <article class="article-card">
    <header class="entry-header">
      <h1 class="entry-title">${esc(article.title)}</h1>
      <div class="entry-meta">
        <img class="avatar" alt="" src="https://secure.gravatar.com/avatar/869f0011c6e5c60b2508ca40df2e025a6628a35be167620280cc13225fe8506d?s=40&amp;d=mm&amp;r=g" width="40" height="40">
        <span>글쓴이 ${esc(article.author)} / ${esc(article.publishedAt)}</span>
      </div>
      <p class="entry-description">${esc(article.description)}</p>
      ${renderCtas(article)}
    </header>
    <div class="entry-content">${renderAd("[plus-liferoom-middle]")}${bodyHtml}${renderQuickCheck(article)}</div>
  </article>
</div>
<nav class="post-navigation" aria-label="게시물">
  <div class="nav-links">
    <div class="nav-previous"><a href="/"><span>이전</span><p>라이프룸 플러스 최신 정보 보기</p></a></div>
  </div>
</nav>`;

  return layout({
    title: article.title,
    description: article.description,
    path: articleUrl(article),
    body,
    type: "article",
    jsonLd
  });
}

function renderHome() {
  const body = `<section class="home-hero">
  <div class="container">
    <h1>${esc(site.name)}</h1>
    <p>${esc(site.description)}</p>
  </div>
</section>
<section class="container post-list">
  ${articles
    .map((article) => `<a class="post-item" href="${articleUrl(article)}"><strong>${esc(article.title)}</strong><span>${esc(article.description)}</span></a>`)
    .join("")}
</section>`;
  return layout({ title: site.name, description: site.description, path: "/", body });
}

function renderCategory(slug) {
  const category = categories[slug];
  const items = articles.filter((article) => article.category === slug);
  const body = `<section class="home-hero">
  <div class="container">
    <h1>${esc(category.name)}</h1>
    <p>${esc(category.description)}</p>
  </div>
</section>
<section class="container post-list">
  ${items
    .map((article) => `<a class="post-item" href="${articleUrl(article)}"><strong>${esc(article.title)}</strong><span>${esc(article.description)}</span></a>`)
    .join("")}
</section>`;
  return layout({ title: `${category.name} 정보`, description: category.description, path: categoryUrl(slug), body });
}

function sitemap() {
  const urls = [
    "/",
    ...Object.keys(categories).map(categoryUrl),
    ...articles.map(articleUrl)
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${absoluteUrl(url)}</loc></url>`).join("\n")}
</urlset>`;
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await cp(join(root, "public"), dist, { recursive: true });
  await writePage("", renderHome());
  await Promise.all(Object.keys(categories).map((slug) => writePage(`category/${slug}`, renderCategory(slug))));
  await Promise.all(articles.map((article) => writePage(`posts/${article.slug}`, renderArticle(article))));
  await writeFile(join(dist, "sitemap.xml"), sitemap(), "utf8");
  await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl("/sitemap.xml")}\n`, "utf8");
  await writeFile(join(dist, "ads.txt"), `google.com, pub-3935732085325115, DIRECT, f08c47fec0942fa0\n`, "utf8");
  await writeFile(join(dist, "_headers"), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`, "utf8");
  console.log(`Built ${articles.length} article(s) into ${dist}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
