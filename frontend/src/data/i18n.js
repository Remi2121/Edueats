// Real internationalization dictionary for EduEats
// Supports English (en), Tamil (ta), and Sinhala (si) - tailored for Sri Lankan
// higher education students (University of Jaffna / Engineering faculty).

export const LANG_STORAGE_KEY = "edueats_language";

export function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "ta" || saved === "si" || saved === "en") return saved;
  } catch {
    // fallback
  }
  return "en";
}

export function saveLanguage(lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export const TRANSLATIONS = {
  en: {
    // Brand
    brandName: "EduEats",
    brandTagline: "Student Nutrition & Focus",
    navHeader: "Student Workspace",

    // Nav Items
    navDashboard: "Dashboard",
    navStudySession: "Study Session",
    navNutrition: "My Nutrition",
    navMoodFocus: "Mood & Focus",
    navProgress: "My Progress",
    navSettings: "Settings",
    logout: "Log out",

    // Growth note
    growthTitle: "🌱 Daily growth",
    growthDesc: "Small healthy choices can make every study session better.",

    // Topbar
    greeting: "Hi, {name}! 👋",
    dateSub: "University of Jaffna · Faculty of Engineering (22/ENG/008)",
    dailyTargetLabel: "Daily Study Target",

    // Stat Row
    statMoodLabel: "Current Mood",
    statStudyLabel: "Today's Study Time",
    statNutritionLabel: "Nutrition",
    statLiveBadge: "● Live",
    statOnTrack: "● On Track",
    statNeedsAttention: "● Needs Attention",
    statMinutesSuffix: "min",

    // Overview Recommendation Card
    inspirationHeading: "Today's Food Inspiration",
    inspirationSub: "Fuel your focus with the right food",
    recommendedPill: "✨ Recommended",
    matchedRuleSub: "Matched to your current mood by the real rule engine.",
    canteenBadge: "Campus Canteen Ready",
    exploreNutrition: "Explore nutrition →",
    boostConcentration: "💡 Boosts concentration",
    reducesTiredness: "⚡ Reduces tiredness",
    pricePrefix: "Rs.",

    // Quick Actions & Summary
    quickActionsHeading: "Quick Actions",
    startStudy: "Start Study Session",
    logFood: "Log What You Ate",
    studySummaryHeading: "Study's Summary",
  },

  ta: {
    // Brand
    brandName: "EduEats",
    brandTagline: "ஊட்டச்சத்து & கவனம்",
    navHeader: "மாணவர் பணியிடம்",

    // Nav Items
    navDashboard: "Dashboard",
    navStudySession: "Study Session",
    navNutrition: "My Nutrition",
    navMoodFocus: "Mood & Focus",
    navProgress: "My Progress",
    navSettings: "Settings",
    logout: "வெளியேறு (Log out)",

    // Growth note
    growthTitle: "🌱 தினசரி வளர்ச்சி",
    growthDesc: "சிறு ஆரோக்கியமான தேர்வுகள் ஒவ்வொரு படிப்பு நேரத்தையும் சிறப்பாக்கும்.",

    // Topbar
    greeting: "வணக்கம், {name}! 👋",
    dateSub: "யாழ்ப்பாணப் பல்கலைக்கழகம் · பொறியியல் பீடம் (22/ENG/008)",
    dailyTargetLabel: "தினசரி படிப்பு இலக்கு",

    // Stat Row
    statMoodLabel: "Current Mood",
    statStudyLabel: "Today's Study Time",
    statNutritionLabel: "Nutrition",
    statLiveBadge: "● Live",
    statOnTrack: "● சரியான நிலை",
    statNeedsAttention: "● கவனம் தேவை",
    statMinutesSuffix: "நிமிடம்",

    // Overview Recommendation Card
    inspirationHeading: "Today's Food Inspiration",
    inspirationSub: "சரியான உணவுடன் உங்கள் கவனத்தை ஒருமுகப்படுத்துங்கள்",
    recommendedPill: "✨ பரிந்துரைக்கப்பட்டது",
    matchedRuleSub: "AI மற்றும் ஊட்டச்சத்து விதிகளின்படி உங்கள் மனநிலைக்குப் பொருத்தப்பட்டது.",
    canteenBadge: "கேன்டீன் விலைகள்",
    exploreNutrition: "Explore nutrition →",
    boostConcentration: "💡 கவனத்தை அதிகரிக்கிறது",
    reducesTiredness: "⚡ சோர்வைக் குறைக்கிறது",
    pricePrefix: "ரூ.",

    // Quick Actions & Summary
    quickActionsHeading: "விரைவுச் செயல்பாடுகள்",
    startStudy: "படிப்பு நேரத்தைத் தொடங்கு",
    logFood: "உணவை பதிவு செய்",
    studySummaryHeading: "படிப்புச் சுருக்கம்",
  },

  si: {
    // Brand
    brandName: "EduEats",
    brandTagline: "පෝෂණය සහ අවධානය",
    navHeader: "ශිෂ්‍ය වැඩබිම",

    // Nav Items
    navDashboard: "Dashboard",
    navStudySession: "Study Session",
    navNutrition: "My Nutrition",
    navMoodFocus: "Mood & Focus",
    navProgress: "My Progress",
    navSettings: "Settings",
    logout: "ඉවත් වන්න (Log out)",

    // Growth note
    growthTitle: "🌱 දෛනික පුරුදු",
    growthDesc: "කුඩා සෞඛ්‍ය සම්පන්න තේරීම් මඟින් ඔබේ පාඩම් සැසිය සාර්ථක කර ගත හැක.",

    // Topbar
    greeting: "ආයුබෝවන්, {name}! 👋",
    dateSub: "යාපනය විශ්වවිද්‍යාලය · ඉංජිනේරු පීඨය (22/ENG/008)",
    dailyTargetLabel: "දෛනික අධ්‍යයන ඉලක්කය",

    // Stat Row
    statMoodLabel: "Current Mood",
    statStudyLabel: "Today's Study Time",
    statNutritionLabel: "Nutrition",
    statLiveBadge: "● Live",
    statOnTrack: "● යහපත් මට්ටමක",
    statNeedsAttention: "● අවධානය අවශ්‍යයි",
    statMinutesSuffix: "මිනිත්තු",

    // Overview Recommendation Card
    inspirationHeading: "Today's Food Inspiration",
    inspirationSub: "නිවැරදි ආහාර සමඟ ඔබේ අවධානය ඉහළ නංවන්න",
    recommendedPill: "✨ නිර්දේශිතයි",
    matchedRuleSub: "AI පද්ධතිය මගින් ඔබගේ මනෝභාවයට ගැලපෙන ආහාර.",
    canteenBadge: "කැන්ටින් මිල ගණන්",
    exploreNutrition: "Explore nutrition →",
    boostConcentration: "💡 අවධානය වැඩි කරයි",
    reducesTiredness: "⚡ තෙහෙට්ටුව අඩු කරයි",
    pricePrefix: "රු.",

    // Quick Actions & Summary
    quickActionsHeading: "ක්ෂණික ක්‍රියා",
    startStudy: "අධ්‍යයන සැසිය අරඹන්න",
    logFood: "ආහාර සටහන් කරන්න",
    studySummaryHeading: "අධ්‍යයන සාරාංශය",
  },
};

export function t(key, lang = "en", params = {}) {
  const langDict = TRANSLATIONS[lang] || TRANSLATIONS.en;
  let text = langDict[key] || TRANSLATIONS.en[key] || key;
  Object.keys(params).forEach((p) => {
    text = text.replace(new RegExp(`\\{${p}\\}`, "g"), params[p]);
  });
  return text;
}
