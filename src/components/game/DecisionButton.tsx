import type { ReactNode } from "react";

interface DecisionButtonProps {
  title: string;
  copy: string;
  children?: ReactNode;
  variant?: "call" | "fold";
  onClick: () => void;
}

export function DecisionButton({ title, copy, children, variant = "call", onClick }: DecisionButtonProps) {
  return (
    <button className={`decision-button ${variant}`} type="button" onClick={onClick}>
      <strong>{title}</strong>
      <span>{copy}</span>
      {children ? <em>{children}</em> : null}
    </button>
  );
}
