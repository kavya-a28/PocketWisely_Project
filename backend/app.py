# backend/app.py

import os
from flask import Flask, request, jsonify # type: ignore
from flask_migrate import Migrate # type: ignore
from flask_cors import CORS # type: ignore
from models import db, User, Purchase  # Import from your models.py

def create_app():
    """Creates and- configures the Flask application."""
    app = Flask(__name__)
    CORS(app) 

  
    DB_USER = "root"
    DB_PASSWORD = "pass123"  
    DB_HOST = "127.0.0.1"
    DB_NAME = "pocketwisely_db"
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # --- Initialize Database and Migrations ---
    db.init_app(app)
    migrate = Migrate(app, db)

    # --- API Endpoints ---

    @app.route('/')
    def index():
        return "<h1>Welcome to the PocketWisely Backend!</h1><p>The API is running.</p>"

    @app.route('/api/register', methods=['POST'])
    def register_user():
        # --- MODIFIED BLOCK FOR BETTER ERROR HANDLING ---
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON data provided"}), 400
        except Exception as e:
            return jsonify({"error": "Failed to decode JSON object"}), 400

        user_id = data.get('userId')
        name = data.get('name')
        email = data.get('email')

        # Check for each field individually to give a specific error
        if not user_id:
            return jsonify({"error": "Missing required field: userId"}), 400
        if not name:
            return jsonify({"error": "Missing required field: name"}), 400
        if not email:
            return jsonify({"error": "Missing required field: email"}), 400
        # --- END OF MODIFIED BLOCK ---
        
        if User.query.get(user_id) or User.query.filter_by(email=email).first():
            return jsonify({"error": "User with this ID or email already exists"}), 409
        
        new_user = User(id=user_id, name=name, email=email)
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({"message": f"User '{name}' registered successfully"}), 201

    @app.route('/api/analyze-purchase', methods=['POST'])
    def analyze_purchase():
        data = request.get_json()
        user_id = data.get('userId')
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        purchase_history = user.purchases 
        print(f"Analyzing purchase for user {user.name}. Found {len(purchase_history)} past purchases.")
        
        # --- ML MODEL LOGIC WILL GO HERE ---
        analysis_result = {
            "question": "Is this a truly mindful purchase?",
            "category": "General"
        }
        return jsonify(analysis_result)

    @app.route('/api/log-purchase', methods=['POST'])
    def log_purchase():
        data = request.get_json()
        user_id, product_name, price = data.get('userId'), data.get('productName'), float(data.get('price'))

        if not User.query.get(user_id):
            return jsonify({"error": "User not found"}), 404
            
        new_purchase = Purchase(user_id=user_id, product_name=product_name, price=price)
        db.session.add(new_purchase)
        db.session.commit()
        
        return jsonify({"message": "Purchase logged successfully"}), 201

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
