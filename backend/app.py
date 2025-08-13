# backend/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS # type: ignore
import mysql.connector
import os

# Initialize Flask App
app = Flask(__name__)
CORS(app) # This is crucial to allow requests from your Chrome extension

# --- Database Configuration ---
# It's better to use environment variables for security in a real app
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'pass123')
DB_NAME = os.environ.get('DB_NAME', 'pocketwisely_db')

def get_db_connection():
    """Establishes a connection to the MySQL database."""
    try:
        conn = mysql.connector.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Error connecting to database: {err}")
        return None

# --- API Endpoints ---

@app.route('/')
def index():
    return "Hello from the PocketWisely Backend!"

@app.route('/api/register', methods=['POST'])
def register_user():
    """Receives user registration data and saves it to the database."""
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')

    if not name or not email:
        return jsonify({'status': 'error', 'message': 'Name and email are required'}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({'status': 'error', 'message': 'Database connection failed'}), 500
    
    cursor = conn.cursor()
    try:
        # NOTE: You should have a 'users' table in your 'pocketwisely_db' database
        # CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE);
        cursor.execute("INSERT INTO users (name, email) VALUES (%s, %s)", (name, email))
        conn.commit()
        print(f"User '{name}' with email '{email}' registered successfully.")
        return jsonify({'status': 'success', 'message': 'User registered successfully'}), 201
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'status': 'error', 'message': 'Failed to register user'}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/product_event', methods=['POST'])
def product_event():
    """Receives product data when a user clicks 'Add to Cart'."""
    data = request.get_json()
    user_info = data.get('userInfo')
    product_data = data.get('productData')

    print("Received product event:")
    print(f"User: {user_info}")
    print(f"Product: {product_data}")

    # TODO: Add your logic here
    # 1. Look up user by email in your database.
    # 2. Check if this product has been purchased before by this user.
    # 3. Save this purchase attempt to the database.
    # 4. Return a JSON response with your analysis (e.g., "This is an impulse buy!").

    # For now, we just send back a simple acknowledgement.
    return jsonify({
        'status': 'success',
        'message': 'Product event received',
        'analysis': 'This is a sample analysis. You could invest this money instead!'
    }), 200


# --- Run the App ---
if __name__ == '__main__':
    # Runs the app on http://127.0.0.1:5000
    app.run(debug=True)