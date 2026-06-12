import sqlite3
import os
import json
import urllib.request
from datetime import datetime, timedelta

DATABASE_URL = os.environ.get('DATABASE_URL')
FIREBASE_URL = os.environ.get('FIREBASE_URL')
FIREBASE_SECRET = os.environ.get('FIREBASE_SECRET')

if os.environ.get('VERCEL'):
    DB_PATH = '/tmp/database.db'
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def is_firebase():
    return FIREBASE_URL is not None and len(FIREBASE_URL.strip()) > 0

def is_postgres():
    return DATABASE_URL is not None and (DATABASE_URL.startswith('postgres://') or DATABASE_URL.startswith('postgresql://'))

# --- SQL connection helpers ---
def get_db_connection():
    if is_postgres():
        import psycopg2
        import psycopg2.extras
        url = DATABASE_URL
        if url.startswith('postgres://'):
            url = url.replace('postgres://', 'postgresql://', 1)
        conn = psycopg2.connect(url)
        return conn
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def get_cursor(conn):
    if is_postgres():
        import psycopg2.extras
        return conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    else:
        return conn.cursor()

# --- Firebase helper ---
def firebase_request(method, path, data=None):
    url = FIREBASE_URL.rstrip('/') + path + '.json'
    params = []
    if FIREBASE_SECRET:
        params.append(f"auth={FIREBASE_SECRET}")
    
    if params:
        url += "?" + "&".join(params)
        
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode('utf-8')
        
    req = urllib.request.Request(url, data=req_data, method=method)
    req.add_header('Content-Type', 'application/json')
    
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

# --- Database Initialization ---
def init_db():
    if is_firebase():
        try:
            presets = firebase_request('GET', '/presets')
            if not presets:
                default_presets = {
                    "preset_1": {
                        "title": "Steel Sheet Delay from Hyderabad",
                        "admin_name": "Kalyan Kumar",
                        "supplier_name": "Deccan Steel Ltd",
                        "inputs": "Due to sudden electrical failure at our Hyderabad smelting furnace, the shipment of 10 tons of mild steel sheets scheduled for June 12th will be delayed by 5 days. We expect repairs to be complete by June 14th."
                    },
                    "preset_2": {
                        "title": "Cement Packaging Material Shortage",
                        "admin_name": "Ramesh Naidu",
                        "supplier_name": "UltraPack Industries",
                        "inputs": "We are facing a temporary shortage of waterproof synthetic paper for the high-durability cement bags. The 50,000 bags ordered on June 8th will be delayed. Standard paper bags are available immediately if you wish to substitute."
                    },
                    "preset_3": {
                        "title": "Logistics Strike in Andhra Border",
                        "admin_name": "Sneha Reddy",
                        "supplier_name": "VRL Logistics",
                        "inputs": "A regional transport union strike on the NH44 border checkpost is delaying all interstate freight. Our trucks carrying plumbing fixtures and hardware parts from Nagpur are currently halted at the border. Expected resolution is 48-72 hours."
                    },
                    "preset_4": {
                        "title": "Copper Cable Shortage",
                        "admin_name": "Kalyan Kumar",
                        "supplier_name": "Finolex Wire Distributors",
                        "inputs": "Due to global copper copper rod supply chain bottlenecks, we are out of stock of 2.5sq mm multi-strand copper cables. Restocking is expected on June 22nd. Orders will be processed in queue order upon arrival."
                    }
                }
                firebase_request('PUT', '/presets', default_presets)
        except Exception as e:
            print(f"Firebase initialization warning: {e}")
    else:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
        if is_postgres():
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS generations (
                    id SERIAL PRIMARY KEY,
                    admin_name TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    supplier_inputs TEXT NOT NULL,
                    ai_output TEXT NOT NULL,
                    response_time_ms INTEGER NOT NULL,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS feedback (
                    id SERIAL PRIMARY KEY,
                    generation_id INTEGER NOT NULL,
                    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                    comment TEXT,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS presets (
                    id SERIAL PRIMARY KEY,
                    title TEXT NOT NULL UNIQUE,
                    admin_name TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    inputs TEXT NOT NULL
                )
            ''')
            cursor.execute('SELECT COUNT(*) FROM presets')
            if cursor.fetchone()[0] == 0:
                default_presets = [
                    ("Steel Sheet Delay from Hyderabad", "Kalyan Kumar", "Deccan Steel Ltd", "Due to sudden electrical failure at our Hyderabad smelting furnace, the shipment of 10 tons of mild steel sheets scheduled for June 12th will be delayed by 5 days. We expect repairs to be complete by June 14th."),
                    ("Cement Packaging Material Shortage", "Ramesh Naidu", "UltraPack Industries", "We are facing a temporary shortage of waterproof synthetic paper for the high-durability cement bags. The 50,000 bags ordered on June 8th will be delayed. Standard paper bags are available immediately if you wish to substitute."),
                    ("Logistics Strike in Andhra Border", "Sneha Reddy", "VRL Logistics", "A regional transport union strike on the NH44 border checkpost is delaying all interstate freight. Our trucks carrying plumbing fixtures and hardware parts from Nagpur are currently halted at the border. Expected resolution is 48-72 hours."),
                    ("Copper Cable Shortage", "Kalyan Kumar", "Finolex Wire Distributors", "Due to global copper copper rod supply chain bottlenecks, we are out of stock of 2.5sq mm multi-strand copper cables. Restocking is expected on June 22nd. Orders will be processed in queue order upon arrival.")
                ]
                cursor.executemany('INSERT INTO presets (title, admin_name, supplier_name, inputs) VALUES (%s, %s, %s, %s)', default_presets)
        else:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS generations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    admin_name TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    supplier_inputs TEXT NOT NULL,
                    ai_output TEXT NOT NULL,
                    response_time_ms INTEGER NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS feedback (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    generation_id INTEGER NOT NULL,
                    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
                    comment TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE CASCADE
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS presets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL UNIQUE,
                    admin_name TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    inputs TEXT NOT NULL
                )
            ''')
            cursor.execute('SELECT COUNT(*) FROM presets')
            if cursor.fetchone()[0] == 0:
                default_presets = [
                    ("Steel Sheet Delay from Hyderabad", "Kalyan Kumar", "Deccan Steel Ltd", "Due to sudden electrical failure at our Hyderabad smelting furnace, the shipment of 10 tons of mild steel sheets scheduled for June 12th will be delayed by 5 days. We expect repairs to be complete by June 14th."),
                    ("Cement Packaging Material Shortage", "Ramesh Naidu", "UltraPack Industries", "We are facing a temporary shortage of waterproof synthetic paper for the high-durability cement bags. The 50,000 bags ordered on June 8th will be delayed. Standard paper bags are available immediately if you wish to substitute."),
                    ("Logistics Strike in Andhra Border", "Sneha Reddy", "VRL Logistics", "A regional transport union strike on the NH44 border checkpost is delaying all interstate freight. Our trucks carrying plumbing fixtures and hardware parts from Nagpur are currently halted at the border. Expected resolution is 48-72 hours."),
                    ("Copper Cable Shortage", "Kalyan Kumar", "Finolex Wire Distributors", "Due to global copper copper rod supply chain bottlenecks, we are out of stock of 2.5sq mm multi-strand copper cables. Restocking is expected on June 22nd. Orders will be processed in queue order upon arrival.")
                ]
                cursor.executemany('INSERT INTO presets (title, admin_name, supplier_name, inputs) VALUES (?, ?, ?, ?)', default_presets)
        conn.commit()
        conn.close()

# --- Unified DB Access Operations ---

def save_generation(admin, supplier, inputs, ai_output_str, elapsed_ms):
    if is_firebase():
        data = {
            "admin_name": admin,
            "supplier_name": supplier,
            "supplier_inputs": inputs,
            "ai_output": ai_output_str,
            "response_time_ms": elapsed_ms,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        res = firebase_request('POST', '/generations', data)
        return res["name"]
    else:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        if is_postgres():
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
        return gen_id

def get_history():
    if is_firebase():
        generations = firebase_request('GET', '/generations') or {}
        feedbacks = firebase_request('GET', '/feedback') or {}
        
        history = []
        for gen_id, gen in generations.items():
            feedback = feedbacks.get(gen_id, {})
            try:
                ai_output_dict = json.loads(gen.get("ai_output", "{}"))
            except Exception:
                ai_output_dict = {"summary": gen.get("ai_output", ""), "customer_impact": "", "affected_orders": [], "recommended_actions": []}
                
            history.append({
                "id": gen_id,
                "admin_name": gen.get("admin_name", ""),
                "supplier_name": gen.get("supplier_name", ""),
                "supplier_inputs": gen.get("supplier_inputs", ""),
                "ai_output": ai_output_dict,
                "response_time_ms": gen.get("response_time_ms", 0),
                "timestamp": gen.get("timestamp", ""),
                "rating": feedback.get("rating"),
                "comment": feedback.get("comment", "")
            })
        # Sort by timestamp descending
        history.sort(key=lambda x: x["timestamp"], reverse=True)
        return history
    else:
        conn = get_db_connection()
        cursor = get_cursor(conn)
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
        return history

def get_generation_detail(gen_id):
    if is_firebase():
        gen = firebase_request('GET', f'/generations/{gen_id}')
        if not gen:
            return None
        feedback = firebase_request('GET', f'/feedback/{gen_id}') or {}
        try:
            ai_output_dict = json.loads(gen.get("ai_output", "{}"))
        except Exception:
            ai_output_dict = {"summary": gen.get("ai_output", ""), "customer_impact": "", "affected_orders": [], "recommended_actions": []}
            
        return {
            "id": gen_id,
            "admin_name": gen.get("admin_name", ""),
            "supplier_name": gen.get("supplier_name", ""),
            "supplier_inputs": gen.get("supplier_inputs", ""),
            "ai_output": ai_output_dict,
            "response_time_ms": gen.get("response_time_ms", 0),
            "timestamp": gen.get("timestamp", ""),
            "rating": feedback.get("rating"),
            "comment": feedback.get("comment", "")
        }
    else:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        p = '%s' if is_postgres() else '?'
        
        try:
            sql_id = int(gen_id)
        except ValueError:
            conn.close()
            return None
            
        cursor.execute(f'''
            SELECT g.*, f.rating, f.comment
            FROM generations g
            LEFT JOIN feedback f ON g.id = f.generation_id
            WHERE g.id = {p}
        ''', (sql_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
            
        try:
            ai_output_dict = json.loads(row['ai_output'])
        except Exception:
            ai_output_dict = {"summary": row['ai_output'], "customer_impact": "", "affected_orders": [], "recommended_actions": []}
            
        return {
            "id": row['id'],
            "admin_name": row['admin_name'],
            "supplier_name": row['supplier_name'],
            "supplier_inputs": row['supplier_inputs'],
            "ai_output": ai_output_dict,
            "response_time_ms": row['response_time_ms'],
            "timestamp": row['timestamp'].isoformat() if hasattr(row['timestamp'], 'isoformat') else row['timestamp'],
            "rating": row['rating'],
            "comment": row['comment']
        }

def save_feedback(gen_id, rating, comment):
    if is_firebase():
        gen = firebase_request('GET', f'/generations/{gen_id}')
        if not gen:
            return False, "Generation ID does not exist"
        
        data = {
            "rating": rating,
            "comment": comment,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        firebase_request('PUT', f'/feedback/{gen_id}', data)
        return True, "Feedback saved successfully"
    else:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        p = '%s' if is_postgres() else '?'
        
        try:
            sql_id = int(gen_id)
        except ValueError:
            conn.close()
            return False, "Invalid generation ID format"
            
        cursor.execute(f'SELECT id FROM generations WHERE id = {p}', (sql_id,))
        if not cursor.fetchone():
            conn.close()
            return False, "Generation ID does not exist"
            
        cursor.execute(f'SELECT id FROM feedback WHERE generation_id = {p}', (sql_id,))
        existing = cursor.fetchone()
        
        if existing:
            cursor.execute(f'''
                UPDATE feedback
                SET rating = {p}, comment = {p}, timestamp = CURRENT_TIMESTAMP
                WHERE generation_id = {p}
            ''', (rating, comment, sql_id))
        else:
            cursor.execute(f'''
                INSERT INTO feedback (generation_id, rating, comment)
                VALUES ({p}, {p}, {p})
            ''', (sql_id, rating, comment))
        conn.commit()
        conn.close()
        return True, "Feedback saved successfully"

def get_presets():
    if is_firebase():
        presets = firebase_request('GET', '/presets') or {}
        result = []
        for pid, p in presets.items():
            result.append({
                "id": pid,
                "title": p.get("title", ""),
                "admin_name": p.get("admin_name", ""),
                "supplier_name": p.get("supplier_name", ""),
                "inputs": p.get("inputs", "")
            })
        return result
    else:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        cursor.execute('SELECT * FROM presets')
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": r['id'],
            "title": r['title'],
            "admin_name": r['admin_name'],
            "supplier_name": r['supplier_name'],
            "inputs": r['inputs']
        } for r in rows]

def add_preset(title, admin, supplier, inputs):
    if is_firebase():
        presets = firebase_request('GET', '/presets') or {}
        for pid, p in presets.items():
            if p.get("title", "").strip().lower() == title.strip().lower():
                raise Exception("Preset title must be unique")
                
        data = {
            "title": title,
            "admin_name": admin,
            "supplier_name": supplier,
            "inputs": inputs
        }
        firebase_request('POST', '/presets', data)
        return True
    else:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        p = '%s' if is_postgres() else '?'
        try:
            cursor.execute(f'''
                INSERT INTO presets (title, admin_name, supplier_name, inputs)
                VALUES ({p}, {p}, {p}, {p})
            ''', (title, admin, supplier, inputs))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            conn.close()
            raise e

def get_analytics():
    if is_firebase():
        generations = firebase_request('GET', '/generations') or {}
        feedbacks = firebase_request('GET', '/feedback') or {}
        
        total_generations = len(generations)
        
        ratings = [f.get("rating") for f in feedbacks.values() if f.get("rating") is not None]
        avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
        
        times = [g.get("response_time_ms") for g in generations.values() if g.get("response_time_ms") is not None]
        avg_response_time = round(sum(times) / len(times), 0) if times else 0
        
        suppliers = [g.get("supplier_name").strip() for g in generations.values() if g.get("supplier_name")]
        unique_suppliers = len(set(suppliers))
        
        # Daily volume
        daily_counts = {}
        for g in generations.values():
            ts = g.get("timestamp")
            if ts:
                date_str = ts.split('T')[0]
                daily_counts[date_str] = daily_counts.get(date_str, 0) + 1
                
        daily_volume = []
        for i in range(6, -1, -1):
            d = (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d')
            daily_volume.append({"date": d, "count": daily_counts.get(d, 0)})
            
        # Quality trends
        daily_ratings = {}
        for gen_id, f in feedbacks.items():
            ts = f.get("timestamp") or (generations.get(gen_id, {}).get("timestamp"))
            if ts and f.get("rating") is not None:
                date_str = ts.split('T')[0]
                if date_str not in daily_ratings:
                    daily_ratings[date_str] = []
                daily_ratings[date_str].append(f.get("rating"))
                
        quality_trends = []
        sorted_rated_dates = sorted(daily_ratings.keys())[-7:]
        for date in sorted_rated_dates:
            rates = daily_ratings[date]
            quality_trends.append({
                "date": date,
                "avg_rating": round(sum(rates) / len(rates), 2)
            })
            
        # Top suppliers
        supplier_counts = {}
        for s in suppliers:
            supplier_counts[s] = supplier_counts.get(s, 0) + 1
        top_suppliers = sorted(
            [{"supplier": s, "count": c} for s, c in supplier_counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )[:5]
        
        return {
            "total_generations": total_generations,
            "average_rating": avg_rating,
            "average_response_time_ms": avg_response_time,
            "unique_suppliers": unique_suppliers,
            "daily_volume": daily_volume,
            "quality_trends": quality_trends,
            "top_suppliers": top_suppliers
        }
    else:
        conn = get_db_connection()
        cursor = get_cursor(conn)
        
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
        
        if is_postgres():
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
        
        if is_postgres():
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
        
        cursor.execute('''
            SELECT supplier_name, COUNT(*) as count
            FROM generations
            GROUP BY supplier_name
            ORDER BY count DESC
            LIMIT 5
        ''')
        top_suppliers = [{"supplier": r['supplier_name'], "count": r['count']} for r in cursor.fetchall()]
        
        conn.close()
        
        return {
            "total_generations": total_generations,
            "average_rating": avg_rating,
            "average_response_time_ms": avg_response_time,
            "unique_suppliers": unique_suppliers,
            "daily_volume": daily_volume,
            "quality_trends": quality_trends,
            "top_suppliers": top_suppliers
        }

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
