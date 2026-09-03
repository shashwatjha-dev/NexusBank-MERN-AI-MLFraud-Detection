import "./Skeleton.css";
export const Skeleton = ({ width = "100%", height = 16, radius = 6, style }) => (
  <span className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />
);