"""
The mood -> nutrient rule engine (proposal section 5.4).

Takes a mood (one of the 7 FER-2013 categories the CNN can actually output) and returns
the foods from data/nutrition_dataset.csv that fit that mood's nutrient rule.

Where each rule's numbers come from - two different things, kept separate on purpose:
1. The mood -> nutrient DIRECTION (e.g. "Sad needs high magnesium & vitamin B") is
   research-backed - see progress/2026-09-07-part3.md and the project_rule_engine.md
   memory for the full citation list (all independently verified, not guessed).
2. Turning "high magnesium" into an actual number (e.g. "magnesium_mg >= 21.0") is NOT
   something any cited paper tested - it's this project's own application-level design
   choice, made here by using the dataset's own median for that nutrient as the cutoff.
   State this distinction in the report - don't imply the papers proved these exact cutoffs.

Run directly (`python ml/rule_engine.py` from the Edueats/ folder) to see a quick summary
of how many foods match each mood.
"""

import csv

DATA_PATH = "data/nutrition_dataset.csv"

NUTRIENT_KEYS = ["calories", "fat_g", "sugar_g", "water_ml", "magnesium_mg", "vitamin_b_mg"]

# Mood -> list of "high_<nutrient>" / "low_<nutrient>" rules a food must satisfy.
# "high_X" = the food's X must be at or above the dataset's median for X; "low_X" = at or below.
# A food must pass every rule listed for a mood to be recommended for that mood.
# Neutral and Surprise have no rules on purpose (the proposal's own "balanced" baseline,
# and - for Surprise - because no research link was found; see project_rule_engine.md).
MOOD_RULES = {
    "sad": ["high_magnesium_mg", "high_vitamin_b_mg"],
    "angry": ["low_sugar_g", "high_calories"],
    "fear": ["high_magnesium_mg"],
    "happy": ["high_water_ml", "low_fat_g"],
    "disgust": ["low_fat_g", "low_calories"],
    "neutral": [],
    "surprise": [],
}


def load_foods(path=DATA_PATH):
    """Reads the nutrition CSV and returns a list of dicts, one per food, with
    the nutrient columns converted from text to actual numbers (floats)."""
    foods = []
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            food = {"food_name": row["food_name"]}
            for key in NUTRIENT_KEYS:
                food[key] = float(row[key])
            foods.append(food)
    return foods


def compute_medians(foods):
    """Finds the middle value of each nutrient across all foods in the dataset.
    These medians are what "high" and "low" actually mean in MOOD_RULES."""
    medians = {}
    for key in NUTRIENT_KEYS:
        values = sorted(food[key] for food in foods)
        mid = len(values) // 2
        if len(values) % 2 == 0:
            medians[key] = (values[mid - 1] + values[mid]) / 2
        else:
            medians[key] = values[mid]
    return medians


def food_matches_rule(food, rule, medians):
    """Checks a single "high_X" or "low_X" rule against one food."""
    direction, key = rule.split("_", 1)
    if direction == "high":
        return food[key] >= medians[key]
    return food[key] <= medians[key]


def recommend_foods(mood, foods=None, medians=None):
    """Main entry point. Give it a mood name (case-insensitive, one of the 7 CNN
    output classes) and it returns the list of matching food dicts from the CSV.
    foods/medians can be passed in to avoid re-reading the CSV for every mood
    (see the __main__ block below for an example)."""
    mood = mood.lower()
    if mood not in MOOD_RULES:
        raise ValueError(f"Unknown mood {mood!r} - must be one of {sorted(MOOD_RULES)}")

    if foods is None:
        foods = load_foods()
    if medians is None:
        medians = compute_medians(foods)

    rules = MOOD_RULES[mood]
    return [
        food for food in foods
        if all(food_matches_rule(food, rule, medians) for rule in rules)
    ]


if __name__ == "__main__":
    all_foods = load_foods()
    medians = compute_medians(all_foods)
    for mood in MOOD_RULES:
        matches = recommend_foods(mood, all_foods, medians)
        example_names = [food["food_name"] for food in matches[:5]]
        print(f"{mood}: {len(matches)} foods, e.g. {example_names}")
