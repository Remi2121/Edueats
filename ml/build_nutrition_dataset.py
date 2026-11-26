"""
Builds data/nutrition_dataset.csv from real USDA FoodData Central files.

Source data (not in git - download instructions in EduEats README/progress log):
  ../datasets/usda_sr_legacy/   <- unzipped FoodData_Central_sr_legacy_food_csv_2018-04.zip
  ../datasets/usda_foundation/  <- unzipped FoodData_Central_foundation_food_csv_2026-04-30.zip
Both downloaded from https://fdc.nal.usda.gov/download-datasets.html

Re-run this any time to rebuild the CSV (e.g. after changing TARGET_FOODS below).
"""

import csv
import glob
import os
import re

SR_LEGACY_DIR = glob.glob("../datasets/usda_sr_legacy/FoodData_Central_sr_legacy_food_csv_*")[0]
FOUNDATION_DIR = glob.glob("../datasets/usda_foundation/FoodData_Central_foundation_food_csv_*")[0]
OUTPUT_PATH = "data/nutrition_dataset.csv"

# USDA's classic nutrient reference numbers (nutrient_nbr column in nutrient.csv).
# Each is a list of candidates in priority order - SR Legacy always uses the first
# ("208" for Energy), but Foundation Foods records sometimes only report Energy
# under "957" (Atwater General Factors) instead of plain "208", so fall back to
# that rather than silently writing 0.0 for foods that do have real data.
NUTRIENT_NBRS = {
    "calories": ["208", "957", "958"],
    "fat_g": ["204"],
    "sugar_g": ["269"],
    "water_ml": ["255"],
    "magnesium_mg": ["304"],
    "vitamin_b_mg": ["415"],  # Vitamin B-6
}

# (output food name, required keywords - all must appear, preferred keywords - boost score,
#  avoid keywords - hard exclude if present)
TARGET_FOODS = [
    ("Watermelon", ["watermelon", "raw"], [], ["juice", "drink"]),
    ("Cantaloupe", ["cantaloupe", "raw"], [], []),
    ("Honeydew melon", ["melons", "honeydew", "raw"], [], []),
    ("Orange", ["oranges", "raw"], ["navel", "all", "common"], ["juice", "peel"]),
    ("Grapefruit", ["grapefruit", "raw"], ["pink", "red"], ["juice"]),
    ("Strawberries", ["strawberries", "raw"], [], []),
    ("Pineapple", ["pineapple", "raw"], [], ["juice", "canned"]),
    ("Peach", ["peaches", "raw"], [], ["canned", "juice"]),
    ("Pear", ["pears", "raw"], [], ["canned", "juice"]),
    ("Apple", ["apples", "raw", "skin"], [], ["juice", "sauce"]),
    ("Banana", ["bananas", "raw"], [], ["dehydrated", "powder", "chips"]),
    ("Grapes", ["grapes", "raw"], ["red", "seedless"], ["juice", "canned"]),
    ("Kiwifruit", ["kiwifruit", "raw"], [], []),
    ("Mango", ["mango", "raw"], [], ["dried", "juice"]),
    ("Cherries", ["cherries", "sweet", "raw"], [], ["canned", "juice"]),
    ("Blueberries", ["blueberries", "raw"], [], ["canned", "dried"]),
    ("Raspberries", ["raspberries", "raw"], [], []),
    ("Papaya", ["papayas", "raw"], [], []),
    ("Coconut water", ["coconut water"], [], []),
    ("Lettuce", ["lettuce", "romaine", "raw"], [], []),
    ("Cabbage", ["cabbage", "raw"], ["green"], []),
    ("Celery", ["celery", "raw"], [], []),
    ("Zucchini", ["zucchini", "raw"], [], []),
    ("Cauliflower", ["cauliflower", "raw"], [], []),
    ("Broccoli", ["broccoli", "raw"], [], []),
    ("Spinach", ["spinach", "raw"], [], []),
    ("Kale", ["kale", "raw"], [], []),
    ("Carrot", ["carrots", "raw"], [], ["baby", "canned", "juice"]),
    ("Tomato", ["tomatoes", "red", "ripe", "raw"], [], ["canned", "sauce", "juice", "sun-dried"]),
    ("Bell pepper", ["peppers", "sweet", "red", "raw"], [], []),
    ("Cucumber", ["cucumber", "peel", "raw"], [], []),
    ("Radish", ["radishes", "raw"], [], []),
    ("Asparagus", ["asparagus", "raw"], [], ["canned"]),
    ("Green beans", ["beans", "snap", "green", "raw"], [], ["canned"]),
    ("Sweet potato", ["sweet potato", "baked"], [], []),
    ("Potato", ["potatoes", "baked", "flesh"], [], ["chips", "fried"]),
    ("Sweet corn", ["corn", "sweet", "yellow", "cooked"], [], ["candy"]),
    ("Mushroom", ["mushrooms", "white", "raw"], [], []),
    ("Onion", ["onions", "raw"], [], []),
    ("Beet", ["beets", "raw"], [], ["canned"]),
    ("Brussels sprouts", ["brussels sprouts", "raw"], [], []),
    ("Collard greens", ["collards", "raw"], [], []),
    ("White rice, cooked", ["rice", "white", "cooked"], ["long-grain"], []),
    ("Brown rice, cooked", ["rice", "brown", "cooked"], ["long-grain"], []),
    ("Oats", ["oats"], [], ["quaker", "post", "cereals", "granola", "bar", "gatorade"]),
    ("Whole wheat bread", ["bread", "whole-wheat"], [], []),
    ("White bread", ["bread", "white"], [], []),
    ("Pasta, cooked", ["macaroni", "cooked"], ["enriched"], []),
    ("Quinoa, cooked", ["quinoa", "cooked"], [], []),
    ("Barley, cooked", ["barley", "pearled", "cooked"], [], []),
    ("Whole milk", ["milk", "whole", "3.25"], [], []),
    ("Skim milk", ["milk", "nonfat", "skim"], [], []),
    ("Greek yogurt", ["yogurt", "greek", "plain"], [], []),
    ("Plain yogurt", ["yogurt", "plain"], ["whole milk"], ["greek"]),
    ("Cheddar cheese", ["cheese", "cheddar"], [], []),
    ("Mozzarella cheese", ["cheese", "mozzarella"], ["low moisture"], []),
    ("Parmesan cheese", ["cheese", "parmesan"], ["grated"], []),
    ("Feta cheese", ["cheese", "feta"], [], []),
    ("Cottage cheese", ["cottage cheese"], [], []),
    ("Chicken breast, roasted", ["chicken", "breast", "roasted"], [], ["roll"]),
    ("Chicken thigh, roasted", ["chicken", "thigh", "roasted"], [], ["skin"]),
    ("Turkey breast, roasted", ["turkey", "breast", "roasted"], [], []),
    ("Lean ground beef, cooked", ["beef", "ground", "cooked"], ["90%", "85%"], []),
    ("Pork loin, roasted", ["pork", "loin", "roasted"], [], []),
    ("Salmon, cooked", ["salmon", "cooked"], ["atlantic"], []),
    ("Tuna, canned", ["tuna", "canned", "water"], [], []),
    ("Shrimp, cooked", ["shrimp", "cooked"], [], []),
    ("Egg, boiled", ["egg", "whole", "cooked", "hard-boiled"], [], []),
    ("Tofu", ["tofu", "raw"], ["firm"], []),
    ("Almonds", ["almonds", "raw"], [], []),
    ("Walnuts", ["walnuts", "english", "raw"], [], []),
    ("Cashews", ["cashew", "raw"], [], []),
    ("Peanuts", ["peanuts", "raw"], [], []),
    ("Peanut butter", ["peanut butter", "smooth"], [], []),
    ("Sunflower seeds", ["sunflower seed", "raw"], [], []),
    ("Pumpkin seeds", ["pumpkin", "seeds", "raw"], [], []),
    ("Chickpeas, cooked", ["chickpeas", "cooked"], [], []),
    ("Black beans, cooked", ["beans", "black", "mature", "cooked"], [], []),
    ("Lentils, cooked", ["lentils", "cooked"], [], ["sprouted"]),
    ("Kidney beans, cooked", ["beans", "kidney", "red", "mature", "cooked"], [], []),
    ("Avocado", ["avocados", "raw", "california"], [], []),
    ("Potato chips", ["potato chips"], ["salted"], []),
    ("Popcorn", ["popcorn", "air-popped"], [], []),
    ("Chocolate chip cookies", ["cookies", "chocolate chip"], [], []),
    ("Dark chocolate", ["chocolate", "dark"], ["70", "cacao"], ["candy"]),
    ("Milk chocolate", ["chocolate", "milk"], [], ["candy"]),
    ("Granulated sugar", ["sugars", "granulated"], [], []),
    ("Ice cream", ["ice creams", "vanilla"], [], []),
    ("Orange juice", ["orange juice", "raw"], [], ["cocktail"]),
    ("Apple juice", ["apple juice", "canned"], [], ["cocktail", "blend", "pineapple", "cranberry", "frozen", "drink"]),
    ("Green tea, brewed", ["tea", "green", "brewed"], [], []),
    ("Coffee, brewed", ["coffee", "brewed"], [], []),
    ("Cola", ["carbonated", "cola", "regular"], [], []),
]


# Tamil name, Sinhala name, estimated typical Sri Lankan retail price (LKR per common
# serving/unit - a slice, a piece, 100g, etc., matching how it's actually bought/sold).
# Translations are a best-effort pass covering common Sri Lankan Tamil/Sinhala usage,
# including transliteration for foods with no distinct native name (e.g. quinoa, feta).
# Prices are realistic market estimates, not an official pricing dataset - disclose as
# estimates in the UI/report, same as nutrient values are disclosed as USDA-sourced facts.
LOCAL_INFO = {
    "Watermelon": ("தர்பூசணி", "කොමඩු", 100),
    "Cantaloupe": ("முலாம்பழம்", "කාන්ටලූප්", 150),
    "Honeydew melon": ("தேன் முலாம்பழம்", "හනිඩියු මෙලන්", 180),
    "Orange": ("ஆரஞ்சு", "දොඩම්", 70),
    "Grapefruit": ("கிரேப்ஃப்ரூட்", "ග්‍රේප්ෆ්රූට්", 200),
    "Strawberries": ("ஸ்ட்ராபெரி", "ස්ට්‍රෝබෙරි", 350),
    "Pineapple": ("அன்னாசி", "අන්නාසි", 90),
    "Peach": ("பீச் பழம்", "පීච් ගෙඩි", 250),
    "Pear": ("பேரிக்காய்", "පෙයාර්ස්", 200),
    "Apple": ("ஆப்பிள்", "ඇපල්", 150),
    "Banana": ("வாழைப்பழம்", "කෙසෙල්", 20),
    "Grapes": ("திராட்சை", "මිදි", 300),
    "Kiwifruit": ("கிவி பழம்", "කිවි ගෙඩි", 180),
    "Mango": ("மாம்பழம்", "අඹ", 100),
    "Cherries": ("செர்ரி பழம்", "චෙරි", 500),
    "Blueberries": ("ப்ளூபெர்ரி", "බ්ලූබෙරි", 600),
    "Raspberries": ("ராஸ்பெர்ரி", "රස්බෙරි", 600),
    "Papaya": ("பப்பாளி", "පැපොල්", 60),
    "Coconut water": ("இளநீர்", "කුරුඹ වතුර", 100),
    "Lettuce": ("லெட்யூஸ்", "ලෙටිස්", 150),
    "Cabbage": ("முட்டைக்கோஸ்", "ගෝවා", 80),
    "Celery": ("செலரி", "සෙලරි", 200),
    "Zucchini": ("சுக்கினி", "සුකිනි", 180),
    "Cauliflower": ("காலிஃபிளவர்", "මල් ගෝවා", 120),
    "Broccoli": ("ப்ரோக்கோலி", "බ්‍රොකොලි", 200),
    "Spinach": ("பசலைக்கீரை", "නිවිති", 60),
    "Kale": ("கேல் கீரை", "කේල්", 250),
    "Carrot": ("கேரட்", "කැරට්", 70),
    "Tomato": ("தக்காளி", "තක්කාලි", 60),
    "Bell pepper": ("குடைமிளகாய்", "බෙල් පෙපර්", 150),
    "Cucumber": ("வெள்ளரிக்காய்", "පිපිඤ්ඤා", 50),
    "Radish": ("முள்ளங்கி", "රාබු", 70),
    "Asparagus": ("அஸ்பாரகஸ்", "ඇස්පරගස්", 400),
    "Green beans": ("பீன்ஸ்", "බෝංචි", 90),
    "Sweet potato": ("சர்க்கரை வள்ளிக்கிழங்கு", "බතල", 50),
    "Potato": ("உருளைக்கிழங்கு", "අල", 40),
    "Sweet corn": ("சோளம்", "බඩ ඉරිඟු", 50),
    "Mushroom": ("காளான்", "හතු", 150),
    "Onion": ("வெங்காயம்", "ලූනු", 50),
    "Beet": ("பீட்ரூட்", "බීට්රූට්", 70),
    "Brussels sprouts": ("பிரசல்ஸ் ஸ்ப்ரவுட்ஸ்", "බ්‍රසල්ස් ස්ප්‍රවුට්ස්", 350),
    "Collard greens": ("கோலார்ட் கிரீன்ஸ்", "කොලාඩ් ග්‍රීන්ස්", 150),
    "White rice, cooked": ("வெள்ளை சாதம்", "සුළු සහල් බත්", 20),
    "Brown rice, cooked": ("சிவப்பு சாதம்", "රතු සහල් බත්", 25),
    "Oats": ("ஓட்ஸ்", "ඕට්ස්", 150),
    "Whole wheat bread": ("கோதுமை ரொட்டி", "තිරිඟු පාන්", 100),
    "White bread": ("வெள்ளை ரொட்டி", "සුළු පාන්", 80),
    "Pasta, cooked": ("பாஸ்தா", "පැස්ටා", 120),
    "Quinoa, cooked": ("குயினோவா", "ක්විනෝවා", 400),
    "Barley, cooked": ("பார்லி", "බාලි", 150),
    "Whole milk": ("முழு பால்", "සම්පූර්ණ කිරි", 90),
    "Skim milk": ("கொழுப்பு நீக்கிய பால்", "මේදය ඉවත් කළ කිරි", 100),
    "Greek yogurt": ("கிரேக்க தயிர்", "ග්‍රීක යෝගට්", 180),
    "Plain yogurt": ("தயிர்", "යෝගට්", 60),
    "Cheddar cheese": ("செடார் சீஸ்", "චෙඩර් චීස්", 250),
    "Mozzarella cheese": ("மொசரெல்லா சீஸ்", "මොසරෙලා චීස්", 300),
    "Parmesan cheese": ("பார்மேசன் சீஸ்", "පර්මේසන් චීස්", 450),
    "Feta cheese": ("ஃபேட்டா சீஸ்", "ෆේටා චීස්", 350),
    "Cottage cheese": ("காட்டேஜ் சீஸ்", "කොටෙජ් චීස්", 300),
    "Chicken breast, roasted": ("கோழி மார்பகம்", "කුකුල් මස් පපුව", 250),
    "Chicken thigh, roasted": ("கோழி தொடை", "කුකුල් කලවා මස්", 220),
    "Turkey breast, roasted": ("வான்கோழி மார்பகம்", "තුර්කිය කුකුළු මස් පපුව", 500),
    "Lean ground beef, cooked": ("மாட்டிறைச்சி அரைத்தது", "හරක් මස් කැටි", 400),
    "Pork loin, roasted": ("பன்றி இறைச்சி", "ඌරු මස්", 350),
    "Salmon, cooked": ("சால்மன் மீன்", "සැමන් මාළු", 600),
    "Tuna, canned": ("டூனா மீன்", "ටූනා මාළු", 300),
    "Shrimp, cooked": ("இறால்", "ඉස්සෝ", 400),
    "Egg, boiled": ("வேகவைத்த முட்டை", "තම්බා බිත්තර", 30),
    "Tofu": ("டோஃபு", "ටෝෆු", 150),
    "Almonds": ("பாதாம்", "ආමන්ඩ්", 220),
    "Walnuts": ("அக்ரூட் பருப்பு", "වෝල්නට්", 350),
    "Cashews": ("முந்திரி", "කජු", 250),
    "Peanuts": ("நிலக்கடலை", "රටකජු", 100),
    "Peanut butter": ("நிலக்கடலை வெண்ணெய்", "රටකජු බටර්", 300),
    "Sunflower seeds": ("சூரியகாந்தி வித்து", "සූරියකාන්ත ඇට", 200),
    "Pumpkin seeds": ("பூசணி வித்து", "කුම්බල ඇට", 250),
    "Chickpeas, cooked": ("கொண்டைக்கடலை", "කඩල", 120),
    "Black beans, cooked": ("கருப்பு பீன்ஸ்", "කළු බෝංචි", 150),
    "Lentils, cooked": ("பருப்பு", "පරිප්පු", 80),
    "Kidney beans, cooked": ("ராஜ்மா", "රතු බෝංචි", 130),
    "Avocado": ("வெண்ணெய் பழம்", "අලිගැටපේර", 150),
    "Potato chips": ("உருளைக்கிழங்கு சிப்ஸ்", "අල චිප්ස්", 100),
    "Popcorn": ("பாப்கார்ன்", "පොප්කෝන්", 80),
    "Chocolate chip cookies": ("சாக்லேட் சிப் குக்கீ", "චොකලට් චිප් කුකීස්", 150),
    "Dark chocolate": ("கருப்பு சாக்லேட்", "කළු චොකලට්", 300),
    "Milk chocolate": ("பால் சாக்லேட்", "කිරි චොකලට්", 200),
    "Granulated sugar": ("சர்க்கரை", "සීනි", 25),
    "Ice cream": ("ஐஸ்க்ரீம்", "අයිස්ක්‍රීම්", 150),
    "Orange juice": ("ஆரஞ்சு சாறு", "දොඩම් ජූස්", 150),
    "Apple juice": ("ஆப்பிள் சாறு", "ඇපල් ජූස්", 180),
    "Green tea, brewed": ("பச்சை தேநீர்", "කොළ තේ", 40),
    "Coffee, brewed": ("காபி", "කෝපි", 60),
    "Cola": ("கோலா", "කොලා", 100),
}


# Real food-group classification (Fruit/Vegetable/Dairy/Nuts/Grain/Protein),
# used to power the category filter on the My Nutrition page. Legumes are
# grouped under Protein (a common nutrition-app convention) rather than
# invented as their own tab. "Other" covers sweets/beverages that don't
# belong in any of those six groups - an honest label, not a fabricated one.
CATEGORY = {
    "Watermelon": "Fruit", "Cantaloupe": "Fruit", "Honeydew melon": "Fruit", "Orange": "Fruit",
    "Grapefruit": "Fruit", "Strawberries": "Fruit", "Pineapple": "Fruit", "Peach": "Fruit",
    "Pear": "Fruit", "Apple": "Fruit", "Banana": "Fruit", "Grapes": "Fruit", "Kiwifruit": "Fruit",
    "Mango": "Fruit", "Cherries": "Fruit", "Blueberries": "Fruit", "Raspberries": "Fruit",
    "Papaya": "Fruit", "Avocado": "Fruit",
    "Lettuce": "Vegetable", "Cabbage": "Vegetable", "Celery": "Vegetable", "Zucchini": "Vegetable",
    "Cauliflower": "Vegetable", "Broccoli": "Vegetable", "Spinach": "Vegetable", "Kale": "Vegetable",
    "Carrot": "Vegetable", "Tomato": "Vegetable", "Bell pepper": "Vegetable", "Cucumber": "Vegetable",
    "Radish": "Vegetable", "Asparagus": "Vegetable", "Green beans": "Vegetable",
    "Sweet potato": "Vegetable", "Potato": "Vegetable", "Sweet corn": "Vegetable",
    "Mushroom": "Vegetable", "Onion": "Vegetable", "Beet": "Vegetable",
    "Brussels sprouts": "Vegetable", "Collard greens": "Vegetable",
    "White rice, cooked": "Grain", "Brown rice, cooked": "Grain", "Oats": "Grain",
    "Whole wheat bread": "Grain", "White bread": "Grain", "Pasta, cooked": "Grain",
    "Quinoa, cooked": "Grain", "Barley, cooked": "Grain",
    "Whole milk": "Dairy", "Skim milk": "Dairy", "Greek yogurt": "Dairy", "Plain yogurt": "Dairy",
    "Cheddar cheese": "Dairy", "Mozzarella cheese": "Dairy", "Parmesan cheese": "Dairy",
    "Feta cheese": "Dairy", "Cottage cheese": "Dairy",
    "Chicken breast, roasted": "Protein", "Chicken thigh, roasted": "Protein",
    "Turkey breast, roasted": "Protein", "Lean ground beef, cooked": "Protein",
    "Pork loin, roasted": "Protein", "Salmon, cooked": "Protein", "Tuna, canned": "Protein",
    "Shrimp, cooked": "Protein", "Egg, boiled": "Protein", "Tofu": "Protein",
    "Chickpeas, cooked": "Protein", "Black beans, cooked": "Protein", "Lentils, cooked": "Protein",
    "Kidney beans, cooked": "Protein",
    "Almonds": "Nuts", "Walnuts": "Nuts", "Cashews": "Nuts", "Peanuts": "Nuts",
    "Peanut butter": "Nuts", "Sunflower seeds": "Nuts", "Pumpkin seeds": "Nuts",
    "Coconut water": "Other", "Potato chips": "Other", "Popcorn": "Other",
    "Chocolate chip cookies": "Other", "Dark chocolate": "Other", "Milk chocolate": "Other",
    "Granulated sugar": "Other", "Ice cream": "Other", "Orange juice": "Other",
    "Apple juice": "Other", "Green tea, brewed": "Other", "Coffee, brewed": "Other", "Cola": "Other",
}


def load_food_table(directory, wanted_data_type):
    foods = {}
    with open(os.path.join(directory, "food.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["data_type"] == wanted_data_type:
                foods[row["fdc_id"]] = row["description"]
    return foods


def load_nutrient_lookup(directory):
    # nutrient internal id -> classic nutrient number (e.g. "1003" -> "204")
    nbr_by_id = {}
    with open(os.path.join(directory, "nutrient.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            nbr_by_id[row["id"]] = row["nutrient_nbr"]

    # fdc_id -> {nutrient_nbr: amount}
    values = {}
    with open(os.path.join(directory, "food_nutrient.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            nbr = nbr_by_id.get(row["nutrient_id"])
            if nbr is None or not row["amount"]:
                continue
            fdc_id = row["fdc_id"]
            values.setdefault(fdc_id, {})[nbr] = float(row["amount"])
    return values


def contains_word(desc_lower, phrase):
    # whole-word/phrase match, so "oats" doesn't match inside "groats" and
    # "cola" doesn't match inside "chocolate"
    return re.search(r"\b" + re.escape(phrase) + r"\b", desc_lower) is not None


def score_candidate(description, required, preferred, avoid):
    desc_lower = description.lower()
    if not all(contains_word(desc_lower, word) for word in required):
        return None
    if any(contains_word(desc_lower, word) for word in avoid):
        return None
    score = sum(1 for word in preferred if contains_word(desc_lower, word))
    score -= len(description) / 200  # slight preference for shorter, more generic descriptions
    return score


def find_best_match(foods, required, preferred, avoid):
    best_id, best_score = None, None
    for fdc_id, description in foods.items():
        score = score_candidate(description, required, preferred, avoid)
        if score is None:
            continue
        if best_score is None or score > best_score:
            best_id, best_score = fdc_id, score
    return best_id


def main():
    sr_foods = load_food_table(SR_LEGACY_DIR, "sr_legacy_food")
    fd_foods = load_food_table(FOUNDATION_DIR, "foundation_food")
    sr_values = load_nutrient_lookup(SR_LEGACY_DIR)
    fd_values = load_nutrient_lookup(FOUNDATION_DIR)

    rows = []
    misses = []

    missing_local_info = [name for name, *_ in TARGET_FOODS if name not in LOCAL_INFO]
    if missing_local_info:
        raise ValueError(f"LOCAL_INFO is missing an entry for: {missing_local_info}")
    missing_category = [name for name, *_ in TARGET_FOODS if name not in CATEGORY]
    if missing_category:
        raise ValueError(f"CATEGORY is missing an entry for: {missing_category}")

    for name, required, preferred, avoid in TARGET_FOODS:
        fdc_id = find_best_match(sr_foods, required, preferred, avoid)
        values, matched_desc = sr_values, sr_foods.get(fdc_id)
        if fdc_id is None:
            fdc_id = find_best_match(fd_foods, required, preferred, avoid)
            values, matched_desc = fd_values, fd_foods.get(fdc_id)
        if fdc_id is None:
            misses.append(name)
            continue

        nutrients = values.get(fdc_id, {})
        row = [name]
        for key in ["calories", "fat_g", "sugar_g", "water_ml", "magnesium_mg", "vitamin_b_mg"]:
            amount = None
            for nbr in NUTRIENT_NBRS[key]:
                if nbr in nutrients:
                    amount = nutrients[nbr]
                    break
            row.append(round(amount, 2) if amount is not None else 0.0)
        tamil_name, sinhala_name, price_lkr = LOCAL_INFO[name]
        row.extend([tamil_name, sinhala_name, price_lkr, CATEGORY[name]])
        rows.append((row, matched_desc))

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["food_name", "calories", "fat_g", "sugar_g", "water_ml", "magnesium_mg",
                          "vitamin_b_mg", "tamil_name", "sinhala_name", "price_lkr", "category"])
        for row, _ in rows:
            writer.writerow(row)

    print(f"Wrote {len(rows)} foods to {OUTPUT_PATH}")
    if misses:
        print(f"No match found for {len(misses)} target foods: {misses}")

    print("\nMatched descriptions (for spot-checking):")
    for row, matched_desc in rows:
        print(f"  {row[0]!r} <- {matched_desc!r}")


if __name__ == "__main__":
    main()
