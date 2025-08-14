# models.py
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy # type: ignore

# Create a db instance. We will connect it to the Flask app in app.py
db = SQLAlchemy()

class User(db.Model):
    """Represents a user in the database."""
    id = db.Column(db.String(36), primary_key=True) # The unique ID from the extension
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # This creates a link so you can do `user.purchases` to get all of a user's purchases.
    # The `cascade` option ensures that if a user is deleted, all their purchases are also deleted.
    purchases = db.relationship('Purchase', backref='user', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.name}>"

class Purchase(db.Model):
    """Represents a single purchase event in the database."""
    id = db.Column(db.Integer, primary_key=True) # An auto-incrementing ID for each purchase
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    product_name = db.Column(db.String(512), nullable=False)
    price = db.Column(db.Float, nullable=False)
    purchase_date = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Purchase by {self.user_id}: {self.product_name}>"
