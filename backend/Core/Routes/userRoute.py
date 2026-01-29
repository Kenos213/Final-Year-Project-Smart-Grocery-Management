from flask import Blueprint, jsonify, request
from database import db


user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/profile', methods=['GET'])
def get_profile():
    return jsonify({"message": "This is user profile data"})