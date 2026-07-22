import { motion, useReducedMotion } from "framer-motion";
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
  const shouldReduceMotion = useReducedMotion();
  return (
    <MotionLink
      className={`button button-${variant} ${className}`.trim()}
      to={to}
      whileHover={shouldReduceMotion ? undefined : { y: -1, scale: 1.01 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
      {...props}
    >
      <span>{children}</span>
      {icon ? <span className="button-icon">{icon}</span> : null}
    </MotionLink>
  );
}
