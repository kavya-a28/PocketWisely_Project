# backend/models.py

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy # type: ignore

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    events = db.relationship('PurchaseEvent', backref='user', lazy=True, cascade="all, delete-orphan")

# In models.py

class PurchaseEvent(db.Model):
    __tablename__ = 'purchase_event'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    product_name = db.Column(db.String(512), nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(1024), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='viewed')
    decision = db.Column(db.String(50), nullable=True)
    view_count = db.Column(db.Integer, default=1)
    event_date = db.Column(db.DateTime, default=datetime.utcnow)

    # --- NEW COLUMNS for the survey answers ---
    q_reason = db.Column(db.String(255), nullable=True)
    q_budget = db.Column(db.String(50), nullable=True)
    q_wait = db.Column(db.String(50), nullable=True)
