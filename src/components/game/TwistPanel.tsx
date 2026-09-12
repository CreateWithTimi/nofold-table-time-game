interface TwistPanelProps {
  text: string;
}

export function TwistPanel({ text }: TwistPanelProps) {
  return (
    <section className="twist-panel">
      <span>Twist</span>
      <p>{text}</p>
    </section>
  );
}
