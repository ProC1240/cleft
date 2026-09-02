type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="mb-7">
      <p className="font-mono mb-1.5 text-[0.72rem] uppercase tracking-[0.08em] text-[#6f6791]">{eyebrow}</p>
      <h1 className="font-display text-[1.9rem] font-bold leading-tight tracking-[-0.01em] text-text">{title}</h1>
      <p className="mt-1.5 max-w-[440px] text-[0.94rem] leading-6 text-muted">{description}</p>
    </header>
  );
}
