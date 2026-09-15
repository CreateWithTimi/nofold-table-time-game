interface NicknameFieldProps {
  label?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function NicknameField({
  label = "Your nickname",
  value,
  placeholder = "Timi",
  onChange,
}: NicknameFieldProps) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        maxLength={18}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
