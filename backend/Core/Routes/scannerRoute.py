from flask import Blueprint, request, jsonify
import requests
import pytesseract
from PIL import Image, ImageOps, ImageEnhance
import io
import base64
import re

scan_bp = Blueprint('scan_bp', __name__)



def ReceiptQueue(items_list, source_type="unknown"):
   
    return {
        "status": "success",
        "type": source_type,
        "count": len(items_list),
        "queue": items_list 
    }

def textSearch(raw_text):
    found_items = []
    lines = raw_text.split('\n')
    
   
    price_pattern = r'(\d+[\.\,]\d{2})'
    

    def is_junk(text):
        if len(text) < 3: return True
     
        letters = sum(c.isalpha() for c in text)
        return letters < (len(text) / 2) 

    banned_words = ["TOTAL", "SUBTOTAL", "BALANCE", "VISA", "CHANGE", "CASH", "EUR", "GBP"]

    for line in lines:
        clean_line = line.strip()
        price_match = re.search(price_pattern, clean_line)
        
        if price_match:
            name_part = clean_line[:price_match.start()].strip()
          
            name_part = re.sub(r'^[\d\s\W]+', '', name_part)

            
            if not is_junk(name_part) and not any(b in name_part.upper() for b in banned_words):
                found_items.append({
                    "name": name_part,
                    "brand": "Unknown (Receipt)",
                    "price": price_match.group(1),
                    "verified": False 
                })
                
    return found_items

def productFunction(barcode_id):
    print(f"Searching Open Food Facts for: {barcode_id}")
    
    
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode_id}.json"
    
    
    headers = {
        'User-Agent': 'SmartGroceryApp/1.0 (contact: w1919776@westminster.ac.uk)'
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
          
         
            if data.get("status") == 1:
                product = data.get("product", {})
                item_name = product.get("product_name", "Unknown Product")
                brand = product.get("brands", "Unknown Brand")
                
               
                print(f"Found {item_name} by {brand}")
                return {"name": item_name, "brand": brand}
            else:
                print("Barcode not in Open Food Facts database.")
                return {"name": "Unknown Item", "brand": "Not avalible"}
        else:
            print(f"ERROR: API returned status {response.status_code}")
            
    except Exception as e:
        print("Error when attempting to access API")
    
    return None

@scan_bp.route('/ocr', methods=['POST'])
def handle_ocr_scan():
    data = request.get_json()
    base64_image = data.get('image')

    if not base64_image:
        return jsonify({"error": "No image data received"}), 400

    try:
   
        image_data = base64.b64decode(base64_image)
        img = Image.open(io.BytesIO(image_data))

       
        img = ImageOps.grayscale(img) 
        # enhancer = ImageEnhance.Contrast(img)
        # img = enhancer.enhance(2.0)   
        
        try:
            img = ImageOps.exif_transpose(img)
        except:
            pass 

       
        raw_text = pytesseract.image_to_string(img) 
        
        print("---------------- OCR RAW OUTPUT START ----------------")
        print(raw_text)
        print("---------------- OCR RAW OUTPUT END ------------------")
        
        
        items = textSearch(raw_text)
        
        return jsonify(ReceiptQueue(items, "ocr_receipt"))

    except Exception as e:
        print("OCR ERROR: There was an error when processing image ")
        return jsonify({"error": "Failed to process image"}), 500


@scan_bp.route('/barcode', methods=['POST'])
def handle_barcode():
    data = request.get_json()
    barcode_id = data.get('barcode')

    if not barcode_id:
        return jsonify({"error": "No barcode received"}), 400

   
    result = {"status": "success", "id": barcode_id, "item_name": "Unknown","type" : "Product"}

    if len(barcode_id) == 13:
        product_info = productFunction(barcode_id)
        if product_info:
            result["item_name"] = product_info["name"]
            result["brand"] = product_info["brand"]

    elif len(barcode_id) > 15:
        result["type"] = "receipt_trigger"
        result["message"] = "Receipt detected. Switching to camera."

    return jsonify(result)


