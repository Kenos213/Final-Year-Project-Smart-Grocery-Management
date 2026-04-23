"""
a demo script
Running this once to populate a demo user's account with somewhat realistic grocery data.
it will reates a full purchase history across multiple weeks so all features work:
  - Home screen: expiring items and stats
  - Inventory: items with various expiry dates
  - Analysis: used vs wasted items with money values
  - Predictive: repeat purchases for SMA/ML predictions
  - Habits: category waste breakdown with varied rates


  jusr run this in the terminal python seed_demo.py


"""

import os
import certifi
from pymongo import MongoClient
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Connect to MongoDB
uri = os.getenv("MONGO_URI")
client = MongoClient(uri, tlsCAFile=certifi.where())
db = client.get_database("smart_grocery_db")

# demo user
DEMO_EMAIL = "demo@smartgrocery.com"
DEMO_PASSWORD = "demo123"
DEMO_NAME = "Demo User"

def create_demo_user():
    
    # Delete existing demo user and their data
    existing = db.users.find_one({"email": DEMO_EMAIL})
    if existing:
        user_id = str(existing["_id"])
        db.inventory.delete_many({"user_id": user_id})
        db.users.delete_one({"email": DEMO_EMAIL})
        print(f"Cleared existing demo data")

    # Create fresh demo user
    result = db.users.insert_one({
        "name": DEMO_NAME,
        "email": DEMO_EMAIL,
        "password": generate_password_hash(DEMO_PASSWORD),
        "created_at": datetime.utcnow(),
    })

    user_id = str(result.inserted_id)
    print(f"Created demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
    print(f"User ID: {user_id}")
    return user_id

##Populate inventory with realistic grocery data
def seed_inventory(user_id):
    today = datetime.now()
    items = []

    #Currently in stock (various expiry dates) ──
    # These show on the home screen and inventory
    active_items = [
        {"name": "Semi Skimmed Milk 2L", "brand": "Tesco", "price": "1.45", "category": "Dairy", "expiry_days": 0},
        {"name": "Chicken Breast Fillets", "brand": "Tesco", "price": "3.65", "category": "Meat", "expiry_days": 1},
        {"name": "Hovis Wholemeal Bread", "brand": "Hovis", "price": "1.40", "category": "Bakery", "expiry_days": 2},
        {"name": "Bananas Loose", "brand": "Unknown", "price": "0.75", "category": "Produce", "expiry_days": 3},
        {"name": "Cathedral City Cheddar", "brand": "Cathedral City", "price": "3.25", "category": "Dairy", "expiry_days": 5},
        {"name": "Innocent Orange Juice 900ml", "brand": "Innocent", "price": "3.65", "category": "Beverages", "expiry_days": 7},
        {"name": "Birds Eye Garden Peas 900g", "brand": "Birds Eye", "price": "2.00", "category": "Frozen", "expiry_days": 90},
        {"name": "Napolina Fusilli Pasta 500g", "brand": "Napolina", "price": "1.20", "category": "Pantry", "expiry_days": 180},
        {"name": "Heinz Baked Beans 415g", "brand": "Heinz", "price": "1.10", "category": "Pantry", "expiry_days": 365},
        {"name": "Lurpak Butter 250g", "brand": "Lurpak", "price": "2.35", "category": "Dairy", "expiry_days": 14},
        {"name": "Salmon Fillets 2 Pack", "brand": "Tesco", "price": "4.50", "category": "Fish", "expiry_days": 2},
        {"name": "Warburtons Crumpets 6 Pack", "brand": "Warburtons", "price": "1.20", "category": "Bakery", "expiry_days": 4},
    ]

    for item in active_items:
        expiry = today + timedelta(days=item["expiry_days"])
        items.append({
            "user_id": user_id,
            "name": item["name"],
            "brand": item["brand"],
            "price": item["price"],
            "category": item["category"],
            "source": "receipt",
            "added_date": today.strftime("%Y-%m-%d"),
            "expiry_date": expiry.strftime("%Y-%m-%d"),
            "expiry_source": "manual",
            "image_url": "",
            "status": "unused",
        })

    #### Used items (consumed before expiry = money saved)
    # These feed the analysis charts
    used_items = [
        {"name": "Semi Skimmed Milk 2L", "brand": "Tesco", "price": "1.45", "category": "Dairy", "weeks_ago": 1},
        {"name": "Semi Skimmed Milk 2L", "brand": "Tesco", "price": "1.45", "category": "Dairy", "weeks_ago": 2},
        {"name": "Semi Skimmed Milk 2L", "brand": "Tesco", "price": "1.45", "category": "Dairy", "weeks_ago": 3},
        {"name": "Semi Skimmed Milk 2L", "brand": "Tesco", "price": "1.45", "category": "Dairy", "weeks_ago": 4},
        {"name": "Chicken Breast Fillets", "brand": "Tesco", "price": "3.65", "category": "Meat", "weeks_ago": 1},
        {"name": "Chicken Breast Fillets", "brand": "Tesco", "price": "3.65", "category": "Meat", "weeks_ago": 2},
        {"name": "Chicken Breast Fillets", "brand": "Tesco", "price": "3.65", "category": "Meat", "weeks_ago": 3},
        {"name": "Hovis Wholemeal Bread", "brand": "Hovis", "price": "1.40", "category": "Bakery", "weeks_ago": 1},
        {"name": "Hovis Wholemeal Bread", "brand": "Hovis", "price": "1.40", "category": "Bakery", "weeks_ago": 2},
        {"name": "Hovis Wholemeal Bread", "brand": "Hovis", "price": "1.40", "category": "Bakery", "weeks_ago": 3},
        {"name": "Bananas Loose", "brand": "Unknown", "price": "0.75", "category": "Produce", "weeks_ago": 1},
        {"name": "Bananas Loose", "brand": "Unknown", "price": "0.75", "category": "Produce", "weeks_ago": 2},
        {"name": "Heinz Baked Beans 415g", "brand": "Heinz", "price": "1.10", "category": "Pantry", "weeks_ago": 3},
        {"name": "Heinz Baked Beans 415g", "brand": "Heinz", "price": "1.10", "category": "Pantry", "weeks_ago": 6},
        {"name": "Napolina Fusilli Pasta 500g", "brand": "Napolina", "price": "1.20", "category": "Pantry", "weeks_ago": 2},
        {"name": "Napolina Fusilli Pasta 500g", "brand": "Napolina", "price": "1.20", "category": "Pantry", "weeks_ago": 5},
        {"name": "Cathedral City Cheddar", "brand": "Cathedral City", "price": "3.25", "category": "Dairy", "weeks_ago": 2},
        {"name": "Cathedral City Cheddar", "brand": "Cathedral City", "price": "3.25", "category": "Dairy", "weeks_ago": 4},
        {"name": "Innocent Orange Juice 900ml", "brand": "Innocent", "price": "3.65", "category": "Beverages", "weeks_ago": 2},
        {"name": "Lurpak Butter 250g", "brand": "Lurpak", "price": "2.35", "category": "Dairy", "weeks_ago": 3},
        {"name": "Birds Eye Garden Peas 900g", "brand": "Birds Eye", "price": "2.00", "category": "Frozen", "weeks_ago": 4},
        {"name": "Salmon Fillets 2 Pack", "brand": "Tesco", "price": "4.50", "category": "Fish", "weeks_ago": 2},
    ]

    for item in used_items:
        added = today - timedelta(weeks=item["weeks_ago"])
        expiry = added + timedelta(days=7)
        items.append({
            "user_id": user_id,
            "name": item["name"],
            "brand": item["brand"],
            "price": item["price"],
            "category": item["category"],
            "source": "receipt",
            "added_date": added.strftime("%Y-%m-%d"),
            "expiry_date": expiry.strftime("%Y-%m-%d"),
            "expiry_source": "manual",
            "image_url": "",
            "status": "used",
            "used_date": (added + timedelta(days=5)).strftime("%Y-%m-%d"),
        })

    # ##Wasted items (expired without being used) ──
    # #These create the waste data for analysis
    wasted_items = [
        {"name": "Semi Skimmed Milk 2L", "brand": "Tesco", "price": "1.45", "category": "Dairy", "weeks_ago": 5},
        {"name": "Yoghurt Multipack", "brand": "Muller", "price": "2.50", "category": "Dairy", "weeks_ago": 3},
        {"name": "Strawberries 400g", "brand": "Tesco", "price": "2.00", "category": "Produce", "weeks_ago": 2},
        {"name": "Avocados Pack of 2", "brand": "Unknown", "price": "1.80", "category": "Produce", "weeks_ago": 4},
        {"name": "Bananas Loose", "brand": "Unknown", "price": "0.75", "category": "Produce", "weeks_ago": 3},
        {"name": "Chicken Breast Fillets", "brand": "Tesco", "price": "3.65", "category": "Meat", "weeks_ago": 5},
        {"name": "Salmon Fillets 2 Pack", "brand": "Tesco", "price": "4.50", "category": "Fish", "weeks_ago": 4},
        {"name": "Hovis Wholemeal Bread", "brand": "Hovis", "price": "1.40", "category": "Bakery", "weeks_ago": 4},
    ]

    for item in wasted_items:
        added = today - timedelta(weeks=item["weeks_ago"])
        expiry = added + timedelta(days=5)
        items.append({
            "user_id": user_id,
            "name": item["name"],
            "brand": item["brand"],
            "price": item["price"],
            "category": item["category"],
            "source": "receipt",
            "added_date": added.strftime("%Y-%m-%d"),
            "expiry_date": expiry.strftime("%Y-%m-%d"),
            "expiry_source": "manual",
            "image_url": "",
            "status": "unused",
        })

    # Insert all items
    result = db.inventory.insert_many(items)
    print(f"Inserted {len(result.inserted_ids)} items:")
    print(f"  Active: {len(active_items)}")
    print(f"  Used: {len(used_items)}")
    print(f"  Wasted: {len(wasted_items)}")


if __name__ == "__main__":
    print("Smart Grocery Demo Seed is not redy to run\n")
    user_id = create_demo_user()
    seed_inventory(user_id)
    print(f"\nDone! Login with:")
    print(f"  Email: {DEMO_EMAIL}")
    print(f"  Password: {DEMO_PASSWORD}")
