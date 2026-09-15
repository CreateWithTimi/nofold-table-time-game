import { PrimaryButton } from "../game/Buttons";

interface HostActionBarProps {
  label: string;
  disabled?: boolean;
  helper?: string;
  onClick: () => void;
}

export function HostActionBar({ label, disabled = false, helper, onClick }: HostActionBarProps) {
  return (
    <div className="host-action-bar">
      <PrimaryButton disabled={disabled} onClick={onClick}>
        {label}
      </PrimaryButton>
      {helper ? <p>{helper}</p> : null}
    </div>
  );
}
