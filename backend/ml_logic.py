# ml_logic.py
import joblib
import pandas as pd
from datetime import datetime
import random

# --- 1. Load the trained model and columns ONCE when the app starts ---
try:
    MODEL = joblib.load('mindful_purchase_model.pkl')
    MODEL_COLUMNS = joblib.load('model_columns.pkl')
    if not hasattr(MODEL, 'predict'):
        print("❌ Error: Loaded 'MODEL' is not a valid scikit-learn model.")
        MODEL = None
    else:
        print("✅ ML Model and columns loaded successfully.")
except FileNotFoundError:
    print("❌ Error: Model files not found. The app will return default responses.")
    MODEL = None
    MODEL_COLUMNS = []
except Exception as e:
    print(f"❌ An unexpected error occurred while loading the model: {e}")
    MODEL = None
    MODEL_COLUMNS = []

# --- 2. Feature Engineering Functions (Unchanged) ---
def categorize_product(product_name):
    if not isinstance(product_name, str): return 'Miscellaneous'
    name = product_name.lower()
    if any(word in name for word in ['headphone', 'phone', 'cable', 'charger', 'mouse', 'keyboard', 'gaming', 'computer', 'camera', 'speaker', 'smartwatch', 'laptop', 'router', 'webcam', 'ssd']): return 'Electronics'
    if any(word in name for word in ['milk', 'bread', 'handwash', 'dettol', 'refill', 'soap', 'shampoo']): return 'Groceries'
    if any(word in name for word in ['shirt', 'jeans', 'shoes', 'watch', 't-shirt']): return 'Fashion'
    if any(word in name for word in ['rack', 'organizer', 'pan', 'cookware', 'storage', 'kitchen']): return 'Home & Kitchen'
    return 'Miscellaneous'

def prepare_single_prediction(purchase_dict, training_columns):
    df = pd.DataFrame([purchase_dict])
    df['event_date'] = pd.to_datetime(df['event_date'])
    df['time_of_day'] = df['event_date'].dt.hour
    df['day_of_week'] = df['event_date'].dt.dayofweek
    df['category'] = df['product_name'].apply(categorize_product)
    df = pd.get_dummies(df, columns=['q_reason', 'q_budget', 'q_wait', 'category'])
    df_aligned = df.reindex(columns=training_columns, fill_value=0)
    return df_aligned

# --- ✨ MODIFIED: Advanced Gamified Suggestion Engine ---
def get_gamified_suggestion(price, category):
    """
    Generates a creative, category-specific investment suggestion.
    """
    # Simplified future value of a ONE-TIME investment (compounded annually at 12%)
    # FV = P * (1 + r)^t
    fv_3_years = price * (1.12**3)
    fv_5_years = price * (1.12**5)

    # --- Define Goals based on Price ---
    if price > 20000:
        goal = random.choice(["a down payment on a new scooter 🛵", "an international flight ticket ✈️", "a high-end laptop for your side hustle 💻"])
    elif price > 5000:
        goal = random.choice(["a weekend getaway to the mountains 🏔️", "a professional skill-building course 🎓", "a premium concert ticket 🎤"])
    elif price > 1000:
        goal = random.choice(["a gourmet dinner experience for two 🍽️", "a full year of your favorite streaming service 📺", "a collection of bestselling books 📚"])
    else:
        goal = random.choice(["a specialty coffee tasting ☕", "a trip to the cinema with snacks 🍿", "a premium online magazine subscription 📰"])

    # --- Define Investment Options based on Category ---
    if category == 'Electronics':
        options = [
            {"name": "Invest in a Tech ETF", "platform": "via Zerodha", "url": "https://zerodha.com/varsity/module/etfs/"},
            {"name": "Buy US Tech Stocks (Fractional)", "platform": "via Indmoney", "url": "https://www.indmoney.com/us-stocks"}
        ]
    elif category == 'Fashion':
        options = [
            {"name": "Invest in Digital Gold", "platform": "via Groww", "url": "https://groww.in/gold"},
            {"name": "Buy stocks in a Luxury Brand", "platform": "via Upstox", "url": "https://upstox.com/"}
        ]
    else: # Default for Home, Groceries, etc.
        options = [
            {"name": "Start a Nifty 50 SIP", "platform": "via Groww", "url": "https://groww.in/mutual-funds/nifty-50"},
            {"name": "Invest in a Blue-Chip Stock", "platform": "via Zerodha", "url": "https://zerodha.com/"}
        ]
        
    return {
        "title": f"Instead, this could fund {goal}!",
        "future_value_text": f"Investing **₹{price:,.0f}** today could grow to **₹{fv_5_years:,.0f}** in 5 years.",
        "options": options
    }

# --- 3. Main Prediction Function (Updated) ---
def get_prediction_and_advice(event_data):
    if MODEL is None:
        # Fallback if model isn't loaded
        price = event_data.get('price', 0)
        category = categorize_product(event_data.get('product_name'))
        return {
            "prediction": 1, "confidence": 1.0,
            "advice": {"type": "impulsive", "suggestion": get_gamified_suggestion(price, category)}
        }

    features = prepare_single_prediction(event_data, MODEL_COLUMNS)
    prediction = MODEL.predict(features)[0]
    confidence_scores = MODEL.predict_proba(features)[0]

    if prediction == 1: # Impulsive
        price = event_data.get('price', 0)
        category = categorize_product(event_data.get('product_name'))
        advice = {
            "type": "impulsive",
            "suggestion": get_gamified_suggestion(price, category)
        }
        confidence = round(confidence_scores[1], 2)
    else: # Mindful
        advice = {
            "type": "mindful",
            "question": "This seems like a planned purchase. Is this the best price you've found?"
        }
        confidence = round(confidence_scores[0], 2)

    return {"prediction": int(prediction), "confidence": confidence, "advice": advice}
