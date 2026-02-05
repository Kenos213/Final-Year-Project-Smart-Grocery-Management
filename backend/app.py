from flask import Flask, jsonify
from flask_cors import CORS
from database import db

from Core.Routes.userRoute import user_bp 
from Core.Routes.scannerRoute import scan_bp
from Core.Routes.inventoryRoute import inventory_bp


app = Flask(__name__)
CORS(app)


app.register_blueprint(user_bp, url_prefix='/user')
app.register_blueprint(scan_bp, url_prefix='/scan')
app.register_blueprint(inventory_bp, url_prefix = '/inventory')

# Add this to app.py
@app.route('/')
def home():
    return "backend should be running", 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000 ,debug=True)
