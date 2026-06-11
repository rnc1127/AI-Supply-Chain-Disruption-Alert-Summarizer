// Global State variables
let currentGenId = null;
let currentRating = 0;
let volumeChartInstance = null;
let trendChartInstance = null;
let supplierChartInstance = null;

// DOM Elements
const navButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const themeToggleBtn = document.getElementById('theme-toggle');
const supplierInputs = document.getElementById('supplier_inputs');
const charCurrent = document.getElementById('char-current');
const disruptionForm = document.getElementById('disruption-form');
const presetsContainer = document.getElementById('presets-container');
const submitBtn = document.getElementById('submit-btn');

// Output DOM Elements
const outputPlaceholder = document.getElementById('output-placeholder');
const loadingState = document.getElementById('loading-state');
const outputCard = document.getElementById('output-card');
const outAdminName = document.getElementById('out-admin-name');
const outSupplierName = document.getElementById('out-supplier-name');
const outTimestamp = document.getElementById('out-timestamp');
const outSummary = document.getElementById('out-summary');
const outCustomerImpact = document.getElementById('out-customer-impact');
const outAffectedOrders = document.getElementById('out-affected-orders');
const outRecommendedActions = document.getElementById('out-recommended-actions');
const latencyText = document.getElementById('latency-text');
const regenerateBtn = document.getElementById('regenerate-btn');
const copyBtn = document.getElementById('copy-btn');
const downloadTxtBtn = document.getElementById('download-txt-btn');
const downloadPdfBtn = document.getElementById('download-pdf-btn');
const shareBtn = document.getElementById('share-btn');
const apiStatusText = document.getElementById('api-status-text');
const statusBadge = document.querySelector('.status-badge');

// Feedback Elements
const starRatingContainer = document.getElementById('star-rating-container');
const feedbackStars = document.querySelectorAll('.star');
const saveFeedbackBtn = document.getElementById('save-feedback-btn');
const commentSection = document.getElementById('comment-section');
const feedbackComment = document.getElementById('feedback-comment');

// Toast Notification
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// App Initialization
function initApp() {
    setupTabSwitching();
    setupThemeToggle();
    setupTextareaCounter();
    setupPresets();
    setupFormSubmission();
    setupFeedbackSystem();
    setupOutputActions();
    checkAPIStatus();
    loadHistory();
    
    // Check for query parameters for deep linking
    const urlParams = new URLSearchParams(window.location.search);
    const logId = urlParams.get('id');
    if (logId) {
        viewGenerationDetails(logId);
    }
}

// 1. Tab Switching Logic
function setupTabSwitching() {
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Toggle Nav Active Class
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle Tab Content Visibility
            tabContents.forEach(tab => {
                tab.classList.remove('active');
                if (tab.id === targetTab) {
                    tab.classList.add('active');
                }
            });

            // Update Page Title
            const pageTitle = document.getElementById('page-title');
            if (targetTab === 'dashboard-tab') {
                pageTitle.innerText = 'Supply Chain Disruption Dashboard';
                checkAPIStatus(); // refresh presets & status
            } else if (targetTab === 'history-tab') {
                pageTitle.innerText = 'Disruption Summary History';
                loadHistory();
            } else if (targetTab === 'analytics-tab') {
                pageTitle.innerText = 'Administrative Insights & Analytics';
                loadAnalytics();
            }
        });
    });
}

// 2. Theme Toggle (Dark / Light)
function setupThemeToggle() {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const icon = themeToggleBtn.querySelector('i');
        if (document.body.classList.contains('light-theme')) {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    });
}

// 3. Textarea Characters Counter
function setupTextareaCounter() {
    supplierInputs.addEventListener('input', () => {
        const len = supplierInputs.value.length;
        charCurrent.innerText = len;
        
        // Dynamic Warning Color
        if (len > 850) {
            charCurrent.style.color = 'var(--error)';
        } else if (len > 600) {
            charCurrent.style.color = 'var(--warning)';
        } else {
            charCurrent.style.color = 'var(--text-muted)';
        }
    });
}

// 4. API Status Connection Check
async function checkAPIStatus() {
    try {
        const res = await fetch('/api/templates');
        if (res.ok) {
            // Verify if environment variables have Gemini key
            // We can infer by generating a mock or hitting the generate endpoint,
            // or backend can tell us. For simplicity, we check connection.
            statusBadge.classList.add('connected');
            apiStatusText.innerText = 'System Connected';
        } else {
            throw new Error('API failed');
        }
    } catch (e) {
        statusBadge.classList.remove('connected');
        apiStatusText.innerText = 'Offline Mode';
    }
}

// 5. Presets Loading and Filling
async function setupPresets() {
    try {
        const res = await fetch('/api/templates');
        if (!res.ok) throw new Error('Could not fetch templates');
        
        const templates = await res.json();
        presetsContainer.innerHTML = '';
        
        if (templates.length === 0) {
            presetsContainer.innerHTML = '<div class="preset-chip">No presets available</div>';
            return;
        }

        templates.forEach(t => {
            const btn = document.createElement('button');
            btn.className = 'preset-chip';
            btn.type = 'button';
            btn.title = t.title;
            btn.innerHTML = `<i class="fa-solid fa-file-invoice"></i> ${t.title}`;
            
            btn.addEventListener('click', () => {
                document.getElementById('admin_name').value = t.admin_name;
                document.getElementById('supplier_name').value = t.supplier_name;
                document.getElementById('supplier_inputs').value = t.inputs;
                
                // Trigger counter update manually
                charCurrent.innerText = t.inputs.length;
                showToast(`Loaded Template: ${t.title}`);
            });
            presetsContainer.appendChild(btn);
        });
    } catch (e) {
        console.error("Presets load error:", e);
        presetsContainer.innerHTML = '<div class="preset-chip error">Error loading templates</div>';
    }
}

// 6. Form Submission (Calling AI generation endpoint)
function setupFormSubmission() {
    disruptionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const adminName = document.getElementById('admin_name').value.trim();
        const supplierName = document.getElementById('supplier_name').value.trim();
        const inputs = document.getElementById('supplier_inputs').value.trim();
        
        // Clear previous error messages
        document.getElementById('admin-error').innerText = '';
        document.getElementById('supplier-error').innerText = '';
        document.getElementById('inputs-error').innerText = '';
        
        // Basic Validation
        let hasError = false;
        if (!adminName) {
            document.getElementById('admin-error').innerText = 'Logger name is required';
            hasError = true;
        }
        if (!supplierName) {
            document.getElementById('supplier-error').innerText = 'Supplier name is required';
            hasError = true;
        }
        if (!inputs) {
            document.getElementById('inputs-error').innerText = 'Supplier communication details are required';
            hasError = true;
        }
        if (hasError) return;

        // Toggle Loading State
        outputPlaceholder.classList.add('hidden');
        outputCard.classList.add('hidden');
        loadingState.classList.remove('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        
        try {
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_name: adminName,
                    supplier_name: supplierName,
                    supplier_inputs: inputs
                })
            });
            
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to generate alert analysis');
            }
            
            const data = await res.json();
            renderOutput(data);
            
        } catch (err) {
            console.error(err);
            loadingState.classList.add('hidden');
            outputPlaceholder.classList.remove('hidden');
            showToast(err.message || 'An error occurred during generation', true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-brain"></i> <span>Generate AI Summary</span>';
        }
    });
}

// Render AI Output into DOM
function renderOutput(data) {
    loadingState.classList.add('hidden');
    outputCard.classList.remove('hidden');
    
    currentGenId = data.id;
    outAdminName.innerText = data.admin_name;
    outSupplierName.innerText = data.supplier_name;
    
    // Format timestamp nicely
    const date = new Date();
    outTimestamp.innerText = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    // Latency
    latencyText.innerText = `Response: ${(data.response_time_ms / 1000).toFixed(2)}s`;
    
    // AI Status Indicator
    if (data.using_ai) {
        apiStatusText.innerText = 'AI Active';
        statusBadge.className = 'status-badge connected';
    } else {
        apiStatusText.innerText = 'Local Mock Fallback';
        statusBadge.className = 'status-badge';
    }
    
    const output = data.ai_output;
    outSummary.innerText = output.summary;
    outCustomerImpact.innerText = output.customer_impact;
    
    // Affected Orders (Bullet List)
    outAffectedOrders.innerHTML = '';
    output.affected_orders.forEach(bullet => {
        const li = document.createElement('li');
        li.innerText = bullet;
        outAffectedOrders.appendChild(li);
    });
    
    // Recommended Actions (Bullet List)
    outRecommendedActions.innerHTML = '';
    output.recommended_actions.forEach(bullet => {
        const li = document.createElement('li');
        li.innerText = bullet;
        outRecommendedActions.appendChild(li);
    });

    // Reset Rating Widget
    resetRating();
    showToast('AI analysis generated successfully!');
}

// 7. Star Rating and Feedback Comments Logic
function setupFeedbackSystem() {
    // Star hover and click events
    feedbackStars.forEach(star => {
        star.addEventListener('mouseover', () => {
            const rating = parseInt(star.getAttribute('data-rating'));
            highlightStars(rating, true);
        });
        
        star.addEventListener('mouseout', () => {
            highlightStars(currentRating, false);
        });
        
        star.addEventListener('click', () => {
            currentRating = parseInt(star.getAttribute('data-rating'));
            highlightStars(currentRating, false);
            
            // Show comments box and Save button
            commentSection.classList.remove('hidden');
            saveFeedbackBtn.classList.remove('hidden');
        });
    });

    // Save Feedback Button Click
    saveFeedbackBtn.addEventListener('click', async () => {
        if (!currentGenId || currentRating === 0) return;
        
        const comment = feedbackComment.value.trim();
        saveFeedbackBtn.disabled = true;
        saveFeedbackBtn.innerText = 'Saving...';
        
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    generation_id: currentGenId,
                    rating: currentRating,
                    comment: comment
                })
            });
            
            if (!res.ok) throw new Error('Failed to save feedback');
            
            showToast('Feedback submitted! Thank you.');
            
            // Hide save button
            saveFeedbackBtn.classList.add('hidden');
        } catch (e) {
            console.error(e);
            showToast('Failed to submit feedback', true);
        } finally {
            saveFeedbackBtn.disabled = false;
            saveFeedbackBtn.innerText = 'Save';
        }
    });
}

function highlightStars(rating, isHover) {
    feedbackStars.forEach(star => {
        const val = parseInt(star.getAttribute('data-rating'));
        if (val <= rating) {
            star.className = isHover ? 'fa-solid fa-star star hovered' : 'fa-solid fa-star star selected';
        } else {
            star.className = 'fa-regular fa-star star';
        }
    });
}

function resetRating() {
    currentRating = 0;
    feedbackStars.forEach(star => {
        star.className = 'fa-regular fa-star star';
    });
    commentSection.classList.add('hidden');
    saveFeedbackBtn.classList.add('hidden');
    feedbackComment.value = '';
}

// 8. Output Actions: Copy, Download TXT, PDF, Share, Regenerate
function setupOutputActions() {
    // Regenerate
    regenerateBtn.addEventListener('click', () => {
        disruptionForm.dispatchEvent(new Event('submit'));
    });
    
    // Format text representation for Copy/Download
    function getFormattedText() {
        const supplier = outSupplierName.innerText;
        const logger = outAdminName.innerText;
        const date = outTimestamp.innerText;
        const summary = outSummary.innerText;
        const impact = outCustomerImpact.innerText;
        
        let orders = '';
        outAffectedOrders.querySelectorAll('li').forEach(li => {
            orders += `- ${li.innerText}\n`;
        });
        
        let actions = '';
        outRecommendedActions.querySelectorAll('li').forEach(li => {
            actions += `- ${li.innerText}\n`;
        });
        
        return `MANIKANTA ENTERPRISES
SUPPLY CHAIN DISRUPTION ASSESSMENT
-----------------------------------------
Supplier: ${supplier}
Logger Name: ${logger}
Date/Time: ${date}

[DISRUPTION SUMMARY]
${summary}

[CUSTOMER IMPACT ANALYSIS]
${impact}

[AFFECTED ORDERS]
${orders}
[RECOMMENDED RESPONSE ACTIONS]
${actions}
-----------------------------------------
Generated by AI Supply Chain Disruption Alert Summarizer.
`;
    }

    // Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        const text = getFormattedText();
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied analysis to clipboard!');
        }).catch(err => {
            showToast('Failed to copy text', true);
        });
    });

    // Download TXT
    downloadTxtBtn.addEventListener('click', () => {
        const text = getFormattedText();
        const filename = `Disruption_Alert_${outSupplierName.innerText.replace(/\s+/g, '_')}.txt`;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Downloaded text report!');
    });

    // Download PDF
    downloadPdfBtn.addEventListener('click', () => {
        const element = document.getElementById('pdf-export-content');
        const supplierName = outSupplierName.innerText.replace(/\s+/g, '_');
        const opt = {
            margin:       15,
            filename:     `Disruption_Alert_${supplierName}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        showToast('Generating PDF download...');
        html2pdf().from(element).set(opt).save().then(() => {
            showToast('PDF downloaded successfully!');
        });
    });

    // Share link
    shareBtn.addEventListener('click', () => {
        if (!currentGenId) return;
        const shareUrl = `${window.location.origin}?id=${currentGenId}`;
        
        // Try native share if available
        if (navigator.share) {
            navigator.share({
                title: 'Supply Chain Disruption Alert Summarizer',
                text: `Supplier Disruption Alert: ${outSupplierName.innerText}`,
                url: shareUrl
            }).then(() => {
                showToast('Shared successfully!');
            }).catch(e => {
                // fall back to clipboard
                copyShareLink(shareUrl);
            });
        } else {
            copyShareLink(shareUrl);
        }
    });

    function copyShareLink(url) {
        navigator.clipboard.writeText(url).then(() => {
            showToast('Shareable link copied to clipboard!');
        }).catch(() => {
            showToast('Failed to copy link', true);
        });
    }
}

// 9. Load History Tab Table
async function loadHistory() {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading history log...</td></tr>';
    
    try {
        const res = await fetch('/api/history');
        if (!res.ok) throw new Error('Failed to retrieve history');
        
        const history = await res.json();
        tableBody.innerHTML = '';
        
        if (history.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No disruptions logged yet. Log your first alert on the dashboard.</td></tr>';
            return;
        }

        history.forEach(log => {
            const row = document.createElement('tr');
            
            // Format date
            const dateStr = new Date(log.timestamp).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            
            // Rating rendering
            let starsHtml = '';
            if (log.rating) {
                for (let i = 1; i <= 5; i++) {
                    if (i <= log.rating) {
                        starsHtml += '<i class="fa-solid fa-star" style="color: var(--warning); margin-right: 2px;"></i>';
                    } else {
                        starsHtml += '<i class="fa-regular fa-star" style="color: var(--text-muted); margin-right: 2px;"></i>';
                    }
                }
            } else {
                starsHtml = '<span style="color: var(--text-muted); font-size: 0.8rem;">Unrated</span>';
            }

            row.innerHTML = `
                <td><strong>${dateStr}</strong></td>
                <td>${log.supplier_name}</td>
                <td>${log.admin_name}</td>
                <td><div class="history-preview">${log.ai_output.summary}</div></td>
                <td><div class="history-rating">${starsHtml}</div></td>
                <td>
                    <div class="history-actions">
                        <button class="btn btn-secondary btn-xs view-log-btn" data-id="${log.id}">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                        <button class="btn btn-secondary btn-xs download-pdf-log-btn" data-id="${log.id}">
                            <i class="fa-solid fa-file-pdf"></i> PDF
                        </button>
                    </div>
                </td>
            `;
            
            // Click to view detail
            row.querySelector('.view-log-btn').addEventListener('click', () => {
                viewGenerationDetails(log.id);
            });

            // Click to download PDF directly
            row.querySelector('.download-pdf-log-btn').addEventListener('click', () => {
                downloadPDFFromLog(log);
            });

            tableBody.appendChild(row);
        });
    } catch (e) {
        console.error(e);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--error);">Error retrieving history logs</td></tr>';
    }
}

// Retrieve dynamic generation details and render on Dashboard
async function viewGenerationDetails(id) {
    try {
        const res = await fetch(`/api/history/${id}`);
        if (!res.ok) throw new Error('Could not retrieve details');
        
        const data = await res.json();
        
        // Render
        renderOutput(data);
        
        // Fill form fields with inputs
        document.getElementById('admin_name').value = data.admin_name;
        document.getElementById('supplier_name').value = data.supplier_name;
        document.getElementById('supplier_inputs').value = data.supplier_inputs;
        charCurrent.innerText = data.supplier_inputs.length;
        
        // Switch to Dashboard Tab
        const dashBtn = document.querySelector('.nav-btn[data-tab="dashboard-tab"]');
        dashBtn.click();
        
        // Apply existing rating values if present
        if (data.rating) {
            currentRating = data.rating;
            highlightStars(data.rating, false);
            commentSection.classList.remove('hidden');
            feedbackComment.value = data.comment || '';
        }
        
    } catch (e) {
        console.error(e);
        showToast('Error loading details', true);
    }
}

// Direct PDF creation helper from history list
function downloadPDFFromLog(log) {
    // Create temporary offscreen element for HTML rendering
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '20px';
    tempDiv.style.color = '#000';
    tempDiv.style.background = '#fff';
    tempDiv.style.fontFamily = 'Inter, sans-serif';
    
    let ordersList = '';
    log.ai_output.affected_orders.forEach(b => {
        ordersList += `<li style="margin-bottom: 8px;">${b}</li>`;
    });
    
    let actionsList = '';
    log.ai_output.recommended_actions.forEach(b => {
        actionsList += `<li style="margin-bottom: 8px;">${b}</li>`;
    });

    tempDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="font-family: Outfit, sans-serif; margin: 0; font-size: 1.6rem; letter-spacing: 0.5px;">MANIKANTA ENTERPRISES</h2>
            <h3 style="font-family: Outfit, sans-serif; margin: 5px 0 0 0; font-size: 1.1rem; color: #475569; font-weight: 500;">Supply Chain Disruption & Impact Assessment Report</h3>
            <hr style="margin-top: 15px; border: 0; border-top: 2px solid #000;">
        </div>
        
        <table style="width: 100%; margin-bottom: 25px; border-collapse: collapse; font-size: 0.9rem;">
            <tr>
                <td style="padding: 6px 0; color: #64748b; width: 120px;">Supplier Company:</td>
                <td style="padding: 6px 0; font-weight: bold;">${log.supplier_name}</td>
                <td style="padding: 6px 0; color: #64748b; width: 100px;">Logged By:</td>
                <td style="padding: 6px 0; font-weight: bold;">${log.admin_name}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #64748b;">Report Date:</td>
                <td style="padding: 6px 0; font-weight: bold;" colspan="3">${new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
            </tr>
        </table>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-family: Outfit, sans-serif; font-size: 1rem; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 0 0 10px 0;">1. Disruption Summary</h4>
            <p style="font-size: 0.95rem; color: #334155; line-height: 1.6; margin: 0;">${log.ai_output.summary}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-family: Outfit, sans-serif; font-size: 1rem; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 0 0 10px 0;">2. Customer Impact Analysis</h4>
            <p style="font-size: 0.95rem; color: #334155; line-height: 1.6; margin: 0;">${log.ai_output.customer_impact}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-family: Outfit, sans-serif; font-size: 1rem; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 0 0 10px 0;">3. Affected Orders & Line Items</h4>
            <ul style="font-size: 0.95rem; color: #334155; line-height: 1.6; padding-left: 20px; margin: 0;">${ordersList}</ul>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-family: Outfit, sans-serif; font-size: 1rem; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 0 0 10px 0;">4. Recommended Response Actions</h4>
            <ul style="font-size: 0.95rem; color: #334155; line-height: 1.6; padding-left: 20px; margin: 0;">${actionsList}</ul>
        </div>
    `;

    const opt = {
        margin:       15,
        filename:     `Disruption_Alert_${log.supplier_name.replace(/\s+/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    showToast('Generating PDF...');
    html2pdf().from(tempDiv).set(opt).save().then(() => {
        showToast('PDF downloaded successfully!');
    });
}

// 10. Load Admin Analytics Tab
async function loadAnalytics() {
    try {
        const res = await fetch('/api/admin/analytics');
        if (!res.ok) throw new Error('Could not retrieve analytics');
        
        const data = await res.json();
        
        // Update KPI Counters in DOM
        document.getElementById('stat-total-summaries').innerText = data.total_generations;
        document.getElementById('stat-avg-rating').innerText = data.average_rating.toFixed(1);
        document.getElementById('stat-avg-latency').innerText = data.average_response_time_ms.toLocaleString();
        document.getElementById('stat-active-suppliers').innerText = data.unique_suppliers;
        
        // Render Charts
        renderVolumeChart(data.daily_volume);
        renderQualityTrendsChart(data.quality_trends);
        renderSupplierChart(data.top_suppliers);
        
    } catch (e) {
        console.error(e);
        showToast('Error loading analytics', true);
    }
}

// Chart 1: Daily Disruption Frequency Bar Chart
function renderVolumeChart(dailyData) {
    const ctx = document.getElementById('disruptionVolumeChart').getContext('2d');
    
    if (volumeChartInstance) {
        volumeChartInstance.destroy();
    }
    
    // Sort & structure dates
    const labels = dailyData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    });
    const counts = dailyData.map(d => d.count);
    
    // Theme sensitive grid color
    const gridColor = document.body.classList.contains('light-theme') ? '#cbd5e1' : 'rgba(255, 255, 255, 0.05)';
    const textColor = document.body.classList.contains('light-theme') ? '#475569' : '#94a3b8';

    volumeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                label: 'Disruption Log Entries',
                data: counts.length ? counts : [0],
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: '#6366f1',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, stepSize: 1 },
                    beginAtZero: true
                }
            }
        }
    });
}

// Chart 2: Quality Rating Trend Line Chart
function renderQualityTrendsChart(trendData) {
    const ctx = document.getElementById('qualityTrendsChart').getContext('2d');
    
    if (trendChartInstance) {
        trendChartInstance.destroy();
    }
    
    const labels = trendData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    });
    const ratings = trendData.map(d => d.avg_rating);
    
    const gridColor = document.body.classList.contains('light-theme') ? '#cbd5e1' : 'rgba(255, 255, 255, 0.05)';
    const textColor = document.body.classList.contains('light-theme') ? '#475569' : '#94a3b8';

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                label: 'Average Score',
                data: ratings.length ? ratings : [0.0],
                fill: true,
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderColor: '#8b5cf6',
                borderWidth: 2,
                tension: 0.3,
                pointBackgroundColor: '#8b5cf6',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor },
                    min: 1.0,
                    max: 5.0
                }
            }
        }
    });
}

// Chart 3: Top Disrupted Suppliers Doughnut Chart
function renderSupplierChart(supplierData) {
    const ctx = document.getElementById('supplierDisruptionChart').getContext('2d');
    
    if (supplierChartInstance) {
        supplierChartInstance.destroy();
    }
    
    const labels = supplierData.map(s => s.supplier);
    const counts = supplierData.map(s => s.count);
    
    const textColor = document.body.classList.contains('light-theme') ? '#475569' : '#94a3b8';

    supplierChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.length ? labels : ['None'],
            datasets: [{
                data: counts.length ? counts : [1],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.7)',  // indigo
                    'rgba(139, 92, 246, 0.7)', // violet
                    'rgba(14, 165, 233, 0.7)',  // sky
                    'rgba(16, 185, 129, 0.7)',  // emerald
                    'rgba(245, 158, 11, 0.7)'   // amber
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textColor }
                }
            }
        }
    });
}

// Refresh History Event Link
document.getElementById('refresh-history-btn').addEventListener('click', () => {
    loadHistory();
    showToast('History refreshed!');
});

// Toast notification helper
function showToast(message, isError = false) {
    toastMessage.innerText = message;
    
    if (isError) {
        toast.className = 'toast error';
        toast.querySelector('.toast-icon').className = 'fa-solid fa-circle-exclamation toast-icon';
    } else {
        toast.className = 'toast';
        toast.querySelector('.toast-icon').className = 'fa-solid fa-circle-check toast-icon';
    }
    
    toast.classList.remove('hidden');
    
    // Auto hide after 4 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}
