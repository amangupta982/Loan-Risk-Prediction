document.addEventListener("DOMContentLoaded", () => {
    const loanForm = document.getElementById("loanForm");
    const analysisCard = document.getElementById("analysisCard");
    const inputs = loanForm.querySelectorAll("input");
    const processingOverlay = document.getElementById("processingOverlay");

    loanForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        let isValid = true;
        
        // Grab only the required inputs for validation
        const requiredInputs = loanForm.querySelectorAll("input[required]");
        requiredInputs.forEach(input => {
            input.style.borderColor = "var(--border-color)";
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = "#ff7675"; 
            }
        });

        if (!isValid) {
            analysisCard.classList.remove("shake");
            void analysisCard.offsetWidth; 
            analysisCard.classList.add("shake");
        } else {
            // 1. Loading UI
            const btn = document.querySelector(".btn-analyze");
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initializing AI...';
            btn.style.opacity = "0.8";
            btn.disabled = true;

            // 2. Extract Data from all inputs (cleaning out commas/symbols)
            const inputVals = Array.from(inputs).map(inp => parseInt(inp.value.replace(/[^0-9]/g, '')) || 0);
            
            // Map inputs based on your form structure
            const annualIncome = inputVals[0] || 850000;
            const loanAmount = inputVals[1] || 2500000;
            const loanTerm = inputVals[2] || 36;
            const cibilScore = inputVals[3] || 750; 
            
            // Sum all asset fields
            const totalAssets = (inputVals[4] || 0) + (inputVals[5] || 0) + (inputVals[6] || 0) + (inputVals[7] || 0);

            // Translate CIBIL score into "Missed Payments" for the backend ML model
            let estimatedMissedPayments = 0;
            if (cibilScore < 650) estimatedMissedPayments = 2;
            else if (cibilScore < 720) estimatedMissedPayments = 1;

            const payload = {
                income: Math.round(annualIncome / 12),
                loan_amount: loanAmount,
                debt: 5000, 
                missed_payments: estimatedMissedPayments,
                is_first_time: cibilScore === 0 ? true : false,
                employment: "Salaried",
                purpose: "General",
                time_taken: 45, edits: 0, pasted: 0
            };

            const rawInputsToSave = { 
                income: annualIncome, 
                loan: loanAmount, 
                cibil: cibilScore, 
                assets: totalAssets 
            };

            // 3. Show Processing Overlay
            setTimeout(() => {
                if(processingOverlay) processingOverlay.style.display = "flex";
                runAISteps(payload, rawInputsToSave);
            }, 600);
        }
    });

    function runAISteps(payload, rawInputs) {
        const steps = document.querySelectorAll(".step");
        let currentStep = 0;
        let apiDone = false;
        let apiSuccess = false;

        // BACKGROUND AI FETCH
        fetch('http://127.0.0.1:5000/process_application', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(result => {
            // Save everything to localStorage
            localStorage.setItem('fintwin_data', JSON.stringify({
                ai_result: result,
                user_inputs: rawInputs
            }));
            apiDone = true;
            apiSuccess = true;
        })
        .catch(err => {
            console.error("API Error:", err);
            apiDone = true; 
        });

        // ANIMATION LOOP
        const processInterval = setInterval(() => {
            if (currentStep > 0) {
                steps[currentStep - 1].classList.remove("active");
                steps[currentStep - 1].classList.add("completed");
            }
            if (currentStep < steps.length) {
                steps[currentStep].classList.add("active");
                currentStep++;
            } else {
                if (apiDone) {
                    clearInterval(processInterval);
                    setTimeout(() => {
                        if (apiSuccess) {
                            window.location.href = "dashboard.html";
                        } else {
                            alert("Failed to connect to the Python AI Engine.");
                            window.location.reload();
                        }
                    }, 800);
                }
            }
        }, 1000); 
    }
});