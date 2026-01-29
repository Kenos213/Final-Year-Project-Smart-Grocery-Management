from datetime import datetime, timedelta


def addItem():
    print("Adding items will begin here")
    print("Paramters: accept single item")

def removingItem():
    print("Removing items will begin here")
    print("Paramters: accept single item or list")

def updateItem():
    print("update specified item")
    print("paramters: unknown")

def displayInventory():
    print("Display all items")
    print("Parameters unknown")

pipeline = [
    {"$match": {"status": "in-stock"}},
    {"$group": {"_id": "$name", "total_qty": {"$sum": "$quantity"}}}
]
summary = list(db.inventory.aggregate(pipeline))

# This returns: [{"_id": "Milk", "total_qty": 6}, {"_id": "Eggs", "total_qty": 12}]