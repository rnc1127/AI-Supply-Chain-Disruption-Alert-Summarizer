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
    conn = db_helper.get_db_connection()
    cursor = db_helper.get_cursor(conn)
    if db_helper.is_postgres():
        cursor.execute('''
            INSERT INTO generations (admin_name, supplier_name, supplier_inputs, ai_output, response_time_ms)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
        ''', (admin, supplier, inputs, ai_output_str, elapsed_ms))
        gen_id = cursor.fetchone()[0]
    else:
        cursor.execute('''
            INSERT INTO generations (admin_name, supplier_name, supplier_inputs, ai_output, response_time_ms)
            VALUES (?, ?, ?, ?, ?)
        ''', (admin, supplier, inputs, ai_output_str, elapsed_ms))
        gen_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
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
    conn = db_helper.get_db_connection()
    cursor = db_helper.get_cursor(conn)
    cursor.execute('''
        SELECT g.*, f.rating, f.comment
        FROM generations g
        LEFT JOIN feedback f ON g.id = f.generation_id
        ORDER BY g.timestamp DESC
    ''')
    rows = cursor.fetchall()
    conn.close()
    
    history = []
    for row in rows:
        try:
            ai_output_dict = json.loads(row['ai_output'])
        except Exception:
            ai_output_dict = {"summary": row['ai_output'], "customer_impact": "", "affected_orders": [], "recommended_actions": []}
            
        history.append({
            "id": row['id'],
            "admin_name": row['admin_name'],
            "supplier_name": row['supplier_name'],
            "supplier_inputs": row['supplier_inputs'],
            "ai_output": ai_output_dict,
            "response_time_ms": row['response_time_ms'],
            "timestamp": row['timestamp'].isoformat() if hasattr(row['timestamp'], 'isoformat') else row['timestamp'],
            "rating": row['rating'],
            "comment": row['comment']
        })
    return jsonify(history)

@app.route('/api/history/<int:gen_id>', methods=['GET'])
def get_history_detail(gen_id):
    conn = db_helper.get_db_connection()
    cursor = db_helper.get_cursor(conn)
    p = '%s' if db_helper.is_postgres() else '?'
    cursor.execute(f'''
        SELECT g.*, f.rating, f.comment
        FROM generations g
        LEFT JOIN feedback f ON g.id = f.generation_id
        WHERE g.id = {p}
    ''', (gen_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return jsonify({"error": "Generation not found"}), 404
        
    try:
        ai_output_dict = json.loads(row['ai_output'])
    except Exception:
        ai_output_dict = {"summary": row['ai_output'], "customer_impact": "", "affected_orders": [], "recommended_actions": []}
        
    return jsonify({
        "id": row['id'],
        "admin_name": row['admin_name'],
        "supplier_name": row['supplier_name'],
        "supplier_inputs": row['supplier_inputs'],
        "ai_output": ai_output_dict,
        "response_time_ms": row['response_time_ms'],
        "timestamp": row['timestamp'].isoformat() if hasattr(row['timestamp'], 'isoformat') else row['timestamp'],
        "rating": row['rating'],
        "comment": row['comment']
    })

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
        
    conn = db_helper.get_db_connection()
    cursor = db_helper.get_cursor(conn)
    p = '%s' if db_helper.is_postgres() else '?'
    
    cursor.execute(f'SELECT id FROM generations WHERE id = {p}', (gen_id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "Generation ID does not exist"}), 404
        
    cursor.execute(f'SELECT id FROM feedback WHERE generation_id = {p}', (gen_id,))
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute(f'''
            UPDATE feedback
            SET rating = {p}, comment = {p}, timestamp = CURRENT_TIMESTAMP
            WHERE generation_id = {p}
        ''', (rating, comment, gen_id))
    else:
        cursor.execute(f'''
            INSERT INTO feedback (generation_id, rating, comment)
            VALUES ({p}, {p}, {p})
        ''', (gen_id, rating, comment))
        
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Feedback saved successfully"})

@app.route('/api/admin/analytics', methods=['GET'])
def get_analytics():
    conn = db_helper.get_db_connection()
    cursor = db_helper.get_cursor(conn)
    
    cursor.execute('SELECT COUNT(*) FROM generations')
    total_generations = cursor.fetchone()[0]
    
    cursor.execute('SELECT AVG(rating) FROM feedback')
    avg_rating_row = cursor.fetchone()
    avg_rating = round(float(avg_rating_row[0]), 2) if avg_rating_row[0] is not None else 0.0
    
    cursor.execute('SELECT AVG(response_time_ms) FROM generations')
    avg_time_row = cursor.fetchone()
    avg_response_time = round(float(avg_time_row[0]), 0) if avg_time_row[0] is not None else 0
    
    cursor.execute('SELECT COUNT(DISTINCT supplier_name) FROM generations')
    unique_suppliers = cursor.fetchone()[0]
    
    # Daily generation volume (last 7 days)
    if db_helper.is_postgres():
        cursor.execute('''
            SELECT TO_CHAR(timestamp, 'YYYY-MM-DD') as date, COUNT(*) as count 
            FROM generations 
            GROUP BY date 
            ORDER BY date ASC 
            LIMIT 7
        ''')
    else:
        cursor.execute('''
            SELECT strftime('%Y-%m-%d', timestamp) as date, COUNT(*) as count 
            FROM generations 
            GROUP BY date 
            ORDER BY date ASC 
            LIMIT 7
        ''')
    daily_volume = [{"date": r['date'], "count": r['count']} for r in cursor.fetchall()]
    
    # Quality trends over time (average rating per day)
    if db_helper.is_postgres():
        cursor.execute('''
            SELECT TO_CHAR(g.timestamp, 'YYYY-MM-DD') as date, AVG(f.rating) as avg_rating
            FROM generations g
            JOIN feedback f ON g.id = f.generation_id
            GROUP BY date
            ORDER BY date ASC
            LIMIT 7
        ''')
    else:
        cursor.execute('''
            SELECT strftime('%Y-%m-%d', g.timestamp) as date, AVG(f.rating) as avg_rating
            FROM generations g
            JOIN feedback f ON g.id = f.generation_id
            GROUP BY date
            ORDER BY date ASC
            LIMIT 7
        ''')
    quality_trends = [{"date": r['date'], "avg_rating": round(float(r['avg_rating']), 2)} for r in cursor.fetchall()]
    
    # Disruption by supplier
    cursor.execute('''
        SELECT supplier_name, COUNT(*) as count
        FROM generations
        GROUP BY supplier_name
        ORDER BY count DESC
        LIMIT 5
    ''')
    top_suppliers = [{"supplier": r['supplier_name'], "count": r['count']} for r in cursor.fetchall()]
    
    conn.close()
    
    return jsonify({
        "total_generations": total_generations,
        "average_rating": avg_rating,
        "average_response_time_ms": avg_response_time,
        "unique_suppliers": unique_suppliers,
        "daily_volume": daily_volume,
        "quality_trends": quality_trends,
        "top_suppliers": top_suppliers
    })

@app.route('/api/templates', methods=['GET'])
def get_templates():
    conn = db_helper.get_db_connection()
    cursor = db_helper.get_cursor(conn)
    cursor.execute('SELECT * FROM presets')
    rows = cursor.fetchall()
    conn.close()
    
    templates = [{
        "id": r['id'],
        "title": r['title'],
        "admin_name": r['admin_name'],
        "supplier_name": r['supplier_name'],
        "inputs": r['inputs']
    } for r in rows]
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
        conn = db_helper.get_db_connection()
        cursor = db_helper.get_cursor(conn)
        p = '%s' if db_helper.is_postgres() else '?'
        cursor.execute(f'''
            INSERT INTO presets (title, admin_name, supplier_name, inputs)
            VALUES ({p}, {p}, {p}, {p})
        ''', (title, admin, supplier, inputs))
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Preset added successfully"})
    except Exception as e:
        err_name = e.__class__.__name__
        if err_name in ('IntegrityError', 'sqlite3.IntegrityError', 'psycopg2.IntegrityError'):
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
