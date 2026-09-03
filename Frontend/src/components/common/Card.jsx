import "./Card.css";

export function Card({ as: Tag = "section", elevated = false, className = "", children, ...rest }) {
  return (
    <Tag className={`card ${elevated ? "card--elevated" : ""} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, eyebrow, action }) {
  return (
    <header className="card__header">
      <div className="stack">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h3>{title}</h3>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}