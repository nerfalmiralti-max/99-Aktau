import { siteConfig } from "../../config/site.config";

type BrandLogoProps = {
  className?: string;
  withText?: boolean;
};

export function BrandLogo({ className = "", withText = true }: BrandLogoProps) {
  return (
    <span className={`brand-logo ${className}`.trim()}>
      <span className="brand-logo-frame">
        <img src={siteConfig.brand.logoSrc} alt="" decoding="async" />
      </span>
      {withText ? <span className="brand-logo-text">{siteConfig.brand.name}</span> : null}
    </span>
  );
}
