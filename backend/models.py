# backend/models.py

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy # type: ignore

db = SQLAlchemy()

class User(db.Model):
    """Represents a user in the database."""
    __tablename__ = 'user'
    id = db.Column(db.String(36), primary_key=True)  # The unique ID from the extension
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to see all product events for a user
    events = db.relationship('ProductEvent', backref='user', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.id} | {self.name}>"

# In models.py

class ProductEvent(db.Model):
    """
    Represents a single intercepted purchase event.
    This logs every time the user clicks 'Add to Cart' or 'Buy Now'.
    """
    __tablename__ = 'product_event'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    product_name = db.Column(db.String(512), nullable=True)
    price_text = db.Column(db.String(50), nullable=True)
    image_url = db.Column(db.String(1024), nullable=True)
    event_date = db.Column(db.DateTime, default=datetime.utcnow)

    # --- NEW COLUMNS ---
    # The status of the event in the purchase funnel.
    status = db.Column(db.String(20), nullable=False, default='viewed') # statuses: viewed, added_to_cart, purchased
    
    # The user's decision on the popup.
    decision = db.Column(db.String(20), nullable=True) # decisions: proceeded, delayed
    action_type = db.Column(db.String(20), nullable=False, default='add_to_cart') # e.g., 'add_to_cart', 'buy_now'
    def __repr__(self):
        return f"<Event {self.id}: {self.product_name} - {self.action_type}>"

# Note: The original 'Purchase' model is no longer needed if we use 'ProductEvent'
# for all logging. If you still want to log *confirmed* purchases separately,
# you can keep it and add a new API endpoint for it.