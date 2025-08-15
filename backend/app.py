# backend/app.py

from flask import Flask, request, jsonify
from flask_migrate import Migrate
from flask_cors import CORS
from models import db, User, PurchaseEvent
from sqlalchemy import desc

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}}) 

    DB_USER = "root"
    DB_PASSWORD = "pass123"
    DB_HOST = "127.0.0.1"
    DB_NAME = "pocketwisely_db"
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)
    migrate = Migrate(app, db)

    @app.route('/')
    def index():
        return "<h1>PocketWisely Backend is Running!</h1>"

    @app.route('/api/register', methods=['POST'])
    def register_user():
        data = request.get_json()
        user_id, name, email = data.get('userId'), data.get('name'), data.get('email')
        if not all([user_id, name, email]): return jsonify({"error": "Missing required fields"}), 400
        if User.query.get(user_id) or User.query.filter_by(email=email).first():
            return jsonify({"error": "User with this ID or email already exists"}), 409
        new_user = User(id=user_id, name=name, email=email)
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": f"User '{name}' registered successfully"}), 201

    @app.route('/api/event/view', methods=['POST'])
    def view_event():
        """
        Creates a 'viewed' event or increments the view_count of an existing one.
        """
        data = request.get_json()
        user_id = data.get('userId')
        product_data = data.get('productData', {})
        product_name = product_data.get('name')
        
        if not User.query.get(user_id): return jsonify({"error": "User not found"}), 404

        # Check for an existing, non-purchased event for this product
        existing_event = PurchaseEvent.query.filter(
            PurchaseEvent.user_id == user_id,
            PurchaseEvent.product_name == product_name,
            PurchaseEvent.status != 'purchased'
        ).order_by(desc(PurchaseEvent.event_date)).first()

        if existing_event:
            existing_event.view_count += 1
            db.session.commit()
            return jsonify({"message": "View count incremented", "eventId": existing_event.id})
        else:
            new_event = PurchaseEvent(
                user_id=user_id,
                product_name=product_name,
                price=float(product_data.get('price', 0)),
                image_url=product_data.get('image'),
                status='viewed',
                view_count=1
            )
            db.session.add(new_event)
            db.session.commit()
            return jsonify({"message": "Event created", "eventId": new_event.id}), 201

    @app.route('/api/event/decide', methods=['POST'])
    def decide_event():
        """Updates the event with the user's decision from the popup."""
        data = request.get_json()
        event_id = data.get('eventId')
        decision = data.get('decision') # 'interested' or 'discarded'
        if not all([event_id, decision]): return jsonify({"error": "Missing fields"}), 400
        
        event = PurchaseEvent.query.get(event_id)
        if not event: return jsonify({"error": "Event not found"}), 404
        
        event.decision = decision
        db.session.commit()
        return jsonify({"message": f"Decision '{decision}' recorded"})

    @app.route('/api/event/update-status', methods=['POST'])
    def update_event_status():
        """Updates an event's status (e.g., to 'added_to_cart' or 'buy_now')."""
        data = request.get_json()
        event_id = data.get('eventId')
        new_status = data.get('newStatus')
        if not all([event_id, new_status]): return jsonify({"error": "Missing fields"}), 400

        event = PurchaseEvent.query.get(event_id)
        if not event: return jsonify({"error": "Event not found"}), 404

        event.status = new_status
        db.session.commit()
        return jsonify({"message": f"Status updated to '{new_status}'"})

    @app.route('/api/event/confirm-purchase', methods=['POST'])
    def confirm_purchase():
        """Updates a single event to 'purchased'."""
        data = request.get_json()
        event_id = data.get('eventId')
        if not event_id: return jsonify({"error": "Missing eventId"}), 400
        
        event = PurchaseEvent.query.get(event_id)
        if not event: return jsonify({"error": "Event not found"}), 404

        event.status = 'purchased'
        db.session.commit()
        return jsonify({"message": f"Confirmed purchase for event {event_id}"})

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
