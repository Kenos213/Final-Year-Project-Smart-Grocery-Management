import pytesseract
from PIL import Image
from flask import Blueprint, request, jsonify
import io

scan_bp = Blueprint('scan_bp', __name__)



@scan_bp.route('/receipt', methods=['POST'])
def scan_receipt():
    if 'image' not in request.files:
        return jsonify({"error": "No image uploaded"}), 400
    

    file = request.files['image']
    img = Image.open(file.stream)
    

    raw_text = pytesseract.image_to_string(img)
    
    
    return jsonify({
        "message": "Scan successful",
        "raw_content": raw_text
    })