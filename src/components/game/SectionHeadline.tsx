interface SectionHeadlineProps {
  eyebrow?: string;
  title: string;
  copy?: string;
}

export function SectionHeadline({ eyebrow, title, copy }: SectionHeadlineProps) {
  return (
    <div className="section-headline">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {copy ? <p>{copy}</p> : null}
    </div>
  );
}
