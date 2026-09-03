import { AlertTriangle } from "lucide-react";
import "./States.css";

export function ErrorState({ title = "Something went wrong.", description, onRetry }) {
  return (
    <div className="state state--error">
      <AlertTriangle size={28} className="state__icon" />
      <h3 className="state__title">{title}</h3>
      {description && <p className="state__body">{description}</p>}
      {onRetry && (
        <button className="state__retry" onClick={onRetry} type="button">
          Try again
        </button>
      )}
    </div>
  );
}