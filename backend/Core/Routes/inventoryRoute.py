from flask import Blueprint, request, jsonify
import database as db  
from datetime import datetime, timedelta
from Core.Routes.userRoute import token_required
from bson.objectid import ObjectId

inventory_bp = Blueprint('inventory_bp', __name__)

# add items to inventory to be added into the mongodb database
@inventory_bp.route('/add', methods=['POST'])
@token_required
def addToInventory(current_user):
    data = request.get_json()
    items_to_add = data.get('items', [])
    
    if not items_to_add:
        return jsonify({"status": "error", "message": "No items provided"}), 400

    user_id = str(current_user["_id"])
    current_date = datetime.now()

    cleaned_items = []
    for item in items_to_add:
        cleaned_items.append({
            "user_id": user_id,
            "name": item.get("name", "Unknown Item"),
            "brand": item.get("brand", "Unknown Brand"),
            "price": item.get("price", "0.00"),
            "source": item.get("source", "unknown"),
            "category": item.get("category", "uncategorized"),
            "added_date": current_date.strftime("%Y-%m-%d"),
            "expiry_date": item.get("expiry_date", ""),
            "expiry_source": item.get("expiry_source", "unknown"),
            "image_url": item.get("image_url", ""),
            "status": "unused"
        })

    try:
        result = db.db.inventory.insert_many(cleaned_items)
        return jsonify({
            "status": "success", 
            "count": len(cleaned_items),
            "inserted_ids": [str(id) for id in result.inserted_ids]
        }), 201
    except Exception as e:
        print(f"Inventory add error: {e}")
        return jsonify({"status": "error", "message": "There was an error when adding item to inventory"}), 500



## returns everything in this user's inventory

@inventory_bp.route('/list', methods=['GET'])
@token_required
def getInventory(current_user):
    user_id = str(current_user["_id"])

    # Check for status filter in query params
    # /list?status=unused  → only active items
    # /list?status=used    → only used items
    # /list                → everything
    status_filter = request.args.get("status", "")

    query = {"user_id": user_id}
    if status_filter:
        query["status"] = status_filter

    items = list(
        db.db.inventory.find(query).sort("expiry_date", 1)
    )

    for item in items:
        item["_id"] = str(item["_id"])

    return jsonify({
        "status": "success",
        "count": len(items),
        "items": items
    })



##returns the 5 items closest to expiry
# Used on the home screen dashboard

@inventory_bp.route('/expiring', methods=['GET'])
@token_required
def getExpiringItems(current_user):
    user_id = str(current_user["_id"])
    today = datetime.now().strftime("%Y-%m-%d")

    # Find items that haven't expired yet, sorted by expiry date
    # Limit to 5 because that's all the home screen shows
    items = list(
        db.db.inventory.find(
            {
                "user_id": user_id,
                "expiry_date": {"$gte": today},
                "status": "unused"
            },
            {"_id": 0}
        ).sort("expiry_date", 1).limit(5)
    )

    # Add a "days_left" field to each item so the frontend
    # can easily colour-code them (red/amber/green)
    for item in items:
        expiry = datetime.strptime(item["expiry_date"], "%Y-%m-%d")
        days_left = (expiry - datetime.now()).days
        item["days_left"] = days_left

    return jsonify({
        "status": "success",
        "count": len(items),
        "items": items
    })

##get item informations i.e total waste/ total used etc...
@inventory_bp.route('/stats', methods=['GET'])
@token_required
def getStats(current_user):
    user_id = str(current_user["_id"])
    today = datetime.now().strftime("%Y-%m-%d")
    week_from_now = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

    # Total items in stock (unused only)
    total_items = db.db.inventory.count_documents({
        "user_id": user_id,
        "status": "unused"
    })

    # Items expiring within the next 7 days
    expiring_this_week = db.db.inventory.count_documents({
        "user_id": user_id,
        "status": "unused",
        "expiry_date": {"$gte": today, "$lte": week_from_now}
    })

    # Items that have already expired (status still unused = wasted)
    wasted_items = db.db.inventory.count_documents({
        "user_id": user_id,
        "status": "unused",
        "expiry_date": {"$lt": today}
    })

    # Items marked as used (consumed before expiry = waste prevented)
    used_items = db.db.inventory.count_documents({
        "user_id": user_id,
        "status": "used"
    })

    return jsonify({
        "status": "success",
        "stats": {
            "total_items": total_items,
            "expiring_this_week": expiring_this_week,
            "wasted_items": wasted_items,
            "used_items": used_items
        }
    })

@inventory_bp.route('/delete', methods=['DELETE'])
@token_required
def deleteItem(current_user):
    data = request.get_json()
    item_id = data.get("item_id")
    user_id = str(current_user["_id"])
    
    result = db.db.inventory.delete_one({
        "_id": ObjectId(item_id),
        "user_id": user_id
    })
    
    if result.deleted_count == 0:
        return jsonify({"status": "error", "message": "Item not found"}), 404
    
    return jsonify({"status": "success", "message": "Item deleted"})

@inventory_bp.route('/use', methods=['POST'])
@token_required
def markAsUsed(current_user):
    data = request.get_json()
    item_id = data.get("item_id")
    user_id = str(current_user["_id"])

    result = db.db.inventory.update_one(
        {"_id": ObjectId(item_id), "user_id": user_id},
        {"$set": {"status": "used", "used_date": datetime.now().strftime("%Y-%m-%d")}}
    )

    if result.modified_count == 0:
        return jsonify({"status": "error", "message": "Item not found"}), 404

    return jsonify({"status": "success", "message": "Item marked as used"})