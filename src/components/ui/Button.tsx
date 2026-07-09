import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonLinkProps = Omit<HTMLMotionProps<"a">, "children"> & {
  children: ReactNode;
  icon?: ReactNode;
  variant?: ButtonVariant;
};

export function ButtonLink({
  children,
  className = "",
  icon,
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <motion.a
      className={`button button-${variant} ${className}`.trim()}
      whileHover={{ y: -2, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      {...props}
    >
      <span>{children}</span>
      {icon ? <span className="button-icon">{icon}</span> : null}
    </motion.a>
  );
}
