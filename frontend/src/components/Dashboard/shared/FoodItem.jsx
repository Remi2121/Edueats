import { foodImageUrl } from "../../../data/foodImages";
import "./FoodItem.css";

// One food "chip/row/card" look, shared by every screen that shows a food
// (recommendations, food log, food details, mood summary) instead of 4
// near-identical versions of the same image+name pattern.
export default function FoodItem({ name, variant = "row", selected, onClick, meta, trailing }) {
  const img = foodImageUrl(name);
  const className = `food-item food-item-${variant}` + (selected ? " selected" : "");
  const image = img ? (
    <img className="food-item-img" src={img} alt="" loading="lazy" />
  ) : (
    <span className="food-item-img food-item-img-fallback">🍽️</span>
  );
  const content = (
    <>
      {image}
      <span className="food-item-name">
        {name}
        {meta && <small>{meta}</small>}
      </span>
      {trailing}
    </>
  );

  if (!onClick) {
    return <span className={className}>{content}</span>;
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}
