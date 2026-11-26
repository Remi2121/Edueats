// Campus canteen prices (in Sri Lankan Rupees / LKR) and trilingual names
// (English, Tamil, Sinhala) for foods in the USDA dataset, tailored for
// Sri Lankan university students (University of Jaffna / Sri Lanka context).

export const FOOD_METADATA = {
  "Banana": {
    ta: "வாழைப்பழம்",
    si: "කෙසෙල්",
    price: 50,
    benefit: {
      en: "High Potassium & Magnesium (27mg) relieves fatigue and calms nerves.",
      ta: "அதிக பொட்டாசியம் மற்றும் மெக்னீசியம் சோர்வை நீக்கி நரம்புகளை அமைதிப்படுத்துகிறது.",
      si: "පොටෑසියම් සහ මැග්නීසියම් මගින් මානසික තෙහෙට්ටුව සමනය කරයි.",
    },
    badge: "Mg 27mg",
  },
  "Almonds": {
    ta: "பாதாம்",
    si: "ආමන්ඩ්",
    price: 120,
    benefit: {
      en: "Rich in Vitamin B6 and healthy fats for sustained memory and focus.",
      ta: "வைட்டமின் B6 மற்றும் ஆரோக்கியமான கொழுப்பு ஞாபக சக்தியை பல மணிநேரம் நிலைநிறுத்துகிறது.",
      si: "විටමින් B6 සහ මේදය දීර්ඝ කාලීන මොළයේ ශක්තිය ලබා දෙයි.",
    },
    badge: "Vit B 0.15mg",
  },
  "Apple": {
    ta: "ஆப்பிள்",
    si: "ඇපල්",
    price: 90,
    benefit: {
      en: "85% clean hydration and natural fructose keep alertness sharp during study.",
      ta: "85% தூய நீர்ச்சத்து உடலுக்கு புத்துணர்ச்சியையும் விழிப்புணர்வையும் தருகிறது.",
      si: "85% සජලනය සහ ස්වභාවික ග්ලූකෝස් මගින් ප්‍රබෝධය ලබා දෙයි.",
    },
    badge: "Water 86ml",
  },
  "Green Apple": {
    ta: "பச்சை ஆப்பிள்",
    si: "ඇපල්",
    price: 90,
    benefit: {
      en: "Clean hydration with natural flavonoids for sustained attention.",
      ta: "இயற்கையான ஆன்டி-ஆக்ஸிடன்ட்கள் தூக்கமின்மையைத் தவிர்க்க உதவுகிறது.",
      si: "ප්‍රතිඔක්සිකාරක මගින් නිදිමත ගතිය දුරු කරයි.",
    },
    badge: "Water 86ml",
  },
  "Spinach": {
    ta: "கீரை",
    si: "නිවිති",
    price: 45,
    benefit: {
      en: "Dense Iron and Magnesium enhance oxygen delivery to brain cells.",
      ta: "இரும்புச்சத்து மற்றும் மெக்னீசியம் மூளை செல்களுக்கு ஆக்ஸிஜனை விரைவாகக் கொண்டு சேர்க்கிறது.",
      si: "යකඩ සහ මැග්නීසියම් මගින් මොළයට ඔක්සිජන් සැපයුම වැඩි කරයි.",
    },
    badge: "High Mg & Iron",
  },
  "Egg, boiled": {
    ta: "முட்டை",
    si: "තම්බන ලද බිත්තර",
    price: 70,
    benefit: {
      en: "Choline and high-quality protein prevent hunger distraction.",
      ta: "கோலின் மற்றும் புரதம் படிக்கும் போது பசி கவனச்சிதறல் ஏற்படாமல் தடுக்கிறது.",
      si: "ප්‍රෝටීන් මගින් පාඩම් කරන අතරතුර බඩගින්න නිසා ඇතිවන බාධා වළක්වයි.",
    },
    badge: "Protein 6.3g",
  },
  "Plain yogurt": {
    ta: "தயிர்",
    si: "යෝගට්",
    price: 85,
    benefit: {
      en: "Probiotics and low fat provide steady energy without a sugar crash.",
      ta: "குறைந்த கொழுப்பு மற்றும் சீரான குளுக்கோஸ் விரிவுரைகளின் போது மயக்கம் வருவதைத் தடுக்கிறது.",
      si: "අඩු මේදය දේශන අතරතුර නිදිමත වැලැක්වීමට උපකාරී වේ.",
    },
    badge: "Fat ≤ 1.2g",
  },
  "Whole wheat bread": {
    ta: "முழு கோதுமை ரொட்டி",
    si: "තිරිඟු පාන්",
    price: 60,
    benefit: {
      en: "Complex carbohydrates stabilize blood glucose during stressful sessions.",
      ta: "சிக்கலான கார்போஹைட்ரேட்டுகள் மன அழுத்தத்தின் போது இரத்த சர்க்கரையை சீராக்குகிறது.",
      si: "සංකීර්ණ කාබෝහයිඩ්රේට මගින් රුධිර සීනි මට්ටම පාලනය කරයි.",
    },
    badge: "Fiber & Carbs",
  },
  "Oats": {
    ta: "ஓட்ஸ்",
    si: "ඕට්ස්",
    price: 80,
    benefit: {
      en: "Slow-digesting beta-glucans fuel mental endurance across long study hours.",
      ta: "பீட்டா-குளூக்கன் நீண்ட நேரம் படிக்கும் போது மூளைக்கு தொடர்ச்சியான ஆற்றலை அளிக்கிறது.",
      si: "දීර්ඝ අධ්‍යයන වේලාවන්හිදී මානසික විඳදරාගැනීම පවත්වා ගනී.",
    },
    badge: "Steady Glucose",
  },
  "Orange": {
    ta: "ஆரஞ்சு",
    si: "දොඩම්",
    price: 75,
    benefit: {
      en: "High Vitamin C combats cortisol and mental oxidative stress.",
      ta: "வைட்டமின் C மன அழுத்த ஹார்மோனைக் குறைத்து மனதை அமைதிப்படுத்துகிறது.",
      si: "විටමින් C මානසික ආතතිය අඩු කිරීමට උපකාරී වේ.",
    },
    badge: "Vit C 53mg",
  },
  "Cheddar cheese": {
    ta: "சீஸ்",
    si: "චීස්",
    price: 110,
    benefit: {
      en: "Calcium and dense calories sustain concentration during intense focus.",
      ta: "கால்சியம் மற்றும் சத்துக்கள் தீவிர படிப்பின் போது கவனத்தை ஒருமுகப்படுத்துகிறது.",
      si: "කැල්සියම් සහ කැලරි මගින් අවධානය රඳවා ගැනීමට උපකාරී වේ.",
    },
    badge: "Calcium 721mg",
  },
  "Brown rice": {
    ta: "சிவப்பு அரிசி",
    si: "රතු කැකුළු බත්",
    price: 65,
    benefit: {
      en: "Low glycemic index sustained energy ideal for lunch study sessions.",
      ta: "குறைந்த கிளைசெமிக் குறியீடு மதியப் படிப்பின் போது தூக்கத்தை வரவழைக்காது.",
      si: "අඩු ග්ලයිසමික් අගය දිවා කාලයේ අධ්‍යයනයට ශක්තිය සපයයි.",
    },
    badge: "Low Glycemic",
  },
  "Watermelon": {
    ta: "தர்பூசணி",
    si: "පැණි කොමඩු",
    price: 55,
    benefit: {
      en: "91% water content rapidly restores hydration during warm campus days.",
      ta: "91% நீர்ச்சத்து வெயில் நாட்களில் உடலையும் மூளையையும் உடனடியாக குளிர்விக்கிறது.",
      si: "91% ජල ප්‍රමාණය සජලනය ඉක්මනින් යථා තත්ත්වයට පත් කරයි.",
    },
    badge: "Water 91ml",
  },
  "Carrot": {
    ta: "கேரட்",
    si: "කැරට්",
    price: 40,
    benefit: {
      en: "Beta-carotene and clean crunch relieve screen-time eye strain.",
      ta: "பீட்டா-கரோட்டின் கம்ப்யூட்டர் திரையைப் பார்த்து ஏற்படும் கண் சோர்வை நீக்குகிறது.",
      si: "බීටා-කැරොටින් ඇස් වෙහෙස වීම අඩු කිරීමට උපකාරී වේ.",
    },
    badge: "Beta-Carotene",
  },
  "Cucumber": {
    ta: "வெள்ளரிக்காய்",
    si: "පිපිඤ්ඤා",
    price: 35,
    benefit: {
      en: "Crisp cooling hydration with zero sugar spike.",
      ta: "சர்க்கரை அளவு அதிகரிக்காமல் உடலை புத்துணர்ச்சியுடன் வைத்திருக்கிறது.",
      si: "සීනි මට්ටම වැඩි නොවී ශරීරය සිසිල් කරයි.",
    },
    badge: "Hydration 95%",
  },
  "Popcorn": {
    ta: "பாப்கார்ன்",
    si: "පොප්කෝන්",
    price: 50,
    benefit: {
      en: "Light whole-grain snack for stress-free chewing during problem-solving.",
      ta: "கணக்குகள் போடும் போது சோர்வை நீக்கும் லேசான முழு தானிய சிற்றுண்டி.",
      si: "ගැටලු විසඳන අතරතුර පහසු සැහැල්ලු කෙටි ආහාරයකි.",
    },
    badge: "Light Snack",
  },
  "Whole milk": {
    ta: "பால்",
    si: "නැවුම් කිරි",
    price: 90,
    benefit: {
      en: "Tryptophan and Magnesium promote calmness during study anxiety.",
      ta: "ட்ரிப்டோபான் மற்றும் மெக்னீசியம் தேர்வு பயம் மற்றும் பதட்டத்தைத் தணிக்கிறது.",
      si: "විභාග කාංසාව අතරතුර මනස සන්සුන් කරයි.",
    },
    badge: "Magnesium 24mg",
  },
};

// Real Tamil/Sinhala names + estimated LKR prices for all 93 foods, loaded
// once from the backend (which reads them straight from the nutrition CSV -
// see ml/build_nutrition_dataset.py's LOCAL_INFO). This replaces an earlier
// version of this file that invented a price from the food name's character
// codes for any food outside the 17 hand-written entries above - that was a
// fabricated number with no real source, which this project treats as a bug
// (see the real-data-sources rule), not a style choice.
const API_BASE = "http://localhost:3000";
let fullCatalog = {};
let catalogLoadPromise = null;

export function loadFoodCatalog() {
  if (!catalogLoadPromise) {
    catalogLoadPromise = fetch(`${API_BASE}/api/foods/full`)
      .then((res) => res.json())
      .then((foods) => {
        fullCatalog = {};
        foods.forEach((f) => {
          fullCatalog[f.food_name] = f;
        });
      })
      .catch(() => {
        // Backend unreachable - callers below already handle a missing
        // catalog entry gracefully (no fabricated fallback value).
      });
  }
  return catalogLoadPromise;
}

// Generic price and translation fallbacks for any of the 93 USDA foods
export function getFoodPrice(foodName) {
  const meta = FOOD_METADATA[foodName];
  if (meta && meta.price) return meta.price;
  return fullCatalog[foodName]?.price_lkr ?? null;
}

export function getFoodTranslations(foodName) {
  const meta = FOOD_METADATA[foodName];
  const real = fullCatalog[foodName];
  return {
    en: foodName,
    ta: meta?.ta || real?.tamil_name || foodName,
    si: meta?.si || real?.sinhala_name || foodName,
  };
}

export function getFoodBadge(foodName) {
  return FOOD_METADATA[foodName]?.badge || "USDA Nutrient";
}

export function getFoodBenefit(foodName, lang = "en") {
  const meta = FOOD_METADATA[foodName];
  if (meta && meta.benefit && meta.benefit[lang]) {
    return meta.benefit[lang];
  }
  return meta?.benefit?.en || "Nutrient-dense whole food matched to your mood by the rule engine.";
}
