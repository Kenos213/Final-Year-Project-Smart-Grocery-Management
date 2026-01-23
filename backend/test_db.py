# Save this as test_db.py
from pymongo import MongoClient

uri = "mongodb+srv://w1919776_db_user:u4zIjbnuRPOvnt41@smartgrocerymanagmentcl.n5x7udy.mongodb.net/?appName=SmartGroceryManagmentCluster"

try:
    client = MongoClient(uri)
    # The 'ping' command is the best way to test a connection
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(f"Connection failed: {e}")