import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getBlogPostBySlug } from "../../data/blogPosts";
import "../styles/Blog.css";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!post) return;

    document.title = `${post.title} — Swapnil Jain`;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    const canonicalUrl = `https://swapnil.one/blog/${post.slug}`;

    setMeta("name", "description", post.description);
    setLink("canonical", canonicalUrl);
    setMeta("property", "og:type", "article");
    setMeta("property", "og:title", post.title);
    setMeta("property", "og:description", post.description);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "article:published_time", post.date);

    const div = document.createElement("div");
    div.innerHTML = post.content;
    const plainText = div.textContent || "";

    const existingLd = document.getElementById("blog-jsonld");
    if (existingLd) existingLd.remove();

    const script = document.createElement("script");
    script.id = "blog-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      keywords: post.tags.join(", "),
      inLanguage: "en",
      url: canonicalUrl,
      wordCount: plainText.split(/\s+/).length,
      articleBody: plainText.slice(0, 500),
      author: {
        "@type": "Person",
        name: "Swapnil Jain",
        url: "https://swapnil.one",
      },
      publisher: {
        "@type": "Person",
        name: "Swapnil Jain",
      },
      mainEntityOfPage: canonicalUrl,
    });
    document.head.appendChild(script);

    return () => {
      document.title = "Swapnil Jain — Software Engineer";
      const el = document.getElementById("blog-jsonld");
      if (el) el.remove();
      document.querySelector('meta[property="article:published_time"]')?.remove();
      setMeta("name", "description", "Swapnil Jain builds high-throughput distributed systems, agentic AI systems, and cloud infrastructure.");
      setLink("canonical", "https://swapnil.one");
      setMeta("property", "og:type", "website");
      setMeta("property", "og:title", "Swapnil Jain — Software Engineer");
      setMeta("property", "og:description", "High-throughput distributed systems, streaming pipelines, agentic AI, and cloud infrastructure.");
      setMeta("property", "og:url", "https://swapnil.one");
    };
  }, [post, slug]);

  if (!post) {
    return (
      <div className="blog-container">
        <Link to="/blog" className="blog-back-link">
          &larr; Back to Blog
        </Link>
        <h1>Post not found</h1>
      </div>
    );
  }

  return (
    <div className="blog-container">
      <Link to="/blog" className="blog-back-link">
        &larr; Back to Blog
      </Link>
      <article className="blog-post-full">
        <h1>{post.title}</h1>
        <div className="blog-post-meta">
          {new Date(post.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          <div className="blog-post-tags" style={{ marginTop: "12px" }}>
            {post.tags.map((tag) => (
              <span key={tag} className="blog-post-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div
          className="blog-post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
        {post.linkedinUrl && (
          <a
            href={post.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="blog-linkedin-link"
          >
            Originally posted on LinkedIn &rarr;
          </a>
        )}
      </article>
    </div>
  );
};

export default BlogPostPage;
