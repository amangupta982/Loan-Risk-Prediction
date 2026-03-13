document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // A. FETCH REAL DATA FROM PYTHON
    // ==========================================
    const storedData = localStorage.getItem('fintwin_data');
    
    // Fallback data
    let aiData = { status: "approved", odds: 87, main_issue: "None", coach_advice: "Borrower demonstrates strong financial stability with manageable debt obligations. Recommended for approval." };
    let userData = { income: 850000, loan: 2500000, cibil: 750, assets: 7000000 };

    if (storedData) {
        const parsed = JSON.parse(storedData);
        aiData = parsed.ai_result;
        userData = parsed.user_inputs;
    }

    const odds = Math.round(aiData.odds);
    const riskScore = 100 - odds;
    const isApproved = aiData.status === "approved";
    const mainColor = isApproved ? '#10B981' : '#EF4444'; 

    // ==========================================
    // B. UPDATE TEXT UI ELEMENTS DYNAMICALLY
    // ==========================================
    try {
        const decisionBadge = document.getElementById('decisionBadge');
        if (decisionBadge) {
            decisionBadge.innerText = aiData.status.toUpperCase();
            decisionBadge.style.color = mainColor;
            decisionBadge.style.backgroundColor = isApproved ? '#d1fae5' : '#fee2e2';
        }

        const riskScoreValue = document.getElementById('riskScoreValue');
        if (riskScoreValue) riskScoreValue.innerHTML = `${riskScore}<span style="font-size: 14px; color: #64748b;">/100</span>`;
        
        const aiConfidenceValue = document.getElementById('aiConfidenceValue');
        if (aiConfidenceValue) aiConfidenceValue.innerText = `${odds}%`;

        // Update the central text in the gauge chart
        const gaugeValueText = document.getElementById('gaugeValueText');
        if (gaugeValueText) gaugeValueText.innerText = `${odds}%`;

        // Format numbers with commas (Indian formatting)
        const formatMoney = (num) => '₹' + num.toLocaleString('en-IN');

        const displayIncome = document.getElementById('displayIncome');
        if (displayIncome) displayIncome.innerText = formatMoney(userData.income);

        const displayLoan = document.getElementById('displayLoan');
        if (displayLoan) displayLoan.innerText = formatMoney(userData.loan);
        
        // Fix for CIBIL and Assets
        const displayCredit = document.getElementById('displayCredit');
        if (displayCredit) displayCredit.innerText = userData.cibil;

        const displayAssets = document.getElementById('displayAssets');
        if (displayAssets) displayAssets.innerText = formatMoney(userData.assets || 7000000);

        // Est. Monthly Payment calculation (Mock 10% interest over 3 years)
        const estPaymentValue = document.getElementById('estPaymentValue');
        if (estPaymentValue) {
            const monthlyPay = Math.round((userData.loan * 1.10) / 36);
            estPaymentValue.innerText = formatMoney(monthlyPay);
        }

        // Insights Panel & Gemini Coach
        const insightsPanel = document.getElementById('aiInsightsPanel');
        if (insightsPanel) {
            if (!isApproved) {
                insightsPanel.innerHTML = `
                    <p style="color: #EF4444; font-weight: bold; margin-bottom: 10px;">⚠️ Primary Issue: ${aiData.main_issue}</p>
                    <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
                        <h4 style="margin:0 0 5px 0; color: #334155;">🤖 Gemini AI Coach</h4>
                        <p style="margin:0; font-size: 0.9em; line-height: 1.5;">${aiData.coach_advice}</p>
                    </div>
                `;
                
                // Play audio automatically on rejection
                setTimeout(() => {
                    const utterance = new SpeechSynthesisUtterance(aiData.coach_advice);
                    window.speechSynthesis.speak(utterance);
                }, 800);

            } else {
                insightsPanel.innerHTML = `
                    <p style="color: #10B981; font-weight: bold;">✅ AI Overall Assessment</p>
                    <p style="margin-top: 5px; font-size: 0.9em;">${aiData.coach_advice}</p>
                `;
            }
        }
    } catch (e) { console.log("Some HTML IDs missing, skipping text updates."); }

    // ==========================================
    // C. VOICE INTERACTION (MICROPHONE)
    // ==========================================
    const micBtn = document.getElementById('micBtn');
    const userTranscript = document.getElementById('userTranscript');

    if (micBtn) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            
            recognition.onstart = function() {
                micBtn.innerHTML = '<i class="fa-solid fa-ear-listen"></i> Listening...';
                micBtn.style.background = "#EF4444"; 
            };

            recognition.onspeechend = function() {
                recognition.stop();
                micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Ask AI Coach';
                micBtn.style.background = "#3b82f6"; 
            };

            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                userTranscript.innerText = `You: "${transcript}"`;
                
                setTimeout(() => {
                    const reply = new SpeechSynthesisUtterance("I understand your concern. My best advice is to lower your debt-to-income ratio over the next 3 months, then apply again.");
                    window.speechSynthesis.speak(reply);
                }, 1000);
            };

            micBtn.addEventListener('click', () => { recognition.start(); });
        } else {
            micBtn.style.display = 'none'; 
        }
    }

    // ==========================================
    // D. ORIGINAL FRONTEND ANIMATIONS
    // ==========================================
    const animatedElements = document.querySelectorAll('.animate-in');
    animatedElements.forEach((el, index) => { el.style.animationDelay = `${index * 0.1}s`; });

    const progressBars = document.querySelectorAll('.progress-fill');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bar = entry.target;
                const targetWidth = bar.getAttribute('data-width');
                setTimeout(() => { bar.style.width = targetWidth; }, 300);
                observer.unobserve(bar);
            }
        });
    }, { threshold: 0.5 });
    progressBars.forEach(bar => observer.observe(bar));

    // ==========================================
    // E. CHARTS (UPDATED WITH REAL AI DATA)
    // ==========================================
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748b';
    Chart.defaults.scale.grid.color = '#f1f5f9';
    
    // 1. Gauge Chart
    const ctxProb = document.getElementById('probabilityChart').getContext('2d');
    new Chart(ctxProb, {
        type: 'doughnut',
        data: {
            labels: ['Probability', 'Remaining'],
            datasets: [{
                data: [odds, 100 - odds],
                backgroundColor: [mainColor, '#f1f5f9'], 
                borderWidth: 0, borderRadius: [20, 0],
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '85%', circumference: 270, rotation: 225,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }, animation: { animateScale: true, animateRotate: true }
        }
    });

    // 2. Trend Line Chart
    const ctxTrend = document.getElementById('trendChart').getContext('2d');
    const gradient = ctxTrend.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

    new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Risk Score',
                data: [15, 22, 23, 18, 12, 6, 5, 8, 18, 22, 28, riskScore],
                borderColor: '#10B981', backgroundColor: gradient, borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } } },
            scales: { y: { min: 0, max: 100, ticks: { stepSize: 25 }, border: { dash: [4, 4], display: false } }, x: { grid: { display: false }, border: { display: false } } }
        }
    });

    // 3. Asset Doughnut
    const ctxAsset = document.getElementById('assetChart').getContext('2d');
    new Chart(ctxAsset, {
        type: 'doughnut',
        data: {
            labels: ['Residential', 'Commercial', 'Luxury', 'Bank'],
            datasets: [{ data: [45, 20, 10, 25], backgroundColor: ['#10B981', '#3b82f6', '#f59e0b', '#8b5cf6'], borderWidth: 2, borderColor: '#ffffff', hoverOffset: 4 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20, boxWidth: 8 } } } }
    });

    // 4. Bar Chart
    const ctxMetrics = document.getElementById('metricsChart').getContext('2d');
    new Chart(ctxMetrics, {
        type: 'bar',
        data: {
            labels: ['LTI Ratio', 'Asset Coverage', 'Credit Score', 'Risk Score'],
            datasets: [{ label: 'Score / Value', data: [60, 72, 85, riskScore], backgroundColor: '#34d399', borderRadius: 4, barThickness: 32 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 100, ticks: { stepSize: 25 }, border: { dash: [4, 4], display: false } }, x: { grid: { display: false }, border: { display: false } } }
        }
    });
});