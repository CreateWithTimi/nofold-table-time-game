import { createContext, useContext, type ButtonHTMLAttributes } from "react";

export const PendingGameActionContext = createContext(false);

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const pending = useContext(PendingGameActionContext);
  return <button className="game-button primary-action" type="button" {...props} disabled={pending || props.disabled} />;
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const pending = useContext(PendingGameActionContext);
  return <button className="game-button secondary-action" type="button" {...props} disabled={pending || props.disabled} />;
}

export function DangerButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const pending = useContext(PendingGameActionContext);
  return <button className="game-button danger-action" type="button" {...props} disabled={pending || props.disabled} />;
}
