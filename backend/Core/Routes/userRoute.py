from flask import Blueprint, jsonify, request
from database import db
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import os
import datetime
from functools import wraps
from bson.objectid import ObjectId



user_bp = Blueprint('user_bp', __name__)

# my secret key used to sign JWT tokens 
JWT_SECRET = os.environ.get("JWT_SECRET", "change-this-to-something-random")



# checks if the user is logged in

# This is a decorator that checks their token is valid
# before letting the request through.

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            return jsonify({"error": "Login required"}), 401

        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            # Convert string back to ObjectId for MongoDB lookup
            current_user = db.users.find_one({"_id": ObjectId(data["user_id"])})

            if not current_user:
                return jsonify({"error": "User not found"}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired. Please login again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(current_user, *args, **kwargs)

    return decorated



# create a new account

@user_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    # Basic validation to keep it simple
    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    # preventing duplicate accounts with the same email
    if db.users.find_one({"email": email}):
        return jsonify({"error": "An account with this email already exists"}), 409

    # hashing the password so i dont store plaintext into the database 
    hashed_password = generate_password_hash(password)

    result = db.users.insert_one({
        "name": name,
        "email": email,
        "password": hashed_password,
        "created_at": datetime.datetime.utcnow(),
    })

  
    user_id = str(result.inserted_id)

   # creating a jwt for the new user 
    token = jwt.encode({ 
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, JWT_SECRET, algorithm="HS256")

    return jsonify({
        "status": "success",
        "message": "Account created",
        "token": token,
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
        }
    }), 201



@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Find the user by email
    user = db.users.find_one({"email": email})

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    # Checking the password against the hashed version in the database via check_password_hash
    
    if not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401


    user_id = str(user["_id"])

    # creating a jwt for the logged in user
    token = jwt.encode({
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30)
    }, JWT_SECRET, algorithm="HS256")

    return jsonify({
        "status": "success",
        "token": token,
        "user": {
            "id": user_id,
            "name": user["name"],
            "email": user["email"],
        }
    })



##returns the logged-in user's info

@user_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    # current_user is passed in by the @token_required decorator
    # It's the full user document from MongoDB
    return jsonify({
        "status": "success",
        "user": {
            "id": str(current_user["_id"]),
            "name": current_user["name"],
            "email": current_user["email"],
        }
    })



# change name or email

@user_bp.route('/update', methods=['POST'])
@token_required
def update_profile(current_user):
    data = request.get_json()

    # Only update fields that were actually sent
    updates = {}
    if data.get('name'):
        updates['name'] = data['name'].strip()
    if data.get('email'):
        updates['email'] = data['email'].strip().lower()

    if not updates:
        return jsonify({"error": "Nothing to update"}), 400

    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": updates}
    )

    return jsonify({"status": "success", "message": "Profile updated"})



# deletes the user and all their inventory data

@user_bp.route('/delete', methods=['DELETE'])
@token_required
def delete_profile(current_user):
    # Delete the user and all their inventory data
    db.users.delete_one({"_id": current_user["_id"]})
    db.inventory.delete_many({"user_id": str(current_user["_id"])})

    ## add function later for deleting all inventory items with user_id matching the deleted user's id

    return jsonify({"status": "success", "message": "Account deleted"})

@user_bp.route('/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({"error": "All fields are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    # Verify the current password matches
    if not check_password_hash(current_user["password"], current_password):
        print("Password mismatch for user:", current_user["email"])
        return jsonify({"error": "Current password is incorrect"}), 406

    # Update with new hashed password
    db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password": generate_password_hash(new_password)}}
    )

    return jsonify({"status": "success", "message": "Password updated"})

# Mark an inventory item as used(consumed)
@user_bp.route('/use', methods=['POST'])
@token_required
def markAsUsed(current_user):
    data = request.get_json()
    item_id = data.get("item_id")
    user_id = str(current_user["_id"])

    result = db.db.inventory.update_one(
        {"_id": ObjectId(item_id), "user_id": user_id},
        {"$set": {"status": "used", "used_date": datetime.now().strftime("%Y-%m-%d")}}
    )

    if result.modified_count == 0:
        return jsonify({"status": "error", "message": "Item not found"}), 404

    return jsonify({"status": "success", "message": "Item marked as used"})