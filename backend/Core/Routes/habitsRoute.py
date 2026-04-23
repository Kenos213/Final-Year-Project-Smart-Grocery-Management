from flask import Blueprint, jsonify
import database as db
from Core.Routes.userRoute import token_required
from datetime import datetime

habits_bp = Blueprint('habits_bp', __name__)

###Category waste breakdown analysis
###Groups items by category and calculates waste rate per category.
#Identifies which categories the user wastes most and provides
#actionable suggestions based on the data.
@habits_bp.route('/category-breakdown', methods=['GET'])
@token_required
def get_category_breakdown(current_user):
   
    user_id = str(current_user["_id"])
    today_str = datetime.now().strftime("%Y-%m-%d")

    # Get all items for this user
    all_items = list(
        db.db.inventory.find({"user_id": user_id}, {"_id": 0})
    )

    if not all_items:
        return jsonify({
            "status": "success",
            "categories": [],
            "worst_category": None,
            "best_category": None,
        })

    # Group by category
    category_data = {}

    for item in all_items:
        cat = item.get("category", "Other")
        if cat not in category_data:
            category_data[cat] = {"total": 0, "used": 0, "wasted": 0, "active": 0}

        category_data[cat]["total"] += 1

        status = item.get("status", "unused")
        expiry = item.get("expiry_date", "")

        if status == "used":
            category_data[cat]["used"] += 1
        elif status == "unused" and expiry and expiry < today_str:
            category_data[cat]["wasted"] += 1
        else:
            category_data[cat]["active"] += 1

    # Build response with waste rates
    categories = []

    for cat, data in category_data.items():
        finished = data["used"] + data["wasted"]
        waste_rate = round((data["wasted"] / finished * 100), 1) if finished > 0 else 0

        # Generate a suggestion based on waste rate
        if waste_rate == 0:
            suggestion = "No waste — keep it up"
        elif waste_rate <= 20:
            suggestion = "Low waste — good management"
        elif waste_rate <= 50:
            suggestion = f"Consider buying smaller quantities of {cat.lower()}"
        else:
            suggestion = f"High waste — try using {cat.lower()} items earlier or freeze them"

        categories.append({
            "category": cat,
            "total": data["total"],
            "used": data["used"],
            "wasted": data["wasted"],
            "active": data["active"],
            "waste_rate": waste_rate,
            "suggestion": suggestion,
        })

    # Sort by waste rate (worst first)
    categories.sort(key=lambda c: c["waste_rate"], reverse=True)

    # Find worst and best categories (only those with finished items)
    with_data = [c for c in categories if (c["used"] + c["wasted"]) > 0]
    worst = with_data[0] if with_data else None
    best = with_data[-1] if with_data else None

    return jsonify({
        "status": "success",
        "categories": categories,
        "worst_category": worst,
        "best_category": best,
    })