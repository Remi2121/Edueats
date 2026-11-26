import { useEffect, useState } from "react";
import { foodImageUrl } from "../../../data/foodImages";
import { getFoodPrice, getFoodTranslations, getFoodBadge, getFoodBenefit, loadFoodCatalog } from "../../../data/foodMetadata";
import { t } from "../../../data/i18n";
import "./Overview.css";

// This card is a compact snapshot, not a full list — a mood with no
// nutrient rule (Neutral/Surprise) can legitimately match all 93 real
// foods, so only a small highlight set is shown here. The full real list
// is still available on the My Nutrition page.
const SNAPSHOT_FOOD_COUNT = 4;

export default function RecommendationCard({ snacks, onNavigate, lang = "en" }) {
  // The real catalog (Tamil/Sinhala names + LKR prices for all 93 foods)
  // loads once from the backend - re-render once it's ready so foods
  // outside the 17 hand-written entries above show their real name/price
  // instead of nothing.
  const [, setCatalogReady] = useState(false);
  useEffect(() => {
    loadFoodCatalog().then(() => setCatalogReady(true));
  }, []);

  const top = snacks.slice(0, SNAPSHOT_FOOD_COUNT);
  return (
    <div className="dash-card recommendation-card">
      <div className="card-head">
        <div>
          <h2 className="heading-font">{t("inspirationHeading", lang)}</h2>
          <p className="section-label" style={{ margin: 0 }}>{t("inspirationSub", lang)}</p>
        </div>
        <span className="pill">{t("recommendedPill", lang)}</span>
      </div>

      <div className="food-banner">
        <div>
          <strong>{top.join(" + ") || "Check in to get a suggestion"}</strong>
          <p>{t("matchedRuleSub", lang)}</p>
          <div className="recommendation-tags">
            <span className="recommendation-tag">{t("boostConcentration", lang)}</span>
            <span className="recommendation-tag">{t("reducesTiredness", lang)}</span>
            <span className="recommendation-tag" style={{ background: "rgba(16, 185, 129, 0.12)", borderColor: "rgba(16, 185, 129, 0.3)" }}>
              🏷️ {t("canteenBadge", lang)}
            </span>
          </div>
        </div>
        <div className="recommendation-foods">
          {top.map((food) => (
            foodImageUrl(food) ? (
              <img key={food} className="recommendation-food-img" src={foodImageUrl(food)} alt={food} loading="lazy" />
            ) : (
              <span key={food} className="recommendation-food-img recommendation-food-img-fallback">🍽️</span>
            )
          ))}
        </div>
      </div>

      {/* Modern Trilingual & Canteen Pricing Cards Grid */}
      <div className="modern-food-grid">
        {top.map((food) => {
          const trans = getFoodTranslations(food);
          const price = getFoodPrice(food);
          const badge = getFoodBadge(food);
          const benefit = getFoodBenefit(food, lang);
          const displayName = lang === "ta" ? trans.ta : (lang === "si" ? trans.si : trans.en);
          const subtitle = lang === "en"
            ? `${trans.ta} • ${trans.si}`
            : (lang === "ta" ? `${trans.en} • ${trans.si}` : `${trans.en} • ${trans.ta}`);

          return (
            <div key={food} className="modern-food-card">
              <div>
                <div className="modern-food-top">
                  <div className="modern-food-img-wrap">
                    {foodImageUrl(food) ? (
                      <img className="modern-food-thumb" src={foodImageUrl(food)} alt={food} loading="lazy" />
                    ) : (
                      <span style={{ fontSize: "1.4rem" }}>🍽️</span>
                    )}
                  </div>
                  <span className="modern-food-price">{price != null ? `Rs. ${price}` : "—"}</span>
                </div>
                <div className="modern-food-name">{displayName}</div>
                <div className="modern-food-trilingual">{subtitle}</div>
                <div className="modern-food-benefit">{benefit}</div>
              </div>
              <span className="modern-food-badge">{badge}</span>
            </div>
          );
        })}
      </div>

      {onNavigate && (
        <button className="text-link" type="button" onClick={() => onNavigate("nutrition")} style={{ marginTop: "14px" }}>
          {t("exploreNutrition", lang)}
        </button>
      )}
    </div>
  );
}
