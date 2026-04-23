from flask import Blueprint, jsonify
import database as db
from Core.Routes.userRoute import token_required
from datetime import datetime, timedelta
import numpy as np

predictive_bp = Blueprint('predictive_bp', __name__)

# Minimum purchases needed before ML model is used instead of SMA which is simple moving average
ML_THRESHOLD = 10




# the way i handle predictions is by using two approaches and automatically selecting the best one:
#
# 1. SMA is used when purchase count < ML_THRESHOLD
#    Averages the gaps between purchases to predict the next one.
#    Simple but effective with limited data.
#
# 2. Random Forest Regressor is used when purchase count >= ML_THRESHOLD
#    Trained on the user's own purchase history with features:
#    - day_of_week (0-6): captures weekly shopping habits
#    - week_of_month (1-4): captures monthly patterns (e.g. payday)
#    - days_since_last: gap from previous purchase
#    - category_code: numeric encoding of product category
#
#    Target: days until next purchase
#
# The system falls back to SMA when there isn't enough data for ML,
# ensuring predictions are available from the user's second purchase.


## Calculates the average gap between purchases and predicts the next purchase date.
def calculate_sma_prediction(purchase_dates):
  
    gaps = []
    for i in range(1, len(purchase_dates)):
        prev = datetime.strptime(purchase_dates[i - 1], "%Y-%m-%d")
        curr = datetime.strptime(purchase_dates[i], "%Y-%m-%d")
        gap = (curr - prev).days
        if gap > 0:
            gaps.append(gap)

    if not gaps:
        return None

    avg_gap = sum(gaps) / len(gaps)
    last_date = datetime.strptime(purchase_dates[-1], "%Y-%m-%d")
    predicted = last_date + timedelta(days=round(avg_gap))

    return {
        "avg_gap": round(avg_gap, 1),
        "predicted_date": predicted.strftime("%Y-%m-%d"),
        "method": "SMA",
    }


def calculate_ml_prediction(purchase_dates, category="Other"):
  
    from sklearn.ensemble import RandomForestRegressor

    # Map category to a number for the model
    category_map = {
        "Dairy": 0, "Produce": 1, "Meat": 2, "Fish": 3,
        "Bakery": 4, "Beverages": 5, "Snacks": 6, "Frozen": 7,
        "Pantry": 8, "Household": 9, "Other": 10,
    }
    cat_code = category_map.get(category, 10)

    # Build training data from purchase history
    features = []
    targets = []

    for i in range(1, len(purchase_dates)):
        prev_date = datetime.strptime(purchase_dates[i - 1], "%Y-%m-%d")
        curr_date = datetime.strptime(purchase_dates[i], "%Y-%m-%d")
        gap = (curr_date - prev_date).days

        if gap <= 0:
            continue

        # Features for this purchase
        day_of_week = prev_date.weekday()
        week_of_month = min(prev_date.day // 7, 3)
        days_since_last = gap

        features.append([day_of_week, week_of_month, days_since_last, cat_code])

        # Target is the gap to the next purchase
        if i + 1 < len(purchase_dates):
            next_date = datetime.strptime(purchase_dates[i + 1], "%Y-%m-%d")
            next_gap = (next_date - curr_date).days
            if next_gap > 0:
                targets.append(next_gap)

    # Needs at least 3 training samples
    if len(targets) < 3 or len(features) < len(targets) + 1:
        return None

    # Trim features to match targets
    X = np.array(features[:len(targets)])
    y = np.array(targets)

    # Training the model
    model = RandomForestRegressor(
        n_estimators=50,
        max_depth=4,
        random_state=42,
    )
    model.fit(X, y)

    # Predicting using the most recent purchase
    last_date = datetime.strptime(purchase_dates[-1], "%Y-%m-%d")
    second_last = datetime.strptime(purchase_dates[-2], "%Y-%m-%d")

    last_features = np.array([[
        last_date.weekday(),
        min(last_date.day // 7, 3),
        (last_date - second_last).days,
        cat_code,
    ]])

    predicted_gap = model.predict(last_features)[0]
    predicted_gap = max(1, round(predicted_gap))

    predicted_date = last_date + timedelta(days=predicted_gap)
    train_score = round(model.score(X, y), 2)

    return {
        "avg_gap": predicted_gap,
        "predicted_date": predicted_date.strftime("%Y-%m-%d"),
        "method": "Random Forest",
        "model_accuracy": train_score,
    }


@predictive_bp.route('/restock', methods=['GET'])
@token_required
def get_restock_predictions(current_user):
    user_id = str(current_user["_id"])
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")

    # Get all items this user has ever added
    all_items = list(
        db.db.inventory.find(
            {"user_id": user_id},
            {"_id": 0, "name": 1, "added_date": 1, "category": 1}
        ).sort("added_date", 1)
    )

    if not all_items:
        return jsonify({
            "status": "success",
            "predictions": [],
            "message": "Not enough purchase history yet."
        })

    # Group purchase dates by product name
    product_data = {}
    for item in all_items:
        name = item.get("name", "").strip()
        date = item.get("added_date", "")
        category = item.get("category", "Other")
        if name and date:
            if name not in product_data:
                product_data[name] = {"dates": [], "category": category}
            product_data[name]["dates"].append(date)

    predictions = []

    for product_name, data in product_data.items():
        dates = sorted(set(data["dates"]))
        category = data["category"]

        if len(dates) < 2:
            continue

        # Hybrid: choose method based on data availability
        if len(dates) >= ML_THRESHOLD:
            result = calculate_ml_prediction(dates, category)
            if not result:
                result = calculate_sma_prediction(dates)
        else:
            result = calculate_sma_prediction(dates)

        if not result:
            continue

        predicted_date = datetime.strptime(result["predicted_date"], "%Y-%m-%d")
        days_until = (predicted_date - today).days

        # Confidence: more data = higher, ML gets a small boost
        base_confidence = min(len(dates) / 10, 1.0)
        if result["method"] == "Random Forest":
            confidence = base_confidence * 0.9 + 0.1
        else:
            confidence = base_confidence

        # Status
        if days_until < 0:
            status = "overdue"
        elif days_until <= 2:
            status = "soon"
        elif days_until <= 7:
            status = "upcoming"
        else:
            status = "later"

        prediction = {
            "product": product_name,
            "category": category,
            "purchase_count": len(dates),
            "avg_days_between": result["avg_gap"],
            "last_purchased": dates[-1],
            "predicted_date": result["predicted_date"],
            "days_until": days_until,
            "confidence": round(confidence, 2),
            "status": status,
            "method": result["method"],
        }

        if result.get("model_accuracy") is not None:
            prediction["model_accuracy"] = result["model_accuracy"]

        predictions.append(prediction)

    # Sort: overdue first
    status_order = {"overdue": 0, "soon": 1, "upcoming": 2, "later": 3}
    predictions.sort(key=lambda p: status_order.get(p["status"], 3))

    return jsonify({
        "status": "success",
        "count": len(predictions),
        "predictions": predictions,
    })