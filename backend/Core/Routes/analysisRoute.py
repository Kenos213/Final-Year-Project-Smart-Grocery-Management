from flask import Blueprint, jsonify
import database as db
from Core.Routes.userRoute import token_required
from datetime import datetime, timedelta

analysis_bp = Blueprint('analysis_bp', __name__)

#Waste analytics endpoint
# Calculates waste vs saved metrics, monetary impact,
# and weekly trends from inventory history
@analysis_bp.route('/overview', methods=['GET'])
@token_required
def get_analysis(current_user):
   
    user_id = str(current_user["_id"])
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")

    # Get all items for this user (including used and expired)
    all_items = list(
        db.db.inventory.find({"user_id": user_id}, {"_id": 0})
    )

    #  Waste vs Saved Summary 
    used_items = [i for i in all_items if i.get("status") == "used"]
    wasted_items = [i for i in all_items if i.get("status") == "unused" and i.get("expiry_date", "") < today_str and i.get("expiry_date", "") != ""]
    active_items = [i for i in all_items if i.get("status") == "unused" and i.get("expiry_date", "") >= today_str]

    total_tracked = len(all_items)
    used_count = len(used_items)
    wasted_count = len(wasted_items)
    active_count = len(active_items)

    # Waste rate as percentage
    finished_count = used_count + wasted_count
    waste_rate = round((wasted_count / finished_count * 100), 1) if finished_count > 0 else 0

    #  Money Wasted vs Saved 
    # Only count items that have a valid price
    money_saved = 0.0
    money_wasted = 0.0

    for item in used_items:
        try:
            price = float(item.get("price", 0))
            money_saved += price
        except:
            pass

    for item in wasted_items:
        try:
            price = float(item.get("price", 0))
            money_wasted += price
        except:
            pass

    #  Weekly Trends 
    weekly_data = []

    for weeks_ago in range(5, -1, -1):
        week_start = today - timedelta(weeks=weeks_ago, days=today.weekday())
        week_end = week_start + timedelta(days=6)
        week_start_str = week_start.strftime("%Y-%m-%d")
        week_end_str = week_end.strftime("%Y-%m-%d")
        week_label = week_start.strftime("%-d %b")

        # Count items that were added in this week
        week_used = 0
        week_wasted = 0

        for item in all_items:
            added = item.get("added_date", "")
            if not added:
                continue

            if week_start_str <= added <= week_end_str:
                if item.get("status") == "used":
                    week_used += 1
                elif item.get("status") == "unused" and item.get("expiry_date", "") < today_str and item.get("expiry_date", "") != "":
                    week_wasted += 1

        weekly_data.append({
            "week": week_label,
            "used": week_used,
            "wasted": week_wasted,
        })

    return jsonify({
        "status": "success",
        "summary": {
            "total_tracked": total_tracked,
            "used_count": used_count,
            "wasted_count": wasted_count,
            "active_count": active_count,
            "waste_rate": waste_rate,
        },
        "money": {
            "saved": round(money_saved, 2),
            "wasted": round(money_wasted, 2),
        },
        "weekly": weekly_data,
    })