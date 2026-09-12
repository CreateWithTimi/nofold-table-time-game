import type { ReactNode } from "react";

interface GameShellProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function GameShell({ children, footer }: GameShellProps) {
  return (
    <div className="game-stage">
      <div className="game-phone">
        <div className="suit-bg" aria-hidden="true">
          ♠ ♥ ♣ ♦
        </div>
        <div className="game-content">{children}</div>
        {footer ? <div className="game-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
