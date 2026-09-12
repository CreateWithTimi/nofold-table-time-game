interface ScenarioPanelProps {
  label?: string;
  text: string;
}

export function ScenarioPanel({ label = "Scenario", text }: ScenarioPanelProps) {
  return (
    <section className="scenario-panel">
      <span>{label}</span>
      <p>{text}</p>
    </section>
  );
}
