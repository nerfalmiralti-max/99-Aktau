import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import seoConfig from "../../../seo.config.json";

function normalizePath(pathname: string) {
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

function setMetaContent(selector: string, content: string) {
  document.querySelector<HTMLMetaElement>(selector)?.setAttribute("content", content);
}

export function PageMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const normalizedPath = normalizePath(pathname);
    const page = seoConfig.pages.find((item) => item.path === normalizedPath) ?? seoConfig.pages[0];
    const staticCanonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    const origin = new URL(staticCanonical || seoConfig.siteUrl).origin;
    const canonicalUrl = new URL(page.path, origin).href;
    const socialImageUrl = new URL("/brand/logo.png", origin).href;

    document.title = page.title;
    setMetaContent('meta[name="description"]', page.description);
    setMetaContent('meta[property="og:title"]', page.title);
    setMetaContent('meta[property="og:description"]', page.description);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[property="og:image"]', socialImageUrl);
    setMetaContent('meta[property="og:image:secure_url"]', socialImageUrl);
    setMetaContent('meta[name="twitter:title"]', page.title);
    setMetaContent('meta[name="twitter:description"]', page.description);
    setMetaContent('meta[name="twitter:image"]', socialImageUrl);
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
    document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"]').forEach((link) => {
      link.setAttribute("href", canonicalUrl);
    });
    const structuredData = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    if (structuredData?.textContent) {
      structuredData.textContent = structuredData.textContent.replaceAll(seoConfig.siteUrl, origin);
    }
  }, [pathname]);

  return null;
}
