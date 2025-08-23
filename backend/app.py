# backend/app.py

from flask import Flask, request, jsonify # type: ignore
from flask_migrate import Migrate # type: ignore
from flask_cors import CORS # type: ignore
from models import db, User, PurchaseEvent
from sqlalchemy import desc # type: ignore
# Make sure you have your ml_logic.py file in the same folder
from ml_logic import get_prediction_and_advice
# --- NEW IMPORT ---
from recommendation_logic import get_recommendations

def create_app():
    app = Flask(__name__)
    # ✅ FIXED: Corrected CORS policy to allow requests from any origin to any /api/ endpoint.
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
        """Creates the initial 'viewed' event or increments its view_count."""
        data = request.get_json()
        user_id, product_data = data.get('userId'), data.get('productData', {})
        product_name = product_data.get('name')
        if not User.query.get(user_id): return jsonify({"error": "User not found"}), 404
        
        existing_event = PurchaseEvent.query.filter(
            PurchaseEvent.user_id == user_id,
            PurchaseEvent.product_name == product_name,
            PurchaseEvent.status.in_(['viewed', 'avoided'])
        ).order_by(desc(PurchaseEvent.event_date)).first()

        if existing_event:
            existing_event.view_count += 1
            existing_event.status = 'viewed'
            existing_event.decision = None
            db.session.commit()
            return jsonify({"message": "View count incremented", "eventId": existing_event.id})
        else:
            new_event = PurchaseEvent(
                user_id=user_id, product_name=product_name,
                price=float(str(product_data.get('price', '0')).replace('₹', '').replace(',', '')),
                image_url=product_data.get('image'), status='viewed', view_count=1
            )
            db.session.add(new_event)
            db.session.commit()
            return jsonify({"message": "Event created", "eventId": new_event.id}), 201

    @app.route('/api/event/decide', methods=['POST'])
    def decide_event():
        """Updates the event with the user's initial decision from the popup."""
        data = request.get_json()
        event_id, decision = data.get('eventId'), data.get('decision')
        if not all([event_id, decision]): return jsonify({"error": "Missing fields"}), 400
        
        event = PurchaseEvent.query.get(event_id)
        if not event: return jsonify({"error": "Event not found"}), 404
        
        event.decision = decision
        if decision == 'discarded':
            event.status = 'avoided'

        db.session.commit()
        return jsonify({"message": f"Decision '{decision}' recorded"})

    # ✅ MODIFIED: This endpoint now correctly handles GET and POST requests.
    @app.route('/api/user/profile', methods=['GET', 'POST'])
    def user_profile():
        user_id = None
        # For GET, we expect userId as a URL query parameter (e.g., ?userId=...)
        if request.method == 'GET':
            user_id = request.args.get('userId')
        # For POST, we expect it in the JSON body
        elif request.method == 'POST':
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON body"}), 400
            user_id = data.get('userId')

        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        if request.method == 'GET':
            # Return the user's current investment profile
            return jsonify({
                "risk_tolerance": user.risk_tolerance,
                "investment_duration": user.investment_duration,
                "financial_status": user.financial_status
            })

        if request.method == 'POST':
            # Update the user's investment profile with new answers from the survey
            data = request.get_json()
            if not data:
                 return jsonify({"error": "Invalid JSON body"}), 400
            answers = data.get('answers', {})
            
            # --- MODIFICATION: Handle 'comfort' value from frontend ---
            financial_stability = answers.get('financial_stability')
            if financial_stability == 'comfort':
                financial_stability = 'comfortable' # Match backend logic

            user.risk_tolerance = answers.get('risk_level')
            user.investment_duration = answers.get('duration')
            user.financial_status = financial_stability
            
            db.session.commit()
            return jsonify({"message": "User profile updated successfully"})

    # --- NEW ENDPOINT ---
    @app.route('/api/get-recommendation', methods=['POST'])
    def get_investment_recommendation():
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON body"}), 400

        event_id = data.get('eventId')
        answers = data.get('answers', {})

        risk = answers.get('risk_level')
        duration = answers.get('duration')
        # Handle 'comfort' value from frontend
        financial_status = answers.get('financial_stability')
        if financial_status == 'comfort':
            financial_status = 'comfortable'

        if not all([event_id, risk, duration, financial_status]):
            return jsonify({"error": "Missing eventId or profile answers"}), 400
        
        event = PurchaseEvent.query.get(event_id)
        if not event:
            return jsonify({"error": "Purchase event not found"}), 404
        
        investment_amount = event.price

        recommendation = get_recommendations(
            risk_tolerance=risk,
            investment_horizon=duration,
            financial_status=financial_status,
            investment_amount=investment_amount
        )

        if not recommendation:
            return jsonify({"error": "Could not generate a recommendation for the given profile."}), 404
            
        return jsonify(recommendation)


    @app.route('/api/analyze-and-advise', methods=['POST'])
    def analyze_and_advise():
        """Receives survey answers, runs the ML model, saves the prediction, and returns advice."""
        data = request.get_json()
        event_id, answers = data.get('eventId'), data.get('answers', {})
        if not event_id: return jsonify({"error": "Missing eventId"}), 400
        
        event = PurchaseEvent.query.get(event_id)
        if not event: return jsonify({"error": "Event not found"}), 404
            
        event.q_reason, event.q_budget, event.q_wait = answers.get('reason'), answers.get('budget'), answers.get('wait')
        
        event_data_for_ml = {
            'price': event.price, 'view_count': event.view_count, 'event_date': event.event_date,
            'product_name': event.product_name, 'q_reason': event.q_reason,
            'q_budget': event.q_budget, 'q_wait': event.q_wait
        }
        
        ml_result = get_prediction_and_advice(event_data_for_ml)
        
        event.model_prediction = ml_result['prediction']
        event.model_confidence = ml_result['confidence']
        
        db.session.commit()
        return jsonify(ml_result['advice'])

    @app.route('/api/event/log-final-decision', methods=['POST'])
    def log_final_decision():
        """Logs the user's final decision after seeing the model's advice."""
        data = request.get_json()
        event_id, final_decision = data.get('eventId'), data.get('finalDecision')
        if not all([event_id, final_decision]): return jsonify({"error": "Missing fields"}), 400
        
        event = PurchaseEvent.query.get(event_id)
        if not event: return jsonify({"error": "Event not found"}), 404
        
        # ✅ FIXED: Corrected column name to match models.py
        event.final_user_decision = final_decision
        
        if final_decision == 'avoided_after_advice':
            event.status = 'avoided'
        
        db.session.commit()
        return jsonify({"message": "Final decision logged"})

    @app.route('/api/event/update-status', methods=['POST'])
    def update_event_status():
        """Updates an event's status to 'added_to_cart' or 'buy_now'."""
        data = request.get_json()
        event_id, new_status = data.get('eventId'), data.get('newStatus')
        if not all([event_id, new_status]): return jsonify({"error": "Missing fields"}), 400

        event = PurchaseEvent.query.get(event_id)
        if not event: return jsonify({"error": "Event not found"}), 404

        event.status = new_status
        db.session.commit()
        return jsonify({"message": f"Status updated to '{new_status}'"})

    @app.route('/api/event/confirm-purchases', methods=['POST'])
    def confirm_purchases():
        """Updates events to 'purchased' based on names from the confirmation page."""
        data = request.get_json()
        user_id, purchased_product_names = data.get('userId'), data.get('productNames', [])
        if not all([user_id, purchased_product_names]): return jsonify({"error": "Missing fields"}), 400
        
        updated_count = 0
        for name in purchased_product_names:
            event_to_update = PurchaseEvent.query.filter(
                PurchaseEvent.user_id == user_id,
                PurchaseEvent.product_name.like(f"%{name[:50]}%"),
                PurchaseEvent.status.in_(['added_to_cart', 'buy_now'])
            ).order_by(desc(PurchaseEvent.event_date)).first()

            if event_to_update:
                event_to_update.status = 'purchased'
                updated_count += 1
        
        db.session.commit()
        return jsonify({"message": f"Confirmed {updated_count} purchases."})

    return app

app = create_app()

# ✅ FIXED: Corrected the typo in the main execution block
if __name__ == '__main__':
    app.run(debug=True)