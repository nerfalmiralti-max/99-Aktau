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
      whileHover={{ y: -1, scale: 1.012 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      {...props}
    >
      <span>{children}</span>
      {icon ? <span className="button-icon">{icon}</span> : null}
    </MotionLink>
  );
}
