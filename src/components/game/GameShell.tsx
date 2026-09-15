import type { ReactNode } from "react";

interface GameShellProps {
  children: ReactNode;
  footer?: ReactNode;
  variant?: "game" | "onboarding";
}

export function GameShell({ children, footer, variant = "game" }: GameShellProps) {
  return (
    <div className="game-stage">
      <div className={`game-phone ${variant === "onboarding" ? "onboarding-shell" : ""}`}>
        <div className="suit-bg" aria-hidden="true">
          ♠ ♥ ♣ ♦
        </div>
        <div className="game-content">{children}</div>
        {footer ? <div className="game-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
