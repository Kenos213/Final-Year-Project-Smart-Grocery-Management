# NOVEL CODE: Waterfall Expiry Resolution System
# Priority: Manual Override → Open Food Facts → USDA FoodKeeper → Category Heuristic
# Perishable categories require manual user input; non-perishable auto-assign estimates
# Addresses reduced-to-clear edge case by flagging perishables for explicit date entry

# Categories classified as perishable — these MUST prompt the user for manual expiry input
# Rationale: items in these categories are commonly found on reduced-to-clear shelves,
# meaning category-based estimates would be unreliable and potentially misleading
PERISHABLE_CATEGORIES = {"Dairy", "Produce", "Meat", "Fish", "Bakery"}

# Categories classified as non-perishable — safe to auto-assign estimates
# Rationale: long shelf life means category defaults are reliably accurate
NON_PERISHABLE_CATEGORIES = {"Frozen", "Pantry", "Household", "Beverages", "Snacks", "Other"}

# Category-based shelf life defaults (in days from purchase date)
# Sources: USDA FoodKeeper guidelines, UK Food Standards Agency recommendations
# These serve as Tier 4 fallback in the waterfall and as suggestions for perishable items
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


def classify_expiry(item: dict) -> dict:
    """
    Applies the waterfall expiry resolution to a single item.
    Returns the item enriched with expiry metadata for the frontend.

    Waterfall priority:
        1. manual_expiry  — user override (set later on frontend)
        2. off_expiry     — Open Food Facts expiration_date field
        3. usda_days      — USDA FoodKeeper lookup (future enhancement)
        4. category_days  — category heuristic default

    Args:
        item: dict with at minimum 'name' and 'category'
    Returns:
        item enriched with: expiry_days, expiry_source, needs_manual_date, is_perishable
    """
    category = item.get("category", "Other")
    is_perishable = category in PERISHABLE_CATEGORIES

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
    """
    Classifies a list of items and separates them into two groups
    for the frontend ExpiryScreen layout.

    Returns:
        {
            "perishable": [...],      -- items needing manual date input
            "non_perishable": [...],  -- items with auto-assigned estimates
        }
    """
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
