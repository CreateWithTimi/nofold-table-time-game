interface ResultScoreProps {
  title: string;
  delta: number;
  copy: string;
}

export function ResultScore({ title, delta, copy }: ResultScoreProps) {
  const sign = delta > 0 ? "+" : "";

  return (
    <section className="result-score">
      <p>{title}</p>
      <strong>{sign}{delta}</strong>
      <span>{copy}</span>
    </section>
  );
}
