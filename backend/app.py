from flask import Flask, jsonify
from flask_cors import CORS
from database import db

from Core.Routes.userRoute import user_bp 
from Core.Routes.scannerRoute import scan_bp


app = Flask(__name__)
CORS(app)


app.register_blueprint(user_bp, url_prefix='/user')
app.register_blueprint(scan_bp, url_prefix='/scan')


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8000 ,debug=True)
