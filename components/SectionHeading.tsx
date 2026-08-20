interface SectionHeadingProps {
  as?: 'h2' | 'h3';
  title: string;
  description?: string;
}

export function SectionHeading({ as: Tag = 'h2', title, description }: SectionHeadingProps) {
  return (
    <>
      <Tag className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">{title}</Tag>
      {description && <p className="text-xs text-stone-500 mb-2">{description}</p>}
    </>
  );
}
