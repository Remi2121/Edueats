import { useEffect, useState } from "react";
import { foodImageUrl } from "../../../data/foodImages";
import { getFoodPrice, getFoodTranslations, loadFoodCatalog } from "../../../data/foodMetadata";
import CardHead from "../shared/CardHead";
import "./Overview.css";
import "../ClassSessionCard/ClassSessionCard.css"; // reuses .mood-illustration-small / .mood-pill

// Compact "latest mood + top matched foods" snapshot, matching the
// reference mockup's Mood & food check-in panel. The full real list (all
// matched foods, search, categories) lives on My Nutrition — this is just
// the dashboard preview.
export default function MoodFoodCheckCard({ latestMood, snacks, onNavigate }) {
  const [, setCatalogReady] = useState(false);
  useEffect(() => {
    loadFoodCatalog().then(() => setCatalogReady(true));
  }, []);

  const top = snacks.slice(0, 2);

  return (
    <div className="dash-card">
      <CardHead icon="💚" title="Mood & food check-in" sub="Your latest wellbeing snapshot" />
      <div className="mood-check-summary">
        <div className="mood-illustration-small" style={{ background: latestMood.bg }} aria-hidden="true">
          {latestMood.emoji}
        </div>
        <div>
          <span className="mood-pill" style={{ background: latestMood.bg, color: latestMood.ink }}>
            {latestMood.emoji} {latestMood.name}
          </span>
          <p className="cam-caption" style={{ textAlign: "left", margin: "6px 0 0" }}>
            {latestMood.concerning
              ? "A nourishing snack and a short reset break may help."
              : "A light, balanced option can support a steady study rhythm."}
          </p>
        </div>
      </div>

      {top.length > 0 && (
        <div className="mood-check-foods">
          {top.map((food) => {
            const trans = getFoodTranslations(food);
            const price = getFoodPrice(food);
            return (
              <div className="mood-check-food-row" key={food}>
                <div className="mood-check-food-thumb">
                  {foodImageUrl(food) ? <img src={foodImageUrl(food)} alt="" loading="lazy" /> : <span>🍽️</span>}
                </div>
                <div className="mood-check-food-copy">
                  <b>{food}</b>
                  <small>{trans.ta} · {trans.si}</small>
                </div>
                <span className="mood-check-food-price">{price != null ? `Rs. ${price}` : "—"}</span>
              </div>
            );
          })}
        </div>
      )}

      <button className="text-link" type="button" onClick={() => onNavigate("nutrition")}>
        Explore all food suggestions →
      </button>
    </div>
  );
}
