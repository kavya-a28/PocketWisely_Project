# backend/app.py

import os
from flask import Flask, request, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from models import db, User, ProductEvent # Updated import

def generate_purchase_analysis(user, product_data):
    """
    This is your placeholder AI/ML model.
    It generates a simple analysis based on the user's history.
    You can make this much more complex over time.
    """
    # Example 1: Check for similar recent events
    product_name = product_data.get('name', 'this item')
    
    # A simple way to check for repeated purchases is by looking for a keyword
    # A more advanced version would use NLP for categorization.
    keywords = product_name.split()[:2] # e.g., ["boAt", "Rockerz"]
    if len(user.events) > 1 and len(keywords) > 0:
        similar_events = [
            e for e in user.events 
            if e.product_name and keywords[0].lower() in e.product_name.lower()
        ]
        if len(similar_events) > 3:
            return f"You've looked at items like '{keywords[0]}' {len(similar_events)} times recently. Are you sure you need another?"

    # Example 2: Generic mindful message
    price = product_data.get('price', 'this amount')
    return f"Think about it: investing {price} instead could be a step towards your long-term financial goals."


def create_app():
    """Creates and configures the Flask application."""
    app = Flask(__name__)
    CORS(app) 

    # --- Database Configuration ---
    DB_USER = "root"
    DB_PASSWORD = "pass123"  # Use your actual password
    DB_HOST = "127.0.0.1"
    DB_NAME = "pocketwisely_db"
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    migrate = Migrate(app, db)

    # --- API Endpoints ---

    @app.route('/')
    def index():
        return "<h1>PocketWisely Backend is Running!</h1>"

    @app.route('/api/register', methods=['POST'])
    def register_user():
        """Endpoint called from onboarding.js"""
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        user_id = data.get('userId')
        name = data.get('name')
        email = data.get('email')

        if not all([user_id, name, email]):
            return jsonify({"error": "Missing required fields"}), 400
        
        if User.query.get(user_id) or User.query.filter_by(email=email).first():
            return jsonify({"error": "User with this ID or email already exists"}), 409
        
        new_user = User(id=user_id, name=name, email=email)
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({"message": f"User '{name}' registered successfully"}), 201

    @app.route('/api/product_event', methods=['POST'])
    def product_event():
        """
        Endpoint called from background.js when a purchase is attempted.
        It logs the event and returns an 'AI' analysis.
        """
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        user_info = data.get('userInfo', {})
        product_data = data.get('productData', {})
        user_id = user_info.get('userId')

        if not user_id:
            return jsonify({"analysis": "Could not identify user. Please register."})

        user = User.query.get(user_id)
        if not user:
            # This case shouldn't happen if frontend logic is correct, but it's a good safeguard.
            return jsonify({"analysis": "User not found in our records. Please try re-registering."})

        # Log the event to the database
        new_event = ProductEvent(
            user_id=user.id,
            product_name=product_data.get('name'),
            price_text=product_data.get('price'),
            image_url=product_data.get('image')
        )
        db.session.add(new_event)
        db.session.commit()
        
        # Generate the analysis to send back to the user
        analysis_message = generate_purchase_analysis(user, product_data)

        return jsonify({"analysis": analysis_message})

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)