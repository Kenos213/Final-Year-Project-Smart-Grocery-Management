from flask import Flask, jsonify
from flask_cors import CORS
from database import db

from Core.Routes.userRoute import user_bp 
from Core.Routes.scannerRoute import scan_bp
from Core.Routes.inventoryRoute import inventory_bp
from Core.Routes.recipeRoute import recipe_bp
from Core.Routes.analysisRoute import analysis_bp
from Core.Routes.predictiveRoute  import predictive_bp
from Core.Routes.habitsRoute import habits_bp

app = Flask(__name__)
CORS(app)


app.register_blueprint(user_bp, url_prefix='/user')
app.register_blueprint(scan_bp, url_prefix='/scan')
app.register_blueprint(inventory_bp, url_prefix = '/inventory')
app.register_blueprint(recipe_bp, url_prefix='/recipes')
app.register_blueprint(analysis_bp, url_prefix='/analysis')
app.register_blueprint(predictive_bp, url_prefix='/predictive')
app.register_blueprint(habits_bp, url_prefix='/habits')

# Add this to app.py
@app.route('/')
def home():
    return "backend should be running", 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000 ,debug=True)
