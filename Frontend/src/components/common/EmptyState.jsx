import "./States.css";

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="state">
      {Icon && <Icon size={28} className="state__icon" />}
      <h3 className="state__title">{title}</h3>
      {description && <p className="state__body">{description}</p>}
      {action && <div className="state__action">{action}</div>}
    </div>
  );
}