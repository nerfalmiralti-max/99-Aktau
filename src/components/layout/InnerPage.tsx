import type { ReactNode } from "react";
import { SectionHeader } from "../ui/SectionHeader";

type InnerPageProps = {
  children: ReactNode;
  className: string;
  eyebrow: string;
  id: string;
  text: string;
  title: string;
};

export function InnerPage({
  children,
  className,
  eyebrow,
  id,
  text,
  title,
}: InnerPageProps) {
  return (
    <section className={`section page-section ${className}`} id={id}>
      <header className="page-header">
        <div className="container">
          <SectionHeader eyebrow={eyebrow} title={title} text={text} />
        </div>
      </header>
      <div className="page-content">
        <div className="container">{children}</div>
      </div>
    </section>
  );
}
