import json
import sys

from predict import predict
from rule_engine import recommend_foods


if __name__ == "__main__":
    args = sys.argv[1:]
    json_mode = "--json" in args
    if json_mode:
        args.remove("--json")

    if len(args) != 1:
        print("Usage: python ml/connect_mood_to_food.py [--json] <path-to-photo>")
        sys.exit(1)

    mood = predict(args[0])
    foods = recommend_foods(mood)

    if json_mode:
        # structured output for the backend to parse, instead of the human-readable text below
        print(json.dumps({"mood": mood, "foods": [food["food_name"] for food in foods]}))
    else:
        print(f"\nDetected mood: {mood}")
        if foods:
            print(f"Suggested foods ({len(foods)} matches):")
            for food in foods:
                print(f"  - {food['food_name']}")
        else:
            print("No foods matched this mood's rule (neutral/surprise have no rule, "
                  "or no foods in the dataset passed the cutoffs).")
