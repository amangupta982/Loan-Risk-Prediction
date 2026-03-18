from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import shap
from dotenv import load_dotenv
import google.generativeai as genai
from sklearn.ensemble import RandomForestClassifier
import warnings

# --- GNN Imports ---
import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv
from torch_geometric.data import Data

warnings.filterwarnings('ignore')

# ==========================================
# 1. SETUP & CONFIGURATION
# ==========================================
app = Flask(__name__)
CORS(app) 
load_dotenv()

gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)

# ==========================================
# 2. TRAIN BACKEND AI MODELS (RF & GNN)
# ==========================================
# A. Behavioral AI
X_behav = pd.DataFrame({'Form_Time': [25, 3, 300, 20, 2], 'Edits': [0, 0, 5, 1, 0], 'Pasted': [0, 1, 1, 0, 1]})
y_behav = [0, 1, 1, 0, 1] 
behav_model = RandomForestClassifier(random_state=42).fit(X_behav, y_behav)

# B. Traditional Credit AI
X_cred = pd.DataFrame({'Income': [5000, 3000, 8000, 2000, 10000], 'Debt': [1000, 2500, 500, 1500, 200], 'Missed_Payments': [0, 3, 0, 2, 0]})
y_cred = [0, 1, 0, 1, 0] 
cred_model = RandomForestClassifier(random_state=42).fit(X_cred, y_cred)

# C. GNN Social Trust Model (For First-Time Users)
class GNNCreditModel(torch.nn.Module):
    def __init__(self, num_features):
        super(GNNCreditModel, self).__init__()
        self.conv1 = GCNConv(num_features, 8)
        self.conv2 = GCNConv(8, 2)

    def forward(self, x, edge_index):
        x = F.relu(self.conv1(x, edge_index))
        x = self.conv2(x, edge_index)
        return torch.log_softmax(x, dim=1)

gnn_model = GNNCreditModel(num_features=3)
gnn_model.eval()

# ==========================================
# 3. ENDPOINT 1: PROCESS APPLICATION
# ==========================================
@app.route('/process_application', methods=['POST'])
def process_application():
    data = request.json
    
    # 1. Extract Form Data
    time_taken = data.get('time_taken', 30)
    edits = data.get('edits', 0)
    pasted = data.get('pasted', 0)
    income = data.get('income', 0)
    debt = data.get('debt', 0)
    missed_payments = data.get('missed_payments', 0)
    employment = data.get('employment', 'Not Specified')
    purpose = data.get('purpose', 'General')
    
    # NEW: Is this a first-time borrower? (Boolean: True/False)
    is_first_time = data.get('is_first_time', False)

    # --- FEATURE 4: BEHAVIORAL AI ---
    user_behav = pd.DataFrame({'Form_Time': [time_taken], 'Edits': [edits], 'Pasted': [pasted]})
    is_fraud = int(behav_model.predict(user_behav)[0])
    
    if is_fraud == 1:
        return jsonify({"status": "rejected", "reason": "behavioral", "message": "Suspicious activity detected."})

    # --- HARD BUSINESS RULE ---
    if income < 500:
        return jsonify({
            "status": "rejected", 
            "reason": "credit", 
            "odds": 0.0, 
            "main_issue": "Income", 
            "coach_advice": f"As a {employment}, having a steady income is vital. Your reported income is too low for a {purpose} loan right now."
        })

    # --- FEATURE 1: CREDIT AI ---
    user_cred = pd.DataFrame({'Income': [income], 'Debt': [debt], 'Missed_Payments': [missed_payments]})
    is_rejected = int(cred_model.predict(user_cred)[0])
    approval_odds = float(cred_model.predict_proba(user_cred)[0][0] * 100)

    # --- NEW FEATURE: GNN SOCIAL TRUST FOR FIRST-TIME USERS ---
    social_trust_applied = False
    
    if is_first_time:
        # Create a mock social graph for this user
        # Features: [Scaled Income, Scaled Debt, Credit History Length]
        user_node = [income / 10000.0, debt / 10000.0, 0.0] # 0.0 history
        trusted_friend = [0.9, 0.1, 0.9] # Great financial standing
        trusted_family = [0.8, 0.2, 0.8] # Good financial standing
        
        x_tensor = torch.tensor([user_node, trusted_friend, trusted_family], dtype=torch.float)
        
        # Connect the user (Node 0) to their trusted network (Nodes 1 and 2)
        edges = torch.tensor([[0, 0], [1, 2]], dtype=torch.long)
        
        with torch.no_grad():
            gnn_output = gnn_model(x_tensor, edges)
            gnn_prediction = gnn_output[0].argmax().item()
            
        # If the GNN says they are Low Risk (0) based on their network:
        if gnn_prediction == 0:
            approval_odds += 15.0 # Give them a 15% boost!
            social_trust_applied = True
            
            # If the boost pushes them over the threshold, approve them
            if approval_odds >= 50.0:
                is_rejected = 0

    # --- FINAL DECISION ---
    if is_rejected == 0:
        msg = "Loan Approved!"
        if social_trust_applied:
            msg += " You had no credit history, but our GNN Social Trust Engine vouched for you!"
        return jsonify({"status": "approved", "odds": round(approval_odds, 1), "message": msg})

    # --- FEATURES 2 & 2.5: EXPLAINABLE AI & COACH ---
    explainer = shap.TreeExplainer(cred_model)
    shap_values = explainer.shap_values(user_cred)
    
    if isinstance(shap_values, list):
        rejection_shap = shap_values[1][0]
    else:
        rejection_shap = shap_values[0, :, 1]
        
    biggest_issue_idx = rejection_shap.argmax()
    biggest_issue_name = user_cred.columns[biggest_issue_idx]
    
    coach_text = "Work on lowering your debt and increasing income."
    if gemini_key:
        prompt = f"""
        User rejected for a {purpose} loan. 
        Employment Status: {employment}. First time borrower: {is_first_time}.
        Main rejection reason: {biggest_issue_name}. 
        Income: ${income}, Debt: ${debt}. 
        
        Provide 2 actionable, empathetic steps to fix this. 
        Tailor the advice to their specific employment status. 
        Keep the response under 3 sentences.
        """
        model = genai.GenerativeModel("gemini-2.5-flash")
        coach_text = model.generate_content(prompt).text

    return jsonify({
        "status": "rejected",
        "reason": "credit",
        "odds": round(approval_odds, 1),
        "main_issue": biggest_issue_name,
        "coach_advice": coach_text
    })

# ==========================================
# 4. ENDPOINT 2: DIGITAL TWIN SIMULATOR
# ==========================================
@app.route('/simulate_future', methods=['POST'])
def simulate_future():
    data = request.json
    income = data.get('income', 0)
    current_debt = data.get('debt', 0)
    missed_payments = data.get('missed_payments', 0)
    monthly_payment = data.get('monthly_payment', 400)
    months_to_simulate = data.get('months', 12)
    
    timeline = []
    simulated_debt = current_debt
    
    for month in range(1, months_to_simulate + 1):
        simulated_debt -= monthly_payment
        if simulated_debt < 0: 
            simulated_debt = 0
            
        sim_df = pd.DataFrame({'Income': [income], 'Debt': [simulated_debt], 'Missed_Payments': [missed_payments]})
        future_odds = float(cred_model.predict_proba(sim_df)[0][0] * 100)
        
        timeline.append({
            "month": month,
            "remaining_debt": simulated_debt,
            "approval_odds": future_odds
        })
        
    return jsonify({"status": "success", "timeline": timeline})

if __name__ == '__main__':
    app.run(debug=True, port=5000)