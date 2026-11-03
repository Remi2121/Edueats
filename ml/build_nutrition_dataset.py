"""
Builds data/nutrition_dataset.csv from real USDA FoodData Central files.

Source data (not in git - download instructions in EduEats README/progress log):
  datasets/usda_sr_legacy/   <- unzipped FoodData_Central_sr_legacy_food_csv_2018-04.zip
  datasets/usda_foundation/  <- unzipped FoodData_Central_foundation_food_csv_2026-04-30.zip
Both downloaded from https://fdc.nal.usda.gov/download-datasets.html

Re-run this any time to rebuild the CSV (e.g. after changing TARGET_FOODS below).

Note: this repo keeps datasets/ directly inside the project folder (same convention
as data.py's DATA_DIR here) - the reference repo keeps it one level up instead.
"""

import csv
import glob
import os
import re

SR_LEGACY_DIR = glob.glob("datasets/usda_sr_legacy/FoodData_Central_sr_legacy_food_csv_*")[0]
FOUNDATION_DIR = glob.glob("datasets/usda_foundation/FoodData_Central_foundation_food_csv_*")[0]
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
        rows.append((row, matched_desc))

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["food_name", "calories", "fat_g", "sugar_g", "water_ml", "magnesium_mg", "vitamin_b_mg"])
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
