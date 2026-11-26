import { useState, useEffect } from "react";
import { foodImageUrl } from "../../../data/foodImages";
import { MOODS } from "../../../data/moods";
import { t } from "../../../data/i18n";
import "./MoodToNutrientFlow.css";

// The real scientific mapping from FER-2013 moods to nutrient rules (from rule_engine.py
// and proposal Section 5.4). Strictly uses the project's verified rules and USDA medians.
export const MOOD_PIPELINE_RULES = {
  sad: {
    ruleName: "Magnesium + Vitamin B Synthesis",
    reason: "Fatigue & low mood correlate with depleted cellular magnesium and neurotransmitter strain.",
    nutrients: [
      { name: "Magnesium", target: "High (≥ 21.0 mg)", badge: "magnesium_mg" },
      { name: "Vitamin B", target: "High (≥ 0.15 mg)", badge: "vitamin_b_mg" },
    ],
    fallbackFoods: ["Almonds", "Banana", "Oats", "Spinach"],
  },
  angry: {
    ruleName: "Glucose Spike Stabilization",
    reason: "Adrenaline spikes trigger rapid blood sugar fluctuations; complex carbs and low sugar stabilize mood.",
    nutrients: [
      { name: "Sugar", target: "Low (≤ 3.2 g)", badge: "sugar_g" },
      { name: "Calories", target: "High (≥ 160 kcal)", badge: "calories" },
    ],
    fallbackFoods: ["Whole wheat bread", "Cheddar cheese", "Brown rice", "Lentils"],
  },
  fear: {
    ruleName: "Cortisol Regulation & Nerve Calming",
    reason: "Acute stress and anxiety rapidly consume intracellular magnesium reserves.",
    nutrients: [
      { name: "Magnesium", target: "High (≥ 21.0 mg)", badge: "magnesium_mg" },
    ],
    fallbackFoods: ["Almonds", "Spinach", "Whole milk", "Pumpkin seeds"],
  },
  happy: {
    ruleName: "Hydration & Sustained Energy",
    reason: "Maintains optimal positive cognitive focus with clean hydration and light, healthy fats.",
    nutrients: [
      { name: "Water", target: "High (≥ 84.0 ml)", badge: "water_ml" },
      { name: "Fat", target: "Low (≤ 1.2 g)", badge: "fat_g" },
    ],
    fallbackFoods: ["Apple", "Plain yogurt", "Carrot", "Watermelon"],
  },
  disgust: {
    ruleName: "Gentle Digestive Balance",
    reason: "Mild sensory or physical aversion requires light, non-fat, easily digestible nourishment.",
    nutrients: [
      { name: "Fat", target: "Low (≤ 1.2 g)", badge: "fat_g" },
      { name: "Calories", target: "Low (≤ 80 kcal)", badge: "calories" },
    ],
    fallbackFoods: ["Popcorn", "Egg, boiled", "Watermelon", "Cucumber"],
  },
  neutral: {
    ruleName: "Balanced Cognitive Baseline",
    reason: "Baseline study state sustaining regular glucose; all healthy database foods eligible.",
    nutrients: [
      { name: "All Nutrients", target: "Balanced Baseline", badge: "balanced" },
    ],
    fallbackFoods: ["Almonds", "Whole wheat bread", "Orange", "Plain yogurt"],
  },
  surprise: {
    ruleName: "Cognitive Arousal Refuel",
    reason: "Acute cognitive stimulation benefits from quick-absorbing, balanced nutrient fuel.",
    nutrients: [
      { name: "All Nutrients", target: "Cognitive Baseline", badge: "balanced" },
    ],
    fallbackFoods: ["Oats", "Grapes", "Cheddar cheese", "Banana"],
  },
};

export default function MoodToNutrientFlow({ currentMood, currentFoods = [], lang = "en" }) {
  const moodName = typeof currentMood === "string" ? currentMood : currentMood?.name;
  const initialKey = moodName ? moodName.toLowerCase() : "happy";
  const [selectedMoodKey, setSelectedMoodKey] = useState(initialKey);

  useEffect(() => {
    if (moodName) {
      setSelectedMoodKey(moodName.toLowerCase());
    }
  }, [moodName]);

  const activeMoodMeta =
    MOODS.find((m) => m.name.toLowerCase() === selectedMoodKey) || MOODS[0];
  const activeRule =
    MOOD_PIPELINE_RULES[selectedMoodKey] || MOOD_PIPELINE_RULES.happy;

  // Uses live foods if matching active mood, otherwise the verified fallback dataset foods
  const displayFoods =
    selectedMoodKey === moodName?.toLowerCase() && currentFoods.length > 0
      ? currentFoods.slice(0, 3)
      : activeRule.fallbackFoods.slice(0, 3);

  return (
    <div className="mood-pipeline-container">
      <div className="pipeline-header">
        <span className="pipeline-tag">{t("pipelineTag", lang)}</span>
        <span className="pipeline-status">{t("pipelineLive", lang)}</span>
      </div>

      {/* 3-Stage Interactive Flowchart */}
      <div className="pipeline-flow-grid">
        {/* STAGE 1: Emotion Input */}
        <div className="pipeline-stage-card stage-input">
          <div className="stage-eyebrow">{t("stage1Title", lang)}</div>
          <div className="stage-main-badge" style={{ background: activeMoodMeta.bg, color: activeMoodMeta.ink }}>
            <span className="stage-emoji" aria-hidden="true">{activeMoodMeta.emoji}</span>
            <div>
              <div className="stage-title">{activeMoodMeta.name}</div>
              <div className="stage-sub">{t("stage1Sub", lang)}: {activeMoodMeta.valence > 0 ? `+${activeMoodMeta.valence}` : activeMoodMeta.valence}</div>
            </div>
          </div>
          <p className="stage-caption">{t("stage1Caption", lang)}</p>
        </div>

        {/* Connector Arrow 1 */}
        <div className="pipeline-connector" aria-hidden="true">
          <span className="connector-line" />
          <span className="connector-arrow">→</span>
        </div>

        {/* STAGE 2: Rule Engine Logic */}
        <div className="pipeline-stage-card stage-rules">
          <div className="stage-eyebrow">{t("stage2Title", lang)}</div>
          <div className="rule-title">{activeRule.ruleName}</div>
          <div className="nutrient-target-pills">
            {activeRule.nutrients.map((n) => (
              <span key={n.name} className="nutrient-target-pill">
                <span className="pill-dot" />
                <b>{n.name}:</b> {n.target}
              </span>
            ))}
          </div>
          <p className="rule-reason-text">{activeRule.reason}</p>
        </div>

        {/* Connector Arrow 2 */}
        <div className="pipeline-connector" aria-hidden="true">
          <span className="connector-line" />
          <span className="connector-arrow">→</span>
        </div>

        {/* STAGE 3: USDA Food Match */}
        <div className="pipeline-stage-card stage-output">
          <div className="stage-eyebrow">{t("stage3Title", lang)}</div>
          <div className="pipeline-food-row">
            {displayFoods.map((food) => (
              <div key={food} className="pipeline-food-chip" title={food}>
                {foodImageUrl(food) ? (
                  <img src={foodImageUrl(food)} alt={food} className="pipeline-food-img" loading="lazy" />
                ) : (
                  <span className="pipeline-food-img-fallback">🍽️</span>
                )}
                <span className="pipeline-food-name">{food}</span>
              </div>
            ))}
          </div>
          <p className="stage-caption">{t("stage3Caption", lang)}</p>
        </div>
      </div>

      {/* Interactive Mood Switcher for Live Demo/Testing */}
      <div className="pipeline-interactive-bar">
        <span className="interactive-label">{t("demoTesterLabel", lang)}</span>
        <div className="mood-chip-group">
          {MOODS.map((m) => {
            const isSelected = m.name.toLowerCase() === selectedMoodKey;
            return (
              <button
                key={m.name}
                type="button"
                className={`pipeline-mood-btn ${isSelected ? "selected" : ""}`}
                style={isSelected ? { background: m.bg, color: m.ink, borderColor: m.ink } : {}}
                onClick={() => setSelectedMoodKey(m.name.toLowerCase())}
                title={`Simulate ${m.name} check-in`}
              >
                {m.emoji} {m.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
