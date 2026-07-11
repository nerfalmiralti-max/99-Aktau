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
    const canonicalUrl = new URL(page.path, seoConfig.siteUrl).href;

    document.title = page.title;
    setMetaContent('meta[name="description"]', page.description);
    setMetaContent('meta[property="og:title"]', page.title);
    setMetaContent('meta[property="og:description"]', page.description);
    setMetaContent('meta[property="og:url"]', canonicalUrl);
    setMetaContent('meta[name="twitter:title"]', page.title);
    setMetaContent('meta[name="twitter:description"]', page.description);
    document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", canonicalUrl);
    document.querySelectorAll<HTMLLinkElement>('link[rel="alternate"]').forEach((link) => {
      link.setAttribute("href", canonicalUrl);
    });
  }, [pathname]);

  return null;
}
