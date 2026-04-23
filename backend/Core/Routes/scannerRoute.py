from flask import Blueprint, request, jsonify
import requests
from google import genai as google_genai
from concurrent.futures import ThreadPoolExecutor, as_completed
import base64, os, re, json
import time

from dotenv import load_dotenv
load_dotenv()

scan_bp = Blueprint('scan_bp', __name__)
# API keys 
OCR_API_KEY = os.environ.get("OCR_SPACE_API_KEY")
gemini_client = google_genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))


UK_SUPERMARKET_BRANDS = [
    "Tesco", "Sainsbury", "Sainsburys", "ASDA", "Morrisons", "Waitrose",
    "Lidl", "Aldi", "Co-op", "Coop", "Marks", "Spencer", "M&S",
    "Iceland", "Farmfoods", "Spar", "Budgens", "Londis"
]

#Removes known UK supermarket brand prefixes from a product name.
def strip_brand_prefix(name: str) -> str:
    for brand in UK_SUPERMARKET_BRANDS:
        pattern = re.compile(rf'^{re.escape(brand)}[\s\'s]*', re.IGNORECASE)
        name = pattern.sub('', name).strip()
    return name

# this is the main function that sends the raw OCR text to gemini and gets a back a cleaned up list of products with prices and categories.
# the reason for using gemini is that OCR text from receipts can be very messy and unstructured, and gemini can apply the complex logic needed to extract just the relevant product lines, match them to prices and simutaneously categorize them  all in one step. 
# This keeps our backend code simple and leverages Gemini's strengths in understanding unstructured text.
def extract_food_items_with_gemini(raw_text: str) -> list:

    prompt = f"""You are a grocery receipt parser specialised in UK supermarket receipts.

You will be given raw OCR text extracted from a receipt. This text may be messy,
contain abbreviations, or have items on the same line due to OCR column merging.

Your task:
1. Identify ONLY genuine food and household grocery product lines
2. Ignore everything else: store name, address, VAT numbers, loyalty card messages,
   payment terminal output, totals, subtotals, date/time, transaction codes
3. Clean up abbreviated product names (e.g. 'CHKN BRST 500G' -> 'Chicken Breast 500g')
4. Remove supermarket own-brand prefixes (e.g. 'Tesco Cinnamon Buns' -> 'Cinnamon Buns')
5. Match each product to its price where identifiable
6. Assign a category from: Dairy, Produce, Meat, Fish, Bakery, Beverages, Snacks, Frozen, Pantry, Household, Other

PRICE MATCHING RULES (critical for UK receipts):
- OCR often separates prices from product names onto different lines
- A line like '£2.10 £3.65 £5.75' contains prices that correspond IN ORDER to the products found elsewhere
- Match prices to products by their position/order on the receipt
- UK prices use the £ symbol and format like £2.10, £0.85, £12.99
- If a row of prices appears near product names, assign them left-to-right to products in the same order
- Only use 0.00 if genuinely no price can be identified for that item

Return ONLY a valid JSON array — no markdown, no explanation, no preamble:
[
  {{
    "name": "product name",
    "price": "0.00",
    "category": "category"
  }}
]

If no grocery items are found, return an empty array: []

Raw OCR receipt text:
---
{raw_text}
---"""

    try:
   
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=google_genai.types.GenerateContentConfig(
            temperature=0.1,
            response_mime_type="application/json"
    )
)
        raw_response = response.text.strip()

        
        raw_response = raw_response.replace("```json", "").replace("```", "").strip()

        print("--- GEMINI EXTRACTION OUTPUT ---")
        print(raw_response)
        print("--------------------------------")

        items = json.loads(raw_response)

       
        if not isinstance(items, list):
            items = items.get("items", []) 

        return items

    except json.JSONDecodeError as e:
        print(f"  Gemini JSON parse error: {e}")
        return []
    except Exception as e:
        print(f"  Gemini extraction error: {e}")
        return []


# Category heuristic defaults (Tier 4 fallback)
def enrich_with_open_food_facts(items: list) -> list:
    enriched = []

    def enrich_single(item):
        name = strip_brand_prefix(item.get("name", "").strip())
        price = str(item.get("price", "0.00"))
        category = item.get("category", "Other")

        if not name:
            return None

        print(f"  Enriching: '{name}' ({category}) @ £{price}")
        off_data = search_open_food_facts(name)

        return {
            "name": off_data["name"],
            "brand": off_data["brand"],
            "price": price,
            "category": category,
            "verified": off_data["verified"],
            "image_url": off_data["image_url"],
            "source": "gemini_text_off_enriched"
        }

   
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(enrich_single, item): item for item in items}
        for future in as_completed(futures):
            result = future.result()
            if result:
                enriched.append(result)

    return enriched


# this function takes the cleaned list of products from gemini and sends each one to open food facts to get verified product data
def search_open_food_facts(product_name: str) -> dict:
  
    print(f"    OFF search: '{product_name}'")
    url = "https://world.openfoodfacts.org/cgi/search.pl"
    params = {
        "search_terms": product_name,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page_size": 1,
        "lc": "en",
        "cc": "gb",
    }
    headers = {
        "User-Agent": "SmartGroceryApp/1.0 (contact: w1919776@westminster.ac.uk)"
    }
    try:
        response = requests.get(url, params=params, headers=headers, timeout=3)
        data = response.json()
        products = data.get("products", [])
        if products:
            top = products[0]
            verified_name = top.get("product_name", "").strip()
            verified_brand = top.get("brands", "").strip()
            if verified_name:
                print(f"    OFF match: '{verified_name}' by '{verified_brand}'")
                return {
                        "name": verified_name.title(),
                        "brand": verified_brand if verified_brand else "Unknown Brand",
                        "verified": True,
                        "image_url": top.get("image_front_small_url", "")
                    }
    except Exception as e:
        print(f"    OFF search error: {e}")

 
    return {
        "name": product_name.title(),
        "brand": "Unknown Brand",
        "verified": False,
        "image_url": ""
    }

# this function formats the final response to the front end after all the processing is done.
def ReceiptQueue(items_list, source_type="unknown"):
    return {
        "status": "success",
        "type": source_type,
        "count": len(items_list),
        "queue": items_list
    }


# Maps Open Food Facts category tags to app's category system
OFF_CATEGORY_MAP = {
    "meats": "Meat", "poultry": "Meat", "beef": "Meat", "chicken": "Meat", "pork": "Meat",
    "fish": "Fish", "seafood": "Fish", "salmon": "Fish", "tuna": "Fish",
    "dairy": "Dairy", "milk": "Dairy", "cheese": "Dairy", "yogurt": "Dairy", "butter": "Dairy",
    "bread": "Bakery", "bakery": "Bakery", "pastries": "Bakery", "cakes": "Bakery",
    "fruit": "Produce", "vegetable": "Produce", "salad": "Produce",
    "frozen": "Frozen", "ice cream": "Frozen",
    "beverage": "Beverages", "drink": "Beverages", "juice": "Beverages", "water": "Beverages", "soda": "Beverages",
    "snack": "Snacks", "crisp": "Snacks", "chocolate": "Snacks", "sweet": "Snacks", "biscuit": "Snacks",
    "cereal": "Pantry", "pasta": "Pantry", "rice": "Pantry", "sauce": "Pantry", "soup": "Pantry", "canned": "Pantry",
    "cleaning": "Household", "detergent": "Household", "tissue": "Household",
}

#Checks OFF category string against our mapping
def classify_off_category(categories_tag: str) -> str:
    
    lower = categories_tag.lower()
    for keyword, category in OFF_CATEGORY_MAP.items():
        if keyword in lower:
            return category
    return "Other"

# looks up a product on open food faacts by barcode and returns its metadata
def productFunction(barcode_id):
    print(f"Barcode lookup: {barcode_id}")
    url = f"https://world.openfoodfacts.org/api/v2/product/{barcode_id}.json"
    headers = {"User-Agent": "SmartGroceryApp/1.0 (contact: w1919776@westminster.ac.uk)"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == 1:
                product = data.get("product", {})
                
                # Get category from OFF's categories field
                off_categories = product.get("categories", "")
                category = classify_off_category(off_categories)

                return {
                    "name": product.get("product_name", "Unknown Product"),
                    "brand": product.get("brands", "Unknown Brand"),
                    "image_url": product.get("image_front_small_url", ""),
                    "category": category
                }
            return {"name": "Unknown Item", "brand": "Not available", "image_url": "", "category": "Other"}
    except Exception as e:
        print(f"Open Food Facts barcode error: {e}")
    return None

#This route handles the OCR receipt scanning as it recives the base64 image from the front end and then sends it to the OCR space API
@scan_bp.route('/ocr', methods=['POST'])
def handle_ocr_scan():
    data = request.get_json()
    base64_image = data.get('image')

    t0 = time.time()

    if not base64_image:
        return jsonify({"error": "No image data received"}), 400

    if "," in base64_image:
        base64_image = base64_image.split(",")[1]

    try:
        # Stage 1: OCR space
        print("Stage 1: Sending to OCR.space")
        payload = {
            'apikey': OCR_API_KEY,
            'base64Image': f'data:image/jpeg;base64,{base64_image}',
            'language': 'eng',
            'isOverlayRequired': False,
            'detectOrientation': True,
            'scale': True,
            'OCREngine': 2,
            'isTable': True,
        }

        ocr_response = requests.post(
            'https://api.ocr.space/parse/image',
            data=payload,
            timeout=15
        )
        print("Stage 1: OCR.space responded")
        

        ocr_result = ocr_response.json()

        if ocr_result.get("IsErroredOnProcessing"):
            raise Exception(f"OCR.space error: {ocr_result.get('ErrorMessage')}")

        raw_text = ocr_result["ParsedResults"][0]["ParsedText"]
        print("--- OCR.space RAW OUTPUT ---")
        print(raw_text)
        print("----------------------------")
        print(f"Stage 1 (OCR.space): {time.time() - t0:.1f}s")

        t1 = time.time()
        # Stage 2: Gemini
        print("Stage 2: Sending to Gemini...")
        gemini_items = extract_food_items_with_gemini(raw_text)
        print(f"Stage 2: Gemini returned {len(gemini_items)} items")

        if not gemini_items:
            return jsonify({
                "status": "success",
                "type": "ocrspace_gemini_receipt",
                "count": 0,
                "queue": [],
                "message": "No grocery items detected."
            }), 200

        print(f"⏱ Stage 2 (Gemini): {time.time() - t1:.1f}s")

        t2 = time.time()
        # Stage 3: Open Food Facts
        print("Stage 3: Enriching with Open Food Facts...")
        enriched_items = enrich_with_open_food_facts(gemini_items)
        print(f"Stage 3: Enrichment complete — {len(enriched_items)} items")

        print(f"Stage 3 (OFF): {time.time() - t2:.1f}s")

        print(f"TOTAL: {time.time() - t0:.1f}s")

        return jsonify(ReceiptQueue(enriched_items, "ocrspace_gemini_receipt"))

    except requests.exceptions.Timeout:
        print("TIMEOUT: One of the external APIs timed out")
        return jsonify({"error": "Processing timed out. Please try again."}), 504

    except Exception as e:
        print(f"OCR ERROR: {e}")
        return jsonify({"error": "Failed to process receipt"}), 500



#this function handles singular scanned items and gets their specified data
@scan_bp.route('/barcode', methods=['POST'])
def handle_barcode():
    data = request.get_json()
    barcode_id = data.get('barcode')

    if not barcode_id:
        return jsonify({"error": "No barcode received"}), 400

    result = {
        "status": "success",
        "id": barcode_id,
        "item_name": "Unknown",
        "brand": "Unknown Brand",
        "category": "Other",
        "image_url": "",
        "type": "Product"
    }

    if len(barcode_id) == 13 or len(barcode_id) == 8:
        product_info = productFunction(barcode_id)
        if product_info:
            result["item_name"] = product_info["name"]
            result["brand"] = product_info["brand"]
            result["image_url"] = product_info.get("image_url", "")
            result["category"] = product_info.get("category", "Other")

    return jsonify(result)