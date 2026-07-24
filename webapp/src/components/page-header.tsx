import { Reveal } from "@/components/reveal";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <Reveal>
      <div className="mb-8 max-w-2xl">
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</span>
        )}
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {children && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{children}</p>}
      </div>
    </Reveal>
  );
}
