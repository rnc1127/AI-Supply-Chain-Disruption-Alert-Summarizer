import unittest
import json
import os
import sys

# Add backend to sys.path so we can import app
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))

import app as flask_app
import db_helper

class TestAlertSummarizerAPI(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Configure a temporary database for testing
        cls.db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', 'test_database.db')
        db_helper.DB_PATH = cls.db_path
        
        # Force re-initialization of test database
        if os.path.exists(cls.db_path):
            os.remove(cls.db_path)
        db_helper.init_db()
        
        flask_app.app.config['TESTING'] = True
        cls.client = flask_app.app.test_client()

    @classmethod
    def tearDownClass(cls):
        # Clean up test database
        if os.path.exists(cls.db_path):
            try:
                os.remove(cls.db_path)
            except Exception as e:
                print(f"Error removing test db: {e}")

    def test_1_templates_endpoint(self):
        """Test retrieving the default template presets"""
        response = self.client.get('/api/templates')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertEqual(data[0]['title'], "Steel Sheet Delay from Hyderabad")

    def test_2_generate_validation(self):
        """Test validation rules for generation payload"""
        # Test empty body
        response = self.client.post('/api/generate', json={})
        self.assertEqual(response.status_code, 400)
        
        # Test missing supplier inputs
        response = self.client.post('/api/generate', json={
            "admin_name": "Test Admin",
            "supplier_name": "Test Supplier"
        })
        self.assertEqual(response.status_code, 400)

    def test_3_generate_mock_success(self):
        """Test successful generation using the fallback mock logic"""
        payload = {
            "admin_name": "Kalyan Kumar",
            "supplier_name": "Deccan Steel Ltd",
            "supplier_inputs": "Due to sudden electrical failure at Hyderabad smelting furnace, steel sheets scheduled for June 12th will be delayed by 5 days."
        }
        response = self.client.post('/api/generate', json=payload)
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertIn("id", data)
        self.assertEqual(data["admin_name"], "Kalyan Kumar")
        self.assertEqual(data["supplier_name"], "Deccan Steel Ltd")
        
        # Check properties of generated summary
        ai_out = data["ai_output"]
        self.assertIn("summary", ai_out)
        self.assertIn("customer_impact", ai_out)
        self.assertIsInstance(ai_out["affected_orders"], list)
        self.assertIsInstance(ai_out["recommended_actions"], list)
        
        # Save ID for feedback test
        self.__class__.generated_id = data["id"]

    def test_4_submit_feedback(self):
        """Test submitting feedback rating and comment"""
        payload = {
            "generation_id": self.__class__.generated_id,
            "rating": 5,
            "comment": "Outstanding impact analysis for local steel dealers!"
        }
        response = self.client.post('/api/feedback', json=payload)
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertTrue(data["success"])

    def test_5_history_endpoints(self):
        """Test history retrieval list and detail logs"""
        # Test List
        response = self.client.get('/api/history')
        self.assertEqual(response.status_code, 200)
        history_list = json.loads(response.data)
        self.assertEqual(len(history_list), 1)
        self.assertEqual(history_list[0]['id'], self.__class__.generated_id)
        self.assertEqual(history_list[0]['rating'], 5)
        
        # Test Detail
        detail_response = self.client.get(f'/api/history/{self.__class__.generated_id}')
        self.assertEqual(detail_response.status_code, 200)
        detail_data = json.loads(detail_response.data)
        self.assertEqual(detail_data['admin_name'], "Kalyan Kumar")

    def test_6_analytics_endpoint(self):
        """Test that analytics calculates summary metrics correctly"""
        response = self.client.get('/api/admin/analytics')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(data['total_generations'], 1)
        self.assertEqual(data['average_rating'], 5.0)
        self.assertEqual(data['unique_suppliers'], 1)
        self.assertEqual(data['top_suppliers'][0]['supplier'], 'Deccan Steel Ltd')

if __name__ == '__main__':
    unittest.main()
