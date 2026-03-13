from flask import Blueprint, request, jsonify
import database as db  
from datetime import datetime, timedelta

inventory_bp = Blueprint('inventory_bp', __name__)

@inventory_bp.route('/add', methods=['POST']) 
def addToInventory():
    data = request.get_json()
    items_to_add = data.get('items', [])
    
    if not items_to_add:
        return jsonify({"status": "error", "message": "No items provided"}), 400

    current_date = datetime.now()
    expiry_date = current_date + timedelta(days=7)

    cleaned_items = []
    for item in items_to_add:
        cleaned_items.append({
           
            "name": item.get("name", "Unknown Item"),
            "brand": item.get("brand", "Unknown Brand"),
            "price": item.get("price", "0.00"),
            "source": item.get("source", "unknown"),
            "category": item.get("category", "uncategorized"),
            "added_date": current_date.strftime("%Y-%m-%d"),
            "expiry_date": expiry_date.strftime("%Y-%m-%d"),
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
        return jsonify({"status": "error", "message": "There was an error when adding item to inventory"}), 500