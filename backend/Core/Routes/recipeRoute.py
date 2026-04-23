from flask import Blueprint, request, jsonify
import database as db
from Core.Routes.userRoute import token_required
from datetime import datetime
import requests
import os

from dotenv import load_dotenv
load_dotenv()

recipe_bp = Blueprint('recipe_bp', __name__)

SPOONACULAR_KEYS = [
    os.environ.get("SPOONACULAR_API_KEY1"),
    os.environ.get("SPOONACULAR_API_KEY2"),
]


SCORE_WEIGHTS = {
    "expiry":      0.40, #how urgently ingredients need using
    "coverage":    0.30, # % of recipe ingredients user has
    "convenience": 0.20, # how many few items extra the user needs
    "preference":  0.10, # matching diertary filters and cuisine type
}


#  Scores how well a recipe uses ingredients close to expiry. Items expiring sooner contribute more to the score.
def calculate_expiry_score(used_ingredients, inventory_items):
  
    if not used_ingredients or not inventory_items:
        return 0.0

    today = datetime.now()
    urgency_scores = []

    for used in used_ingredients:
        used_name = used.get("name", "").lower()

        for inv_item in inventory_items:
            inv_name = inv_item.get("name", "").lower()

            if used_name in inv_name or inv_name in used_name:
                expiry_str = inv_item.get("expiry_date", "")
                if expiry_str:
                    try:
                        expiry = datetime.strptime(expiry_str, "%Y-%m-%d")
                        days_left = (expiry - today).days

                        if days_left <= 0:
                            urgency_scores.append(1.0)
                        elif days_left <= 3:
                            urgency_scores.append(0.9)
                        elif days_left <= 7:
                            urgency_scores.append(0.6)
                        elif days_left <= 14:
                            urgency_scores.append(0.3)
                        else:
                            urgency_scores.append(0.1)
                    except:
                        urgency_scores.append(0.1)
                break

    if not urgency_scores:
        return 0.0

    return sum(urgency_scores) / len(urgency_scores)

# Scores what percentage of recipe ingredients the user already has.
def calculate_coverage_score(used_count, missed_count):
   
    total = used_count + missed_count
    if total == 0:
        return 0.0
    return used_count / total

#Scores how easy the recipe is to make right now. 0 missing = 1.0, 5+ missing = 0.1
def calculate_convenience_score(missed_count):
  
    if missed_count == 0:
        return 1.0
    elif missed_count <= 2:
        return 0.7
    elif missed_count <= 4:
        return 0.4
    else:
        return 0.1

# Makes a request to Spoonacular with retries across multiple API keys
def spoonacular_request(url, params, timeout=10):
    
    for key in SPOONACULAR_KEYS:
        params["apiKey"] = key
        try:
            response = requests.get(url, params=params, timeout=timeout)
            if response.status_code == 402:
                print(f"Key {key[:8]}... hit limit, trying next")
                continue
            return response
        except Exception as e:
            print(f"Key {key[:8]}... failed: {e}")
            continue
    return None

# calculates a preference score based on the user's filters and the recipe's attributes
def calculate_preference_score(recipe_info, filters):
    if not filters:
        return 0.5

    matches = 0
    total_filters = 0

    # Check calorie target
    if filters.get("calories"):
        total_filters += 1
        target = float(filters["calories"])
        actual = recipe_info.get("calories", 0)
        if actual and (target * 0.8) <= actual <= (target * 1.2):
            matches += 1

    # Check cooking time
    if filters.get("max_time"):
        total_filters += 1
        max_time = int(filters["max_time"])
        actual_time = recipe_info.get("readyInMinutes", 999)
        if actual_time <= max_time:
            matches += 1

    # Check allergies/dietary — reject recipes that don't match
    if filters.get("allergies"):
        total_filters += 1
        user_diets = [d.strip().lower() for d in filters["allergies"].split(",")]
        recipe_diets = [d.lower() for d in recipe_info.get("diets", [])]

        # Check if any of the user's dietary needs are met
        if any(diet in recipe_diets for diet in user_diets):
            matches += 1

    if total_filters == 0:
        return 0.5

    return matches / total_filters

#  Combines all four factors into a single weighted score.
def calculate_total_score(recipe, inventory_items, filters):
   
    expiry = calculate_expiry_score(recipe.get("usedIngredients", []), inventory_items)
    coverage = calculate_coverage_score(
        len(recipe.get("usedIngredients", [])),
        recipe.get("missedIngredientCount", 0)
    )
    convenience = calculate_convenience_score(recipe.get("missedIngredientCount", 0))
    preference = calculate_preference_score(recipe, filters)

    total = (
        SCORE_WEIGHTS["expiry"] * expiry +
        SCORE_WEIGHTS["coverage"] * coverage +
        SCORE_WEIGHTS["convenience"] * convenience +
        SCORE_WEIGHTS["preference"] * preference
    )

    return round(total, 3)

# Fallback function returns random recipes when inventory is empty or no matches found
def get_random_recipes(filters):
   
    response = spoonacular_request(
        "https://api.spoonacular.com/recipes/random",
        {
            "number": 5,
            "tags": filters.get("cuisine", "").lower() if filters.get("cuisine") else "",
        }
    )

    if not response or response.status_code != 200:
        print("failed random recipes")
        return jsonify({"status": "error", "message": "Could not load recipes"}), 500

    random_recipes = response.json().get("recipes", [])
    results = []
    for r in random_recipes:
        calories = 0
        for n in r.get("nutrition", {}).get("nutrients", []):
            if n.get("name") == "Calories":
                calories = n.get("amount", 0)
                break

        results.append({
            "id": r["id"],
            "title": r.get("title", ""),
            "image": r.get("image", ""),
            "score": 0,
            "cooking_time": r.get("readyInMinutes", "N/A"),
            "servings": r.get("servings", "N/A"),
            "calories": round(calories),
            "diets": r.get("diets", []),
            "source_url": r.get("sourceUrl", ""),
            "ingredients_from_inventory": [],
            "extra_ingredients_needed": [],
            "used_count": 0,
            "missed_count": 0,
            "instructions": "",
            "ingredients": [],
        })

    return jsonify({
        "status": "success",
        "count": len(results),
        "recipes": results,
        "source": "suggestions"
    })

# this route suggest recipes based on the users inventory and their filters such as cuisine type, calorie target and even cooking time
@recipe_bp.route('/suggest', methods=['POST'])
@token_required
def suggest_recipes(current_user):
    try:
        user_id = str(current_user["_id"])
        data = request.get_json() or {}

        filters = {
            "allergies": data.get("allergies", ""),
            "calories": data.get("calories", ""),
            "cuisine": data.get("cuisine", ""),
            "max_time": data.get("max_time", ""),
        }

        inventory_items = list(
            db.db.inventory.find(
                {"user_id": user_id, "status": "unused"},
                {"_id": 0}
            ).sort("expiry_date", 1)
        )

        if not inventory_items:
            return get_random_recipes(filters)

        # Build ingredient list
        ingredient_names = [item["name"] for item in inventory_items]
        ingredients_str = ",".join(ingredient_names[:10])

        # Check if filters are active
        has_filters = any([filters["calories"], filters["max_time"], filters["cuisine"]])

        raw_recipes = []

        if has_filters:
            # Use complexSearch that will support ingredients + cuisine + time however it doesnt rank by used ingredients so results so i will do that
            params = {
                "includeIngredients": ingredients_str,
                "number": 10,
                "sort": "max-used-ingredients",
                "fillIngredients": True,
            }
            if filters["cuisine"]:
                params["cuisine"] = filters["cuisine"]
            if filters["max_time"]:
                params["maxReadyTime"] = int(filters["max_time"])
            # Calories filtered locally after results this will save around 1 API point

            spoon_response = spoonacular_request(
                "https://api.spoonacular.com/recipes/complexSearch",
                params
            )

            if spoon_response and spoon_response.status_code == 200:
                data = spoon_response.json()
                raw_recipes = data.get("results", [])
        else:
            # No filters with conjunction using findByIngredients 
            spoon_response = spoonacular_request(
                "https://api.spoonacular.com/recipes/findByIngredients",
                {
                    "ingredients": ingredients_str,
                    "number": 10,
                    "ranking": 1,
                    "ignorePantry": True,
                }
            )

            if spoon_response and spoon_response.status_code == 200:
                raw_recipes = spoon_response.json()

        if not raw_recipes:
            return get_random_recipes(filters)

        # Step 2: Get details for all recipes
        recipe_ids = [str(r["id"]) for r in raw_recipes]
        recipe_details = {}

        detail_response = spoonacular_request(
            "https://api.spoonacular.com/recipes/informationBulk",
            {
                "ids": ",".join(recipe_ids),
                "includeNutrition": True,
            }
        )

        if detail_response and detail_response.status_code == 200:
            for detail in detail_response.json():
                calories = 0
                for n in detail.get("nutrition", {}).get("nutrients", []):
                    if n.get("name") == "Calories":
                        calories = n.get("amount", 0)
                        break

                recipe_details[detail["id"]] = {
                    "readyInMinutes": detail.get("readyInMinutes", 0),
                    "servings": detail.get("servings", 1),
                    "calories": calories,
                    "diets": detail.get("diets", []),
                    "sourceUrl": detail.get("sourceUrl", ""),
                    "instructions": detail.get("instructions", ""),
                    "ingredients": [
                        {
                            "name": ing.get("name", ""),
                            "amount": ing.get("amount", 0),
                            "unit": ing.get("unit", ""),
                        }
                        for ing in detail.get("extendedIngredients", [])
                    ],
                }

        # Step 3: Score and rank
        scored_recipes = []

        for recipe in raw_recipes:
            recipe_id = recipe["id"]
            details = recipe_details.get(recipe_id, {})
            recipe.update(details)

            score = calculate_total_score(recipe, inventory_items, filters)

            used_names = [i["name"] for i in recipe.get("usedIngredients", [])]
            missed_names = [i["name"] for i in recipe.get("missedIngredients", [])]

            scored_recipes.append({
                "id": recipe_id,
                "title": recipe.get("title", "Unknown Recipe"),
                "image": recipe.get("image", ""),
                "score": score,
                "cooking_time": details.get("readyInMinutes", "N/A"),
                "servings": details.get("servings", "N/A"),
                "calories": round(details.get("calories", 0)),
                "diets": details.get("diets", []),
                "source_url": details.get("sourceUrl", ""),
                "ingredients_from_inventory": used_names,
                "extra_ingredients_needed": missed_names,
                "used_count": len(used_names),
                "missed_count": len(missed_names),
                "instructions": details.get("instructions", ""),
                "ingredients": details.get("ingredients", []),
            })

        # Filter calories locally as this is cheaper than API filter
        if filters.get("calories"):
            target = float(filters["calories"])
            filtered = [
                r for r in scored_recipes
                if r["calories"] == 0 or (target * 0.7 <= r["calories"] <= target * 1.3)
            ]
            if filtered:
                scored_recipes = filtered

        scored_recipes.sort(key=lambda r: r["score"], reverse=True)

        return jsonify({
            "status": "success",
            "count": len(scored_recipes),
            "recipes": scored_recipes
        })

    except Exception as e:
        print(f"Suggest recipe error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": "Could not load recipes"}), 500