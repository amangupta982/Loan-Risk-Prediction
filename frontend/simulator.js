document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 1. LOAD ORIGINAL DATA FROM MEMORY
    // ==========================================
    const storedData = localStorage.getItem('fintwin_data');
    
    let baseData = {
        income: 850000, 
        loan: 2500000, 
        cibil: 750,
        original_odds: 87,
        missed_payments: 0
    };

    if (storedData) {
        const parsed = JSON.parse(storedData);
        baseData.income = parsed.user_inputs.income || baseData.income;
        baseData.loan = parsed.user_inputs.loan || baseData.loan;
        baseData.cibil = parsed.user_inputs.cibil || baseData.cibil;
        baseData.original_odds = Math.round(parsed.ai_result.odds) || baseData.original_odds;
        
        // Infer missed payments from CIBIL for the backend
        if (baseData.cibil < 650) baseData.missed_payments = 2;
        else if (baseData.cibil < 720) baseData.missed_payments = 1;
    }

    const originalRisk = 100 - baseData.original_odds;

    // ==========================================
    // 2. SETUP UI ELEMENTS (Make sure your HTML has these IDs!)
    // ==========================================
    // Sliders
    const incomeSlider = document.getElementById('incomeSlider');
    const loanSlider = document.getElementById('loanSlider');
    const durationSlider = document.getElementById('durationSlider');
    const rateSlider = document.getElementById('rateSlider');

    // Slider Text Labels
    const incomeVal = document.getElementById('incomeVal');
    const loanVal = document.getElementById('loanVal');
    const durationVal = document.getElementById('durationVal');
    const rateVal = document.getElementById('rateVal');

    // Results Boxes
    const simMonthlyPayment = document.getElementById('simMonthlyPayment');
    const simRiskScore = document.getElementById('simRiskScore');
    const simApproveProb = document.getElementById('simApproveProb');

    // Comparison Boxes
    const origRiskVal = document.getElementById('origRiskVal');
    const origRiskStatus = document.getElementById('origRiskStatus');
    const newRiskVal = document.getElementById('newRiskVal');
    const newRiskStatus = document.getElementById('newRiskStatus');
    const simWarningBox = document.getElementById('simWarningBox');

    // Initialize Original UI Values
    if(origRiskVal) origRiskVal.innerText = originalRisk;
    if(origRiskStatus) {
        origRiskStatus.innerText = originalRisk > 50 ? "High Risk" : "Approved";
        origRiskStatus.style.color = originalRisk > 50 ? "#EF4444" : "#10B981";
    }

    // Initialize Slider positions to match the user's actual data
    if(incomeSlider) incomeSlider.value = baseData.income;
    if(loanSlider) loanSlider.value = baseData.loan;

    // Helper to format currency
    const formatMoney = (num) => '₹' + parseInt(num).toLocaleString('en-IN');

    // ==========================================
    // 3. CHART SETUP (Chart.js)
    // ==========================================
    Chart.defaults.font.family = "'Inter', sans-serif";
    const ctx = document.getElementById('comparisonChart')?.getContext('2d');
    let compChart = null;

    if (ctx) {
        compChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Original', 'Simulated'],
                datasets: [
                    {
                        label: 'Risk Score',
                        data: [originalRisk, originalRisk], // Will update dynamically
                        backgroundColor: '#EF4444', // Red for Risk
                        borderRadius: 4,
                        barThickness: 40
                    },
                    {
                        label: 'Approval Probability',
                        data: [baseData.original_odds, baseData.original_odds],
                        backgroundColor: '#10B981', // Green for Approval
                        borderRadius: 4,
                        barThickness: 40
                    }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { min: 0, max: 100, grid: { borderDash: [4, 4] } }, x: { grid: { display: false } } },
                plugins: { legend: { display: false } } // Hidden since colors are obvious
            }
        });
    }

    // ==========================================
    // 4. THE SIMULATION ENGINE
    // ==========================================
    let timeoutId = null;

    function calculateEMI(principal, annualRate, months) {
        if (annualRate === 0) return principal / months;
        const r = (annualRate / 12) / 100; // Monthly interest rate
        // Standard EMI Formula
        const emi = principal * r * (Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
        return emi;
    }

    async function runSimulation() {
        // Grab current slider values
        const currentIncome = parseInt(incomeSlider?.value || baseData.income);
        const currentLoan = parseInt(loanSlider?.value || baseData.loan);
        const currentDuration = parseInt(durationSlider?.value || 36);
        const currentRate = parseFloat(rateSlider?.value || 8.0);

        // Update Slider Text Labels instantly
        if(incomeVal) incomeVal.innerText = formatMoney(currentIncome);
        if(loanVal) loanVal.innerText = formatMoney(currentLoan);
        if(durationVal) durationVal.innerText = `${currentDuration} mo`;
        if(rateVal) rateVal.innerText = `${currentRate.toFixed(1)}%`;

        // 1. Calculate the exact math for the new Monthly Payment (EMI)
        const emi = calculateEMI(currentLoan, currentRate, currentDuration);
        if(simMonthlyPayment) simMonthlyPayment.innerText = formatMoney(emi);

        // 2. Prepare payload for Python Backend
        // We translate the simulated loan size/EMI into "Debt" so the Random Forest reacts to it!
        const payload = {
            income: Math.round(currentIncome / 12),
            loan_amount: currentLoan,
            debt: Math.round(emi * 12), // Use Annualized EMI as the simulated debt burden
            missed_payments: baseData.missed_payments,
            is_first_time: baseData.cibil === 0,
            employment: "Salaried", purpose: "General",
            time_taken: 45, edits: 0, pasted: 0
        };

        try {
            // Call AI Backend
            const response = await fetch('http://127.0.0.1:5000/process_application', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            // 3. Process AI Results
            const simulatedOdds = Math.round(result.odds);
            const simulatedRisk = 100 - simulatedOdds;
            const isApproved = simulatedRisk <= 50;

            // Update Top Results UI
            if(simRiskScore) {
                simRiskScore.innerText = simulatedRisk;
                simRiskScore.style.color = isApproved ? '#334155' : '#EF4444';
            }
            if(simApproveProb) {
                simApproveProb.innerText = `${simulatedOdds}%`;
                simApproveProb.style.color = isApproved ? '#10B981' : '#EF4444';
            }

            // Update Comparison UI
            if(newRiskVal) newRiskVal.innerText = simulatedRisk;
            if(newRiskStatus) {
                newRiskStatus.innerText = isApproved ? "Approved" : "High Risk";
                newRiskStatus.style.color = isApproved ? "#10B981" : "#EF4444";
            }

            // Update Dynamic Warning Box
            if(simWarningBox) {
                if (simulatedRisk > originalRisk && !isApproved) {
                    simWarningBox.innerHTML = "Warning: Simulated parameters significantly increase default risk.";
                    simWarningBox.style.color = "#EF4444";
                    simWarningBox.style.backgroundColor = "#fee2e2";
                    simWarningBox.style.border = "1px solid #fca5a5";
                } else if (simulatedRisk < originalRisk && isApproved) {
                    simWarningBox.innerHTML = "Success: These parameters improve your approval odds!";
                    simWarningBox.style.color = "#10B981";
                    simWarningBox.style.backgroundColor = "#d1fae5";
                    simWarningBox.style.border = "1px solid #6ee7b7";
                } else {
                    simWarningBox.innerHTML = "Parameters adjusted. Profile remains stable.";
                    simWarningBox.style.color = "#3b82f6";
                    simWarningBox.style.backgroundColor = "#dbeafe";
                    simWarningBox.style.border = "1px solid #93c5fd";
                }
            }

            // Update Chart Data and Animate
            if(compChart) {
                compChart.data.datasets[0].data[1] = simulatedRisk; // Red Bar
                compChart.data.datasets[1].data[1] = simulatedOdds; // Green Bar
                compChart.update();
            }

        } catch (err) {
            console.error("Simulation API Error:", err);
        }
    }

    // ==========================================
    // 5. ATTACH EVENT LISTENERS (With Debounce)
    // ==========================================
    // Debouncing prevents crashing your Python server if the user drags the slider rapidly.
    const sliders = [incomeSlider, loanSlider, durationSlider, rateSlider];
    sliders.forEach(slider => {
        if (slider) {
            slider.addEventListener('input', () => {
                clearTimeout(timeoutId);
                // Call immediately to update text, but delay the API call by 400ms
                timeoutId = setTimeout(runSimulation, 400);
            });
        }
    });

    // Run once on load to populate everything
    runSimulation();
});