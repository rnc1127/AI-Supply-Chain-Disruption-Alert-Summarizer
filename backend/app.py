import os
import urllib.request
import urllib.error
import json
import time
import sys

# Ensure the backend directory is in the python search path for Vercel deployment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, send_from_directory
import db_helper

app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Ensure DB is initialized
db_helper.init_db()

# Helper to load API key from environment or .env file
def get_api_key():
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        try:
            env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
            if os.path.exists(env_path):
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        if '=' in line:
                            k, v = line.strip().split('=', 1)
                            if k.strip() == 'GEMINI_API_KEY':
                                return v.strip().strip('"').strip("'")
        except Exception as e:
            print(f"Error reading .env file: {e}")
    return api_key

def generate_summary_with_ai(admin, supplier, inputs):
    api_key = get_api_key()
    if not api_key:
        raise ValueError("No Gemini API key configured. Falling back to mock generator.")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    prompt = f"""
You are an advanced AI Supply Chain Analyst working for Manikanta Enterprises, a goods distribution and supply company in Hyderabad.
You need to analyze a supplier communication about delays or shortages, and summarize the customer impact, affected orders, and recommended response actions.

Input Data:
- Admin Who Logged This: {admin}
- Supplier Name: {supplier}
- Supplier Communication Details: {inputs}

Instructions:
Generate a structured analysis of this disruption.
You MUST respond with a valid JSON object only. Do NOT include markdown formatting like ```json or ```, just the raw JSON. The JSON must have the following structure:
{{
  "summary": "A clear, professional 2-3 sentence summary of the delay/shortage, highlighting the key reasons and timeline.",
  "customer_impact": "Detailed assessment of which retail dealers, shopkeepers, or institutional buyers in Hyderabad will be affected and how (e.g. credit/repeat order relations, stockout risks).",
  "affected_orders": [
    "Specific estimate of orders or product types that will be delayed (e.g., 2.5sq mm cables, mild steel sheets, cement bags).",
    "Identify timeline of impacted orders based on the supplier details."
  ],
  "recommended_actions": [
    "Immediate action: e.g., Notify retail dealers in Hyderabad of delay by X days.",
    "Mitigation action: e.g., Check inventory level at Hyderabad warehousing units for alternative stock.",
    "Proactive outreach: e.g., Offer temporary substitutes or alternative brands.",
    "Operations action: e.g., Adjust credit limits or dispatch schedules."
  ]
}}
"""

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }]
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    # Send request with a 15-second timeout
    with urllib.request.urlopen(req, timeout=15) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        
    # Extract text content
    text_content = res_data['candidates'][0]['content']['parts'][0]['text']
    
    # Strip markdown if model returned it despite instructions
    text_content = text_content.strip()
    if text_content.startswith("```"):
        lines = text_content.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines[-1].startswith("```"):
            lines = lines[:-1]
        text_content = "\n".join(lines).strip()
        
    return json.loads(text_content)

def generate_mock_summary(admin, supplier, inputs):
    # Analyze keywords in inputs for custom high-quality mock data
    inputs_lower = inputs.lower()
    
    if "steel" in inputs_lower:
        summary = f"Supplier {supplier} reported a delay of 5 days in delivering mild steel sheets due to an electrical failure at their Hyderabad smelting furnace. Expected repair completion is June 14th."
        customer_impact = "High impact on local construction retail dealers and metal fabrication shops waiting for repeating steel sheet deliveries. May lead to projects halting and shopkeepers seeking alternative distributors on credit."
        affected_orders = [
            "All pending steel sheet delivery orders scheduled between June 12th and June 17th.",
            "Approx. 10-15 tons of mild steel sheets across 8 major retail accounts."
        ]
        recommended_actions = [
            "Notify the 8 affected retail dealers about the 5-day delivery delay immediately.",
            "Check current inventory of steel sheets in Hyderabad warehouses for safety stock.",
            "Source emergency steel sheet supplies from regional distributors if available.",
            "Renegotiate delivery schedules for active construction site buyers."
        ]
    elif "cement" in inputs_lower or "bag" in inputs_lower:
        summary = f"Supplier {supplier} announced a temporary shortage of waterproof packaging materials, affecting synthetic paper bags delivery. Restocking is delayed."
        customer_impact = "Medium impact. Retailers who specifically order premium cement in waterproof bags will face stockouts. Risk of dealers switching to competitor supply if not handled proactively."
        affected_orders = [
            "Order of 50,000 cement bags scheduled for mid-June.",
            "4 major institutional buyers with active building sites."
        ]
        recommended_actions = [
            "Contact institutional buyers to offer standard paper bags immediately as a substitute.",
            "Offer a 2% credit discount to dealers who accept standard packaging for repeat orders.",
            "Pause outbound scheduling for waterproof bags until supplier restocks.",
            "Allocate available waterproof cement stock only to priority repeat-order accounts."
        ]
    elif "strike" in inputs_lower or "logistics" in inputs_lower or "transport" in inputs_lower:
        summary = f"A regional transport union strike at the Andhra border checkpost has halted {supplier} cargo carrying plumbing fixtures and hardware parts. Resolution expected in 48-72 hours."
        customer_impact = "High impact across all goods distribution networks. All retail shopkeepers in Hyderabad expecting repeat orders of plumbing fixtures and hardware will experience 2-3 day stockouts."
        affected_orders = [
            "Incoming freight containing plumbing fixtures and brass fittings from Nagpur.",
            "12 pending retail store dispatches in Hyderabad."
        ]
        recommended_actions = [
            "Send broadcast updates to all Hyderabad hardware retail networks about the border checkpost strike.",
            "Route urgent pending dispatches through local secondary logistics providers.",
            "Verify alternative rail-freight or light-vehicle pathways for critical plumbing stocks.",
            "Extend credit terms slightly (e.g. 5 additional days) to affected dealers to maintain good relations."
        ]
    elif "copper" in inputs_lower or "cable" in inputs_lower or "wire" in inputs_lower:
        summary = f"Supplier {supplier} is facing global copper rod supply bottlenecks, causing a temporary out-of-stock situation for 2.5sq mm multi-strand copper cables. Restocking expected on June 22nd."
        customer_impact = "High impact on electrical contractors and shopkeepers. Disruptions in residential wiring orders will affect retail credibility and repeat-order cycles."
        affected_orders = [
            "15 pending contractor copper cable dispatches.",
            "All backordered 2.5sq mm multi-strand copper cables."
        ]
        recommended_actions = [
            "Contact electrical contractors and retail partners to offer alternative wire gauges if suitable.",
            "Check secondary distributors for available buffer stock of copper wires.",
            "Queue pending orders for priority dispatch on the scheduled June 22nd arrival.",
            "Offer temporary credit extensions to contractors facing project completion delays."
        ]
    else:
        # Generic fallback
        summary = f"Supplier {supplier} communicated a delay or shortage affecting supply schedules. Details: '{inputs[:100]}...'"
        customer_impact = "General distribution impact. Repeat-order retail shopkeepers and dealers on credit terms may experience delays in restocking, leading to potential inventory gaps."
        affected_orders = [
            f"All pending orders from {supplier} scheduled for delivery within the next 7 days.",
            "Estimated 5-10 retail dealer shipments in the Hyderabad region."
        ]
        recommended_actions = [
            f"Contact {supplier} for a definitive restoration schedule.",
            "Notify key retail shopkeepers in Hyderabad about potential delays for these items.",
            "Audit warehouse safety levels for affected goods to prioritize existing inventory.",
            "Draft alternative sourcing requests for alternative brands."
        ]
        
    return {
        "summary": summary,
        "customer_impact": customer_impact,
        "affected_orders": affected_orders,
        "recommended_actions": recommended_actions
    }

@app.route('/api/generate', methods=['POST'])
def generate():
    start_time = time.time()
    data = request.json or {}
    admin = data.get('admin_name', '').strip()
    supplier = data.get('supplier_name', '').strip()
    inputs = data.get('supplier_inputs', '').strip()
    
    if not admin or not supplier or not inputs:
        return jsonify({"error": "Missing required fields: admin_name, supplier_name, and supplier_inputs are required"}), 400
        
    try:
        # Attempt AI generation
        ai_output_dict = generate_summary_with_ai(admin, supplier, inputs)
        ai_output_str = json.dumps(ai_output_dict)
        using_ai = True
    except Exception as e:
        # Fallback to mock
        print(f"AI Generation failed or skipped: {e}. Using mock generation.")
        ai_output_dict = generate_mock_summary(admin, supplier, inputs)
        ai_output_str = json.dumps(ai_output_dict)
        using_ai = False
        
    elapsed_ms = int((time.time() - start_time) * 1000)
    
    # Save to DB
    gen_id = db_helper.save_generation(admin, supplier, inputs, ai_output_str, elapsed_ms)
    
    response_data = {
        "id": gen_id,
        "admin_name": admin,
        "supplier_name": supplier,
        "supplier_inputs": inputs,
        "ai_output": ai_output_dict,
        "response_time_ms": elapsed_ms,
        "using_ai": using_ai
    }
    return jsonify(response_data)

@app.route('/api/history', methods=['GET'])
def get_history():
    history = db_helper.get_history()
    return jsonify(history)

@app.route('/api/history/<gen_id>', methods=['GET'])
def get_history_detail(gen_id):
    row = db_helper.get_generation_detail(gen_id)
    if not row:
        return jsonify({"error": "Generation not found"}), 404
    return jsonify(row)

@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    data = request.json or {}
    gen_id = data.get('generation_id')
    rating = data.get('rating')
    comment = data.get('comment', '').strip()
    
    if not gen_id or not rating:
        return jsonify({"error": "Missing required fields: generation_id and rating are required"}), 400
        
    if not (1 <= rating <= 5):
        return jsonify({"error": "Rating must be an integer between 1 and 5"}), 400
        
    success, msg = db_helper.save_feedback(gen_id, rating, comment)
    if not success:
        return jsonify({"error": msg}), 404
        
    return jsonify({"success": True, "message": msg})

@app.route('/api/admin/analytics', methods=['GET'])
def get_analytics():
    data = db_helper.get_analytics()
    return jsonify(data)

@app.route('/api/templates', methods=['GET'])
def get_templates():
    templates = db_helper.get_presets()
    return jsonify(templates)

@app.route('/api/templates', methods=['POST'])
def add_template():
    data = request.json or {}
    title = data.get('title', '').strip()
    admin = data.get('admin_name', '').strip()
    supplier = data.get('supplier_name', '').strip()
    inputs = data.get('inputs', '').strip()
    
    if not title or not admin or not supplier or not inputs:
        return jsonify({"error": "Missing required fields"}), 400
        
    try:
        db_helper.add_preset(title, admin, supplier, inputs)
        return jsonify({"success": True, "message": "Preset added successfully"})
    except Exception as e:
        if "unique" in str(e).lower() or "integrity" in str(e).lower() or "must be unique" in str(e).lower():
            return jsonify({"error": "Preset title must be unique"}), 400
        return jsonify({"error": str(e)}), 500

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    # Start the Flask app on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
