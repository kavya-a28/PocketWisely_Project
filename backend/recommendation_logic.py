# backend/recommendation_logic.py

import math

# A comprehensive database of investment products transcribed from the provided images.
# I've added a 'horizon' key based on the Risk-Horizon Matrix and a placeholder URL for redirection.
INVESTMENT_PRODUCTS = [
    # Low Risk
    {
        'name': 'Fixed Deposits', 'risk_category': 'low', 'horizon': ['short'], 'min_amount': 1000,
        'returns_low': 6.0, 'returns_high': 8.0, 'liquidity': 'Low', 'lock_in': '1-10 years',
        'url': 'https://www.hdfcbank.com/personal/save/deposits/fixed-deposit'
    },
    {
        'name': 'Liquid Funds', 'risk_category': 'low', 'horizon': ['short'], 'min_amount': 100,
        'returns_low': 4.0, 'returns_high': 6.0, 'liquidity': 'Very High', 'lock_in': 'None',
        'url': 'https://groww.in/mutual-funds/liquid-funds'
    },
    {
        'name': 'PPF (Public Provident Fund)', 'risk_category': 'low', 'horizon': ['medium', 'long'], 'min_amount': 500,
        'returns_low': 7.1, 'returns_high': 7.1, 'liquidity': 'Very Low', 'lock_in': '15 years',
        'url': 'https://www.sbi.co.in/web/personal-banking/investments-deposits/govt-schemes/ppf'
    },
    {
        'name': 'NSC (National Savings Certificate)', 'risk_category': 'low', 'horizon': ['medium'], 'min_amount': 1000,
        'returns_low': 6.8, 'returns_high': 6.8, 'liquidity': 'Very Low', 'lock_in': '5 years',
        'url': 'https://www.indiapost.gov.in/Financial/Pages/Content/Post-Office-Saving-Schemes.aspx'
    },
    {
        'name': 'Large Cap Funds (via SIP)', 'risk_category': 'low', 'horizon': ['long'], 'min_amount': 500,
        'returns_low': 10.0, 'returns_high': 12.0, 'liquidity': 'High', 'lock_in': None,
        'url': 'https://groww.in/mutual-funds/large-cap-funds'
    },
    # Medium Risk
    {
        'name': 'Hybrid Funds', 'risk_category': 'medium', 'horizon': ['short'], 'min_amount': 1000,
        'returns_low': 8.0, 'returns_high': 10.0, 'liquidity': 'Medium', 'lock_in': None,
        'url': 'https://groww.in/mutual-funds/hybrid-funds'
    },
    {
        'name': 'Index Funds', 'risk_category': 'medium', 'horizon': ['medium'], 'min_amount': 100,
        'returns_low': 10.0, 'returns_high': 11.0, 'liquidity': 'High', 'lock_in': None,
        'url': 'https://groww.in/mutual-funds/index-funds'
    },
    {
        'name': 'Gold ETF / Digital Gold', 'risk_category': 'medium', 'horizon': ['medium'], 'min_amount': 1,
        'returns_low': 8.0, 'returns_high': 10.0, 'liquidity': 'High', 'lock_in': None,
        'url': 'https://groww.in/gold'
    },
    {
        'name': 'ELSS Funds', 'risk_category': 'medium', 'horizon': ['long'], 'min_amount': 500,
        'returns_low': 12.0, 'returns_high': 15.0, 'liquidity': 'Low', 'lock_in': '3 years',
        'url': 'https://groww.in/mutual-funds/elss-funds'
    },
    # High Risk
    {
        'name': 'Blue Chip Stocks', 'risk_category': 'high', 'horizon': ['short'], 'min_amount': 100,
        'returns_low': 12.0, 'returns_high': 18.0, 'liquidity': 'Very High', 'lock_in': None,
        'url': 'https://groww.in/stocks/collection/top-100-stocks'
    },
    {
        'name': 'Mid Cap SIP', 'risk_category': 'high', 'horizon': ['medium'], 'min_amount': 500,
        'returns_low': 15.0, 'returns_high': 20.0, 'liquidity': 'High', 'lock_in': None,
        'url': 'https://groww.in/mutual-funds/mid-cap-funds'
    },
    {
        'name': 'Small Cap Mix SIP', 'risk_category': 'high', 'horizon': ['long'], 'min_amount': 500,
        'returns_low': 18.0, 'returns_high': 25.0, 'liquidity': 'High', 'lock_in': None,
        'url': 'https://groww.in/mutual-funds/small-cap-funds'
    },
]

def calculate_future_value(principal, low_rate, high_rate, years):
    """Calculates a range for the future value of an investment."""
    low_rate_decimal = low_rate / 100
    high_rate_decimal = high_rate / 100
    
    # Formula: FV = P * (1 + r)^n
    future_value_low = principal * math.pow((1 + low_rate_decimal), years)
    future_value_high = principal * math.pow((1 + high_rate_decimal), years)
    
    return {
        "low": round(future_value_low, 2),
        "high": round(future_value_high, 2)
    }

def get_recommendations(risk_tolerance, investment_horizon, financial_status, investment_amount):
    """
    The main recommendation engine logic.
    Filters products based on an adjusted risk profile and returns the best option.
    """
    # 1. Define mappings
    risk_map = {'low': 1, 'medium': 2, 'high': 3}
    horizon_years_map = {'short': 2, 'medium': 4, 'long': 7} # Average years for FV calculation

    # 2. Adjust risk level based on financial status
    base_risk_score = risk_map.get(risk_tolerance.lower(), 2)
    
    if financial_status.lower() == 'tough':
        adjusted_risk_score = max(1, base_risk_score - 1)
    elif financial_status.lower() == 'flexible':
        adjusted_risk_score = min(3, base_risk_score + 1)
    else: # Comfortable
        adjusted_risk_score = base_risk_score
        
    adjusted_risk_str = [k for k, v in risk_map.items() if v == adjusted_risk_score][0]
    
    # 3. Filter products
    eligible_products = [
        p for p in INVESTMENT_PRODUCTS
        if p['risk_category'] == adjusted_risk_str
        and investment_horizon.lower() in p['horizon']
        and investment_amount >= p['min_amount']
    ]
    
    # Fallback strategy: If no products match, broaden the search to risk category only
    if not eligible_products:
        eligible_products = [
            p for p in INVESTMENT_PRODUCTS
            if p['risk_category'] == adjusted_risk_str
            and investment_amount >= p['min_amount']
        ]

    if not eligible_products:
        return None # No suitable product found

    # 4. Select the best product (highest average return)
    best_product = sorted(eligible_products, key=lambda p: (p['returns_high'] + p['returns_low']) / 2, reverse=True)[0]
    
    # 5. Calculate future value for the best product
    years = horizon_years_map.get(investment_horizon.lower(), 5)
    future_values = calculate_future_value(investment_amount, best_product['returns_low'], best_product['returns_high'], years)

    # 6. Format and return the final recommendation
    recommendation = {
        'product_name': best_product['name'],
        'investment_amount': investment_amount,
        'future_values': future_values,
        'expected_return': {
            'low': best_product['returns_low'],
            'high': best_product['returns_high']
        },
        'risk_level': adjusted_risk_str.capitalize(),
        'liquidity': best_product['liquidity'],
        'minimum_amount': best_product['min_amount'],
        'time_horizon_years': years,
        'redirect_url': best_product['url']
    }
    
    return recommendation