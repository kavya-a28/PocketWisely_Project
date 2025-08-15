# backend/app.py

import os
from flask import Flask, request, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from models import db, User, ProductEvent

def generate_purchase_analysis(user, product_data):
    """
    This is your placeholder AI/ML model.
    It generates a simple analysis based on the user's history.
    """
    product_name = product_data.get('name', 'this item')
    keywords = product_name.split()[:2]
    
    if len(user.events) > 1 and len(keywords) > 0:
        similar_events = [
            e for e in user.events 
            if e.product_name and keywords[0].lower() in e.product_name.lower()
        ]
        if len(similar_events) > 3:
            return f"You've looked at items like '{keywords[0]}' {len(similar_events)} times recently. Are you sure you need another?"

    price = product_data.get('price', 'this amount')
    return f"Think about it: investing {price} instead could be a step towards your long-term financial goals."


def create_app():
    """Creates and configures the Flask application."""
    app = Flask(__name__)
    CORS(app) 

    # --- Database Configuration ---
    DB_USER = "root"
    DB_PASSWORD = "pass123"
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
        data = request.get_json()
        if not data: return jsonify({"error": "Invalid JSON"}), 400
        user_id, name, email = data.get('userId'), data.get('name'), data.get('email')
        if not all([user_id, name, email]): return jsonify({"error": "Missing required fields"}), 400
        if User.query.get(user_id) or User.query.filter_by(email=email).first(): return jsonify({"error": "User with this ID or email already exists"}), 409
        new_user = User(id=user_id, name=name, email=email)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": f"User '{name}' registered successfully"}), 201

    @app.route('/api/product_event', methods=['POST'])
    def product_event():
        data = request.get_json()
        if not data: return jsonify({"error": "Invalid JSON"}), 400

        user_info = data.get('userInfo', {})
        
        # --- ✅ THIS IS THE FIX ---
        # It handles cases where the scraper fails and sends null productData
        product_data = data.get('productData') or {}
        
        user_id = user_info.get('userId')
        action_type = data.get('buttonType', 'add_to_cart') 

        if not user_id: return jsonify({"analysis": "Could not identify user. Please register."})

        user = User.query.get(user_id)
        if not user: return jsonify({"analysis": "User not found in our records."})

        # Now, the .get() calls below are safe even if product_data was originally None
        new_event = ProductEvent(
            user_id=user.id,
            product_name=product_data.get('name'),
            price_text=product_data.get('price'),
            image_url=product_data.get('image'),
            action_type=action_type
        )
        db.session.add(new_event)
        db.session.commit()
        
        analysis_message = generate_purchase_analysis(user, product_data)

        return jsonify({
            "analysis": analysis_message,
            "eventId": new_event.id
        })

    @app.route('/api/update_event_decision', methods=['POST'])
    def update_event_decision():
        data = request.get_json()
        if not data: return jsonify({"error": "Invalid JSON"}), 400

        event_id = data.get('eventId')
        decision = data.get('decision')

        if not all([event_id, decision]): return jsonify({"error": "Missing eventId or decision"}), 400

        event = ProductEvent.query.get(event_id)
        if not event: return jsonify({"error": "Event not found"}), 404

        event.decision = decision
        
        if decision == 'proceeded':
            if event.action_type == 'buy_now':
                event.status = 'buying_now'
            else:
                event.status = 'added_to_cart'

        db.session.commit()
        return jsonify({"message": f"Event {event_id} updated successfully."}), 200

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)