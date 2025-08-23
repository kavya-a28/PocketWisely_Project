# backend/recommendation_logic.py

import math

# Enhanced comprehensive database of investment products with flexible time horizons
INVESTMENT_PRODUCTS = [
    # Ultra Short Term (1-90 days) - Low Risk
    {
        'name': 'Overnight Funds', 'risk_category': 'low', 'min_days': 1, 'max_days': 90, 'min_amount': 100,
        'returns_low': 3.5, 'returns_high': 4.5, 'liquidity': 'Very High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/overnight-funds'
    },
    {
        'name': 'Liquid Funds', 'risk_category': 'low', 'min_days': 1, 'max_days': 365, 'min_amount': 100,
        'returns_low': 4.0, 'returns_high': 6.0, 'liquidity': 'Very High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/liquid-funds'
    },
    {
        'name': 'Ultra Short Duration Funds', 'risk_category': 'low', 'min_days': 30, 'max_days': 365, 'min_amount': 1000,
        'returns_low': 4.5, 'returns_high': 6.5, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/ultra-short-duration-funds'
    },
    {
        'name': 'Money Market Funds', 'risk_category': 'low', 'min_days': 7, 'max_days': 365, 'min_amount': 100,
        'returns_low': 3.8, 'returns_high': 5.5, 'liquidity': 'Very High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/money-market-funds'
    },

    # Short Term (3 months to 2 years) - Low to Medium Risk
    {
        'name': 'Fixed Deposits', 'risk_category': 'low', 'min_days': 90, 'max_days': 3650, 'min_amount': 1000,
        'returns_low': 6.0, 'returns_high': 8.0, 'liquidity': 'Low', 'lock_in': '1-10 years',
        'url': 'https://www.hdfcbank.com/personal/save/deposits/fixed-deposit'
    },
    {
        'name': 'Short Duration Funds', 'risk_category': 'low', 'min_days': 180, 'max_days': 1095, 'min_amount': 500,
        'returns_low': 5.5, 'returns_high': 7.5, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/short-duration-funds'
    },
    {
        'name': 'Corporate Bond Funds', 'risk_category': 'low', 'min_days': 365, 'max_days': 1825, 'min_amount': 1000,
        'returns_low': 7.0, 'returns_high': 9.0, 'liquidity': 'Medium', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/corporate-bond-funds'
    },
    {
        'name': 'Conservative Hybrid Funds', 'risk_category': 'medium', 'min_days': 180, 'max_days': 1095, 'min_amount': 1000,
        'returns_low': 7.5, 'returns_high': 9.5, 'liquidity': 'Medium', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/conservative-hybrid-funds'
    },
    {
        'name': 'Arbitrage Funds', 'risk_category': 'low', 'min_days': 90, 'max_days': 730, 'min_amount': 500,
        'returns_low': 6.0, 'returns_high': 7.5, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/arbitrage-funds'
    },

    # Medium Term (2-5 years) - Low to High Risk
    {
        'name': 'Medium Duration Funds', 'risk_category': 'low', 'min_days': 730, 'max_days': 1825, 'min_amount': 1000,
        'returns_low': 6.5, 'returns_high': 8.5, 'liquidity': 'Medium', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/medium-duration-funds'
    },
    {
        'name': 'NSC (National Savings Certificate)', 'risk_category': 'low', 'min_days': 1825, 'max_days': 1825, 'min_amount': 1000,
        'returns_low': 6.8, 'returns_high': 6.8, 'liquidity': 'Very Low', 'lock_in': '5 years',
        'url': 'https://www.indiapost.gov.in/Financial/Pages/Content/Post-Office-Saving-Schemes.aspx'
    },
    {
        'name': 'Index Funds', 'risk_category': 'medium', 'min_days': 365, 'max_days': 3650, 'min_amount': 100,
        'returns_low': 10.0, 'returns_high': 12.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/index-funds'
    },
    {
        'name': 'Balanced Hybrid Funds', 'risk_category': 'medium', 'min_days': 730, 'max_days': 2190, 'min_amount': 1000,
        'returns_low': 8.5, 'returns_high': 11.0, 'liquidity': 'Medium', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/hybrid-funds'
    },
    {
        'name': 'Gold ETF / Digital Gold', 'risk_category': 'medium', 'min_days': 365, 'max_days': 2190, 'min_amount': 1,
        'returns_low': 8.0, 'returns_high': 12.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/gold'
    },
    {
        'name': 'Large Cap Funds', 'risk_category': 'medium', 'min_days': 730, 'max_days': 3650, 'min_amount': 500,
        'returns_low': 10.0, 'returns_high': 13.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/large-cap-funds'
    },
    {
        'name': 'Blue Chip Stocks (Diversified)', 'risk_category': 'high', 'min_days': 730, 'max_days': 2190, 'min_amount': 500,
        'returns_low': 12.0, 'returns_high': 18.0, 'liquidity': 'Very High', 'lock_in': 'None',
        'url': 'https://groww.in/stocks/collection/top-100-stocks'
    },

    # Long Term (5+ years) - All Risk Categories
    {
        'name': 'PPF (Public Provident Fund)', 'risk_category': 'low', 'min_days': 5475, 'max_days': 5475, 'min_amount': 500,
        'returns_low': 7.1, 'returns_high': 7.1, 'liquidity': 'Very Low', 'lock_in': '15 years',
        'url': 'https://www.sbi.co.in/web/personal-banking/investments-deposits/govt-schemes/ppf'
    },
    {
        'name': 'ELSS Funds (Tax Saving)', 'risk_category': 'medium', 'min_days': 1095, 'max_days': 3650, 'min_amount': 500,
        'returns_low': 12.0, 'returns_high': 15.0, 'liquidity': 'Low', 'lock_in': '3 years',
        'url': 'https://groww.in/mutual-funds/elss-funds'
    },
    {
        'name': 'Flexi Cap Funds', 'risk_category': 'medium', 'min_days': 1825, 'max_days': 3650, 'min_amount': 500,
        'returns_low': 11.0, 'returns_high': 14.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/flexi-cap-funds'
    },
    {
        'name': 'Multi Cap Funds', 'risk_category': 'medium', 'min_days': 1825, 'max_days': 3650, 'min_amount': 500,
        'returns_low': 11.5, 'returns_high': 14.5, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/multi-cap-funds'
    },
    {
        'name': 'Mid Cap Funds', 'risk_category': 'high', 'min_days': 1825, 'max_days': 3650, 'min_amount': 500,
        'returns_low': 14.0, 'returns_high': 18.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/mid-cap-funds'
    },
    {
        'name': 'Small Cap Funds', 'risk_category': 'high', 'min_days': 2190, 'max_days': 3650, 'min_amount': 500,
        'returns_low': 16.0, 'returns_high': 22.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/small-cap-funds'
    },
    {
        'name': 'Sector Funds (Technology)', 'risk_category': 'high', 'min_days': 1825, 'max_days': 3650, 'min_amount': 1000,
        'returns_low': 15.0, 'returns_high': 25.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/sector-funds'
    },
    {
        'name': 'Thematic Funds (ESG/Infrastructure)', 'risk_category': 'high', 'min_days': 2190, 'max_days': 3650, 'min_amount': 1000,
        'returns_low': 13.0, 'returns_high': 20.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/thematic-funds'
    },
    {
        'name': 'International Funds (US/Global)', 'risk_category': 'high', 'min_days': 1825, 'max_days': 3650, 'min_amount': 1000,
        'returns_low': 12.0, 'returns_high': 16.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/international-funds'
    },

    # Alternative Investments (Medium to High Risk)
    {
        'name': 'REITs (Real Estate Investment Trusts)', 'risk_category': 'medium', 'min_days': 1095, 'max_days': 3650, 'min_amount': 2000,
        'returns_low': 8.0, 'returns_high': 12.0, 'liquidity': 'Medium', 'lock_in': 'None',
        'url': 'https://groww.in/stocks/reits'
    },
    {
        'name': 'InvITs (Infrastructure Investment Trusts)', 'risk_category': 'medium', 'min_days': 1825, 'max_days': 3650, 'min_amount': 10000,
        'returns_low': 7.5, 'returns_high': 11.0, 'liquidity': 'Medium', 'lock_in': 'None',
        'url': 'https://groww.in/stocks/invits'
    },
    {
        'name': 'Commodity Funds (Silver/Gold)', 'risk_category': 'medium', 'min_days': 365, 'max_days': 2190, 'min_amount': 1000,
        'returns_low': 6.0, 'returns_high': 15.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/commodity-funds'
    },

    # High-Risk, High-Reward Options
    {
        'name': 'Crypto Funds (Regulated)', 'risk_category': 'high', 'min_days': 365, 'max_days': 2190, 'min_amount': 100,
        'returns_low': -20.0, 'returns_high': 50.0, 'liquidity': 'High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/overseas-funds'
    },
    {
        'name': 'Individual Stocks (Growth)', 'risk_category': 'high', 'min_days': 365, 'max_days': 3650, 'min_amount': 100,
        'returns_low': 10.0, 'returns_high': 30.0, 'liquidity': 'Very High', 'lock_in': 'None',
        'url': 'https://groww.in/stocks/collection/growth-stocks'
    },
    {
        'name': 'IPO Investments', 'risk_category': 'high', 'min_days': 180, 'max_days': 1095, 'min_amount': 14000,
        'returns_low': -10.0, 'returns_high': 40.0, 'liquidity': 'Medium', 'lock_in': 'None',
        'url': 'https://groww.in/ipo'
    }
]

def days_to_years(days):
    """Convert days to years for calculation purposes."""
    return days / 365.25

def calculate_future_value_flexible(principal, low_rate, high_rate, days):
    """Calculates future value for flexible time periods (30 days to 10 years)."""
    years = days_to_years(days)
    
    # Handle negative returns for high-risk investments
    low_rate_decimal = low_rate / 100
    high_rate_decimal = high_rate / 100
    
    # For short periods, use simple interest; for longer periods, use compound interest
    if days <= 365:
        # Simple interest for periods less than a year
        future_value_low = principal * (1 + (low_rate_decimal * years))
        future_value_high = principal * (1 + (high_rate_decimal * years))
    else:
        # Compound interest for periods longer than a year
        future_value_low = principal * math.pow((1 + low_rate_decimal), years)
        future_value_high = principal * math.pow((1 + high_rate_decimal), years)
    
    return {
        "low": round(max(0, future_value_low), 2),  # Ensure non-negative values
        "high": round(future_value_high, 2)
    }

def convert_horizon_to_days(horizon_input):
    """
    Convert various horizon inputs to days.
    Supports: 'short' (2 years), 'medium' (4 years), 'long' (7 years)
    Or direct day values for more flexibility.
    """
    if isinstance(horizon_input, (int, float)):
        return int(horizon_input)
    
    horizon_map = {
        'short': 730,    # 2 years
        'medium': 1460,  # 4 years  
        'long': 2555     # 7 years
    }
    
    return horizon_map.get(horizon_input.lower(), 1460)  # Default to medium term

def get_risk_score_adjustment(financial_status, base_risk_level):
    """
    Adjust risk tolerance based on financial status with more nuanced logic.
    """
    risk_levels = ['low', 'medium', 'high']
    current_index = risk_levels.index(base_risk_level.lower())
    
    if financial_status.lower() == 'tough':
        # Move towards more conservative investments
        new_index = max(0, current_index - 1)
    elif financial_status.lower() == 'flexible':
        # Allow for more aggressive investments
        new_index = min(2, current_index + 1)
    else:  # 'comfortable'
        new_index = current_index
    
    return risk_levels[new_index]

def score_product_suitability(product, days, investment_amount, adjusted_risk):
    """
    Score how suitable a product is for the given criteria.
    Higher score = better match.
    """
    score = 0
    
    # Time horizon match (most important factor)
    if product['min_days'] <= days <= product['max_days']:
        score += 50
        # Bonus for being in the sweet spot of the range
        mid_point = (product['min_days'] + product['max_days']) / 2
        time_fit = 1 - abs(days - mid_point) / (product['max_days'] - product['min_days'])
        score += time_fit * 20
    elif days < product['min_days']:
        # Penalize if investment period is too short
        score -= 20
    else:
        # Penalize if investment period is too long
        score -= 10
    
    # Risk match
    if product['risk_category'] == adjusted_risk:
        score += 30
    
    # Amount suitability
    if investment_amount >= product['min_amount']:
        score += 10
        # Bonus for higher amounts in products that benefit from scale
        if investment_amount >= product['min_amount'] * 10:
            score += 5
    else:
        # Significant penalty for insufficient amount
        score -= 30
    
    # Liquidity bonus for shorter time horizons
    if days <= 365:
        liquidity_scores = {'Very High': 15, 'High': 10, 'Medium': 5, 'Low': 0, 'Very Low': -10}
        score += liquidity_scores.get(product['liquidity'], 0)
    
    # Return potential (average return rate)
    avg_return = (product['returns_low'] + product['returns_high']) / 2
    score += avg_return * 0.5  # Small bonus for higher returns
    
    return max(0, score)  # Ensure non-negative scores

def get_recommendations(risk_tolerance, investment_horizon, financial_status, investment_amount):
    """
    Enhanced recommendation engine with flexible time horizons and comprehensive scoring.
    """
    # Convert investment horizon to days
    investment_days = convert_horizon_to_days(investment_horizon)
    
    # Ensure investment period is within our supported range (30 days to 10 years)
    investment_days = max(30, min(3650, investment_days))
    
    # Adjust risk based on financial status
    adjusted_risk = get_risk_score_adjustment(financial_status, risk_tolerance)
    
    # Score all products
    product_scores = []
    for product in INVESTMENT_PRODUCTS:
        score = score_product_suitability(product, investment_days, investment_amount, adjusted_risk)
        if score > 0:  # Only consider products with positive scores
            product_scores.append({
                'product': product,
                'score': score
            })
    
    # Sort by score (highest first)
    product_scores.sort(key=lambda x: x['score'], reverse=True)
    
    if not product_scores:
        return None
    
    # Get the best product
    best_match = product_scores[0]['product']
    
    # Calculate future value
    future_values = calculate_future_value_flexible(
        investment_amount, 
        best_match['returns_low'], 
        best_match['returns_high'], 
        investment_days
    )
    
    # Calculate additional metrics
    years = days_to_years(investment_days)
    total_gain_low = future_values['low'] - investment_amount
    total_gain_high = future_values['high'] - investment_amount
    
    # Format the recommendation
    recommendation = {
        'product_name': best_match['name'],
        'investment_amount': investment_amount,
        'future_values': future_values,
        'expected_return': {
            'low': best_match['returns_low'],
            'high': best_match['returns_high']
        },
        'total_gain': {
            'low': round(total_gain_low, 2),
            'high': round(total_gain_high, 2)
        },
        'risk_level': adjusted_risk.capitalize(),
        'liquidity': best_match['liquidity'],
        'minimum_amount': best_match['min_amount'],
        'investment_period': {
            'days': investment_days,
            'years': round(years, 2)
        },
        'lock_in_period': best_match.get('lock_in'),
        'redirect_url': best_match['url'],
        'suitability_score': round(product_scores[0]['score'], 1),
        'alternative_options': [
            {
                'name': alt['product']['name'],
                'score': round(alt['score'], 1),
                'risk': alt['product']['risk_category'],
                'returns': f"{alt['product']['returns_low']}-{alt['product']['returns_high']}%"
            }
            for alt in product_scores[1:4]  # Top 3 alternatives
        ]
    }
    
    return recommendation