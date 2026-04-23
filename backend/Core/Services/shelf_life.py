

# Categories classified as perishable 
PERISHABLES = {"Dairy", "Produce", "Meat", "Fish", "Bakery"}

# Categories classified as non-perishable 
NON_PERISHABLE = {"Frozen", "Pantry", "Household", "Beverages", "Snacks", "Other"}

# Category-based shelf life defaults 
SHELF_LIFE_DEFAULTS = {
    # Perishable — used as SUGGESTIONS only, not auto-assigned
    "Dairy":      7,
    "Produce":    5,
    "Meat":       3,
    "Fish":       2,
    "Bakery":     4,

    # Non-perishable — auto-assigned with confidence
    "Frozen":     90,
    "Pantry":     180,
    "Beverages":  14,
    "Snacks":     60,
    "Household":  365,
    "Other":      30,
}

# This file contains the core logic for classifying items by expiry and perishability,
# which feeds into the frontend's ExpiryScreen and the analysis insights.

# The classify_expiry function applies the waterfall logic to determine an item's expiry date and source.
# The classify_all_items function processes a list of items and separates them into perishable and non

###  water fall priority for expiry date resolution:
# 1. manual_expiry  — user override (set later on frontend)
# 2. off_expiry     — Open Food Facts expiration_date field
# 3. usda_days      — USDA FoodKeeper lookup (future enhancement)
# 4. category_days  — category heuristic default

def classify_expiry(item: dict) -> dict:
    
    category = item.get("category", "Other")
    is_perishable = category in PERISHABLES

    # Tier 2: Check if Open Food Facts returned an expiry date
    off_expiry = item.get("off_expiry_date", None)
    if off_expiry:
        item["expiry_date"] = off_expiry
        item["expiry_source"] = "open_food_facts"
        item["needs_manual_date"] = False
        item["is_perishable"] = is_perishable
        return item

    # Tier 4: Category heuristic (Tier 3 USDA is a future enhancement)
    default_days = SHELF_LIFE_DEFAULTS.get(category, 30)

    item["expiry_days"] = default_days
    item["expiry_source"] = "category_estimate"
    item["is_perishable"] = is_perishable

    # Perishable items: provide suggestion but flag for manual entry
    # Non-perishable items: auto-assign the estimate with confidence
    item["needs_manual_date"] = is_perishable

    return item


def classify_all_items(items: list) -> dict:
    
    perishable = []
    non_perishable = []

    for item in items:
        classified = classify_expiry(item)

        if classified["needs_manual_date"]:
            perishable.append(classified)
        else:
            non_perishable.append(classified)

    return {
        "perishable": perishable,
        "non_perishable": non_perishable,
    }
