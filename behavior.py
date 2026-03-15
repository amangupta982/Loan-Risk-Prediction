import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# 1. Train the Behavioral AI (Mock Data)
# Imagine this data was collected from thousands of previous users
X_train = pd.DataFrame({
    'Form_Time_Seconds': [120, 15, 300, 110, 5], # 15s/5s = Bots. 300s = Hesitating/Lying. 110-120s = Normal.
    'Income_Edits': [0, 0, 5, 1, 0],             # 5 edits = Highly suspicious.
    'Copy_Pasted_Info': [0, 1, 1, 0, 1]          # 1 = Pasting info is a major red flag for fraud.
})

# 0 = Normal Human (Approved behavior)
# 1 = Suspicious / Bot / Fraud (Rejected behavior)
y_train = [0, 1, 1, 0, 1]

# Train the model instantly
behavior_model = RandomForestClassifier(random_state=42)
behavior_model.fit(X_train, y_train)

# 2. The Form-Tracking Engine
def analyze_behavior(time_seconds, edits, copy_pasted):
    print(f"🕵️ Analyzing background form metrics...")
    
    # Package the user's background metrics
    user_data = pd.DataFrame({
        'Form_Time_Seconds': [time_seconds],
        'Income_Edits': [edits],
        'Copy_Pasted_Info': [copy_pasted]
    })
    
    # Predict if the behavior is normal or suspicious
    risk_prediction = behavior_model.predict(user_data)[0]
    
    if risk_prediction == 1:
        return "🚨 ALERT: High Risk Behavior Detected! Application flagged for fraud."
    else:
        return "✅ NORMAL: Behavior looks human and honest. Proceeding to financial check."

# 3. Test Inputs & Outputs in Terminal

print("--- TEST 1: The Honest Applicant ---")
print("Invisible Fields Captured: Took 2 mins (120s), 0 edits to income, No copy-pasting.")
print(analyze_behavior(time_seconds=120, edits=0, copy_pasted=0))

print("\n-----------------------------------------")

print("\n--- TEST 2: The Bot / Fraudster ---")
print("Invisible Fields Captured: Took 15 seconds, 4 edits to income, Copy-pasted details.")
print(analyze_behavior(time_seconds=15, edits=4, copy_pasted=1))