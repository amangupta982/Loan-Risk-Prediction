import pandas as pd
import shap
from sklearn.ensemble import RandomForestClassifier
import warnings
warnings.filterwarnings('ignore') # Keeps terminal clean

# 1. Instantly Train a Micro-Model (Mock Data for Hackathon)
# Features: Monthly Income, Total Debt, Missed Payments
X_train = pd.DataFrame({
    'Income': [5000, 3000, 8000, 2000, 10000],
    'Debt': [1000, 2500, 500, 1500, 200],
    'Missed_Payments': [0, 3, 0, 2, 0]
})
y_train = [0, 1, 0, 1, 0] # 0 = Approved (Low Risk), 1 = Rejected (High Risk)

model = RandomForestClassifier(random_state=42)
model.fit(X_train, y_train)

# 2. Function for the AI Coach
def rejection_coach(user_data_df):
    # Predict
    is_rejected = model.predict(user_data_df)[0]
    
    if is_rejected == 0:
        return "Result: APPROVED! No coaching needed."
    
    # Explain why they were rejected using SHAP
    explainer = shap.TreeExplainer(model)
    # SHAP returns a list of arrays for classification (one for each class)
    # We look at class 1 (Rejected)
    shap_values = explainer.shap_values(user_data_df)
    
    # In newer SHAP versions, shap_values might be an Explanation object or an array.
    # For a binary Random Forest, we usually want the values for class 1.
    if isinstance(shap_values, list):
        rejection_shap_values = shap_values[1][0]
    else:
        # Depending on SHAP version, it might return a 3D array: (samples, features, classes)
        rejection_shap_values = shap_values[0, :, 1]
    
    # Find the feature that pushed the score highest towards "Rejected"
    features = user_data_df.columns
    biggest_issue_index = rejection_shap_values.argmax()
    biggest_issue_name = features[biggest_issue_index]
    
    return f"Result: REJECTED.\nCoach says: Your main issue is your '{biggest_issue_name}'. Work on improving this specific area to get approved next time."

# 3. Test Input & Output in Terminal
print("--- INPUT (User submitting application) ---")
# A user with low income, high debt, and missed payments
user_input = pd.DataFrame({
    'Income': [2500],
    'Debt': [3000],
    'Missed_Payments': [1]
})
print(user_input.to_string(index=False))

print("\n--- OUTPUT (AI Coach Response) ---")
coach_feedback = rejection_coach(user_input)
print(coach_feedback)