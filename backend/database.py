
import os
import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

uri = os.getenv("MONGO_URI")
client = MongoClient(uri, tlsCAFile=certifi.where())
db = client.get_database("smart_grocery_db")


try:
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
except Exception as e:
    print(e)