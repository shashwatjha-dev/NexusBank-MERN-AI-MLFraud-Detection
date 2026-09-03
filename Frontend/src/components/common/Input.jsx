import { useId } from "react";
import "./Input.css";

export function Input({
  label,
  hint,
  error,
  iconLeft: IconLeft,
  iconRight: IconRight,
  className = "",
  ...rest
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={`field ${error ? "field--error" : ""} ${className}`}>
      {label && <span className="field__label">{label}</span>}
      <span className="field__control">
        {IconLeft && <IconLeft className="field__icon" size={16} />}
        <input id={id} className="field__input" {...rest} />
        {IconRight && <IconRight className="field__icon" size={16} />}
      </span>
      {(hint || error) && (
        <span className={`field__msg ${error ? "field__msg--error" : ""}`}>
          {error || hint}
        </span>
      )}
    </label>
  );
}