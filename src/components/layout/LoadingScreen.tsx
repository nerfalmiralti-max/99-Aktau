import { motion } from "framer-motion";
import { siteConfig } from "../../config/site.config";
import { BrandLogo } from "../brand/BrandLogo";

export function LoadingScreen() {
  return (
    <motion.div
      className="loading-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.015 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      role="status"
      aria-label={`${siteConfig.brand.name} загружается`}
    >
      <motion.div
        className="loading-screen-inner"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <BrandLogo className="loading-logo" withText={false} />
        <span>{siteConfig.brand.name}</span>
      </motion.div>
    </motion.div>
  );
}
