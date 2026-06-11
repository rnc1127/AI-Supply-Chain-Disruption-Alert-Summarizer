import sqlite3
import os

if os.environ.get('VERCEL'):
    DB_PATH = '/tmp/database.db'
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), 'database.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create generations table
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
    
    # Create feedback table
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
    
    # Create presets table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS presets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            admin_name TEXT NOT NULL,
            supplier_name TEXT NOT NULL,
            inputs TEXT NOT NULL
        )
    ''')
    
    # Insert default templates if table is empty
    cursor.execute('SELECT COUNT(*) FROM presets')
    if cursor.fetchone()[0] == 0:
        default_presets = [
            (
                "Steel Sheet Delay from Hyderabad",
                "Kalyan Kumar",
                "Deccan Steel Ltd",
                "Due to sudden electrical failure at our Hyderabad smelting furnace, the shipment of 10 tons of mild steel sheets scheduled for June 12th will be delayed by 5 days. We expect repairs to be complete by June 14th."
            ),
            (
                "Cement Packaging Material Shortage",
                "Ramesh Naidu",
                "UltraPack Industries",
                "We are facing a temporary shortage of waterproof synthetic paper for the high-durability cement bags. The 50,000 bags ordered on June 8th will be delayed. Standard paper bags are available immediately if you wish to substitute."
            ),
            (
                "Logistics Strike in Andhra Border",
                "Sneha Reddy",
                "VRL Logistics",
                "A regional transport union strike on the NH44 border checkpost is delaying all interstate freight. Our trucks carrying plumbing fixtures and hardware parts from Nagpur are currently halted at the border. Expected resolution is 48-72 hours."
            ),
            (
                "Copper Cable Shortage",
                "Kalyan Kumar",
                "Finolex Wire Distributors",
                "Due to global copper copper rod supply chain bottlenecks, we are out of stock of 2.5sq mm multi-strand copper cables. Restocking is expected on June 22nd. Orders will be processed in queue order upon arrival."
            )
        ]
        cursor.executemany(
            'INSERT INTO presets (title, admin_name, supplier_name, inputs) VALUES (?, ?, ?, ?)',
            default_presets
        )
        
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
