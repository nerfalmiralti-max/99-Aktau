import { siteConfig } from "../../config/site.config";

type BrandLogoProps = {
  className?: string;
  withText?: boolean;
};

export function BrandLogo({ className = "", withText = true }: BrandLogoProps) {
  return (
    <span className={`brand-logo ${className}`.trim()}>
      <span className="brand-logo-frame">
        <img
          src={siteConfig.brand.logoSrc}
          srcSet="/android-chrome-192x192.png 192w, /android-chrome-512x512.png 512w, /brand/logo.png 1536w"
          sizes="48px"
          width={1536}
          height={1536}
          alt=""
          decoding="async"
        />
      </span>
      {withText ? <span className="brand-logo-text">{siteConfig.brand.name}</span> : null}
    </span>
  );
}
