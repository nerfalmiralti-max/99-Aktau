import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { Link, type To } from "react-router-dom";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonLinkProps = Omit<HTMLMotionProps<"a">, "children" | "href"> & {
  children: ReactNode;
  icon?: ReactNode;
  to: To;
  variant?: ButtonVariant;
};

const MotionLink = motion.create(Link);

export function ButtonLink({
  children,
  className = "",
  icon,
  to,
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <MotionLink
      className={`button button-${variant} ${className}`.trim()}
      to={to}
      whileHover={{ y: -2, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      {...props}
    >
      <span>{children}</span>
      {icon ? <span className="button-icon">{icon}</span> : null}
    </MotionLink>
  );
}
