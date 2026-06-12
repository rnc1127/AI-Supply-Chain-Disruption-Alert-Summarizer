import { BrowserStorageManager } from './storage_manager.js';

// Global State variables
let currentGenId = null;
let currentRating = 0;
let volumeChartInstance = null;
let trendChartInstance = null;
let supplierChartInstance = null;
let mergedHistoryList = [];

// Local Default Presets Fallback
const DEFAULT_PRESETS = [
    {
        title: "Steel Sheet Delay from Hyderabad",
        admin_name: "Kalyan Kumar",
        supplier_name: "Deccan Steel Ltd",
        inputs: "Due to sudden electrical failure at our Hyderabad smelting furnace, the shipment of 10 tons of mild steel sheets scheduled for June 12th will be delayed by 5 days. We expect repairs to be complete by June 14th."
    },
    {
        title: "Cement Packaging Material Shortage",
        admin_name: "Ramesh Naidu",
        supplier_name: "UltraPack Industries",
        inputs: "We are facing a temporary shortage of waterproof synthetic paper for the high-durability cement bags. The 50,000 bags ordered on June 8th will be delayed. Standard paper bags are available immediately if you wish to substitute."
    },
    {
        title: "Logistics Strike in Andhra Border",
        admin_name: "Sneha Reddy",
        supplier_name: "VRL Logistics",
        inputs: "A regional transport union strike on the NH44 border checkpost is delaying all interstate freight. Our trucks carrying plumbing fixtures and hardware parts from Nagpur are currently halted at the border. Expected resolution is 48-72 hours."
    },
    {
        title: "Copper Cable Shortage",
        admin_name: "Kalyan Kumar",
        supplier_name: "Finolex Wire Distributors",
        inputs: "Due to global copper copper rod supply chain bottlenecks, we are out of stock of 2.5sq mm multi-strand copper cables. Restocking is expected on June 22nd. Orders will be processed in queue order upon arrival."
    }
];

// IndexedDB configuration for unlimited local storage
const DB_NAME = 'AlertSummarizerDB';
const STORE_NAME = 'HistoryStore';
const DB_VERSION = 1;

// Instantiate the browser storage strategy manager
const storageManager = new BrowserStorageManager(DB_NAME);

// Quota UI updater function
async function updateStorageQuotaUI() {
    try {
        const quota = await storageManager.getQuotaDetails();
        console.info(`[StorageManager] Quota details: Usage: ${quota.usageMB} MB / Total: ${quota.totalQuotaGB} GB (${quota.percentUsed}% used). Persistent: ${await storageManager.isPersisted()}`);
        
        const statusTextEl = document.getElementById('storage-status-text');
        const progressFillEl = document.getElementById('storage-progress-fill');
        
        if (statusTextEl) {
            if (quota.supported) {
                const isPersisted = await storageManager.isPersisted();
                const persistenceLabel = isPersisted ? "Persistent" : "Best-effort";
                statusTextEl.innerHTML = `<i class="fa-solid fa-hard-drive"></i> Local Storage: ${quota.usageMB} MB / ${quota.totalQuotaGB} GB (${quota.percentUsed}% used) <span class="badge-outline">${persistenceLabel}</span>`;
            } else {
                statusTextEl.innerHTML = `<i class="fa-solid fa-hard-drive"></i> Local Storage: Running (best-effort/fallback)`;
            }
        }
        
        if (progressFillEl && quota.supported) {
            progressFillEl.style.width = `${Math.min(100, Math.max(0.5, quota.percentUsed))}%`;
        }
    } catch (e) {
        console.error("[StorageManager] Error updating storage quota UI:", e);
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'uid' });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function getLocalHistory() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        console.error("IndexedDB error:", e);
        return [];
    }
}

async function saveLocalHistoryItem(item) {
    try {
        const db = await openDB();
        const success = await storageManager.safeWrite(db, STORE_NAME, item, (err) => {
            showToast('Warning: Local storage full. Please free up some disk space!', true);
        });
        if (success) {
            await updateStorageQuotaUI();
        }
        return success;
    } catch (e) {
        console.error("IndexedDB error saving item:", e);
        return false;
    }
}

async function saveLocalHistoryList(list) {
    try {
        const db = await openDB();
        const success = await new Promise((resolve) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            let quotaExceeded = false;
            
            transaction.onerror = (event) => {
                event.preventDefault();
                const error = transaction.error || event.target.error;
                if (error && (error.name === 'QuotaExceededError' || error.code === DOMException.QUOTA_EXCEEDED_ERR)) {
                    quotaExceeded = true;
                    console.error("[StorageManager] QuotaExceededError during transaction write.");
                    showToast('Warning: Local storage full. Please free up some disk space!', true);
                } else {
                    console.error("IndexedDB transaction error saving list:", error);
                }
                resolve(false);
            };
            
            transaction.oncomplete = () => {
                resolve(!quotaExceeded);
            };
            
            store.clear();
            list.forEach(item => {
                if (item.uid) {
                    try {
                        const req = store.put(item);
                        req.onerror = (e) => {
                            const error = e.target.error;
                            if (error && (error.name === 'QuotaExceededError' || error.code === DOMException.QUOTA_EXCEEDED_ERR)) {
                                quotaExceeded = true;
                                console.error("[StorageManager] QuotaExceededError on store.put during list save.");
                                showToast('Warning: Local storage full. Please free up some disk space!', true);
                            }
                        };
                    } catch (err) {
                        console.error("Error putting item in store:", err);
                    }
                }
            });
        });
        if (success) {
            await updateStorageQuotaUI();
        }
        return success;
    } catch (e) {
        console.error("IndexedDB error saving list:", e);
        return false;
    }
}

// Legacy LocalStorage migration to IndexedDB
async function migrateLocalStorageToIndexedDB() {
    try {
        const legacyData = localStorage.getItem('summarizer_history');
        if (legacyData) {
            const list = JSON.parse(legacyData);
            if (Array.isArray(list) && list.length > 0) {
                console.log(`Migrating ${list.length} items from localStorage to IndexedDB...`);
                list.forEach((item, idx) => {
                    if (!item.uid) {
                        const sig = item.admin_name && item.supplier_name && item.supplier_inputs
                            ? `${item.admin_name.trim()}|${item.supplier_name.trim()}|${item.supplier_inputs.trim()}`
                            : `item_${Date.now()}_${idx}`;
                        item.uid = btoa(unescape(encodeURIComponent(sig)));
                    }
                });
                await saveLocalHistoryList(list);
                console.log("Migration completed successfully!");
            }
            localStorage.removeItem('summarizer_history');
        }
    } catch (e) {
        console.error("Migration from localStorage failed:", e);
    }
}

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
async function initApp() {
    await migrateLocalStorageToIndexedDB();
    
    // Storage manager initialization
    try {
        await storageManager.requestPersistence();
        await updateStorageQuotaUI();
    } catch (err) {
        console.error("Failed to initialize storage manager:", err);
    }

    setupTabSwitching();
    setupThemeToggle();
    setupTextareaCounter();
    setupPresets();
    setupFormSubmission();
    setupFeedbackSystem();
    setupOutputActions();
    checkAPIStatus();
    await loadHistory();
    
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
    let templates = [];
    try {
        const res = await fetch('/api/templates');
        if (res.ok) {
            templates = await res.json();
        }
    } catch (e) {
        console.warn("Could not fetch templates from server. Using local defaults:", e);
    }
    
    if (!templates || templates.length === 0) {
        templates = DEFAULT_PRESETS;
    }
    
    const container = document.getElementById('presets-container');
    if (!container) return;
    container.innerHTML = '';
    
    templates.forEach(t => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'preset-chip';
        chip.innerHTML = `<i class="fa-regular fa-file-lines" style="margin-right: 6px;"></i> ${t.title}`;
        
        chip.addEventListener('click', () => {
            document.getElementById('admin_name').value = t.admin_name;
            document.getElementById('supplier_name').value = t.supplier_name;
            document.getElementById('supplier_inputs').value = t.inputs;
            
            // Trigger counter update manually
            charCurrent.innerText = t.inputs.length;
            showToast(`Loaded Template: ${t.title}`);
        });
        
        container.appendChild(chip);
    });
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
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        
        // Hide placeholder and output, show simple loading spinner
        if (outputPlaceholder) outputPlaceholder.classList.add('hidden');
        if (loadingState) loadingState.classList.remove('hidden');
        if (outputCard) outputCard.classList.add('hidden');
        
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
            
            const apiData = await res.json();
            
            // Immediately save to local storage history
            const newItem = {
                id: apiData.id,
                admin_name: apiData.admin_name,
                supplier_name: apiData.supplier_name,
                supplier_inputs: apiData.supplier_inputs,
                ai_output: apiData.ai_output,
                response_time_ms: apiData.response_time_ms,
                timestamp: new Date().toISOString(),
                rating: 0,
                comment: ''
            };
            
            // Generate unique UI uid
            newItem.uid = 'log_' + Math.random().toString(36).substr(2, 9) + '_' + (newItem.id || Date.now());
            await saveLocalHistoryItem(newItem);
            
            // Switch right pane view to output card
            if (loadingState) loadingState.classList.add('hidden');
            if (outputCard) outputCard.classList.remove('hidden');
            
            renderOutput(newItem);
            
        } catch (err) {
            console.error(err);
            showToast(err.message || 'An error occurred during generation', true);
            if (loadingState) loadingState.classList.add('hidden');
            if (outputPlaceholder) outputPlaceholder.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-brain"></i> <span>Generate AI Summary</span>';
        }
    });
}

// Render AI Output into DOM
function renderOutput(data) {
    if (loadingState) loadingState.classList.add('hidden');
    outputCard.classList.remove('hidden');
    
    currentGenId = data.id;
    outAdminName.innerText = data.admin_name;
    outSupplierName.innerText = data.supplier_name;
    
    // Format timestamp nicely
    const timestampVal = data.timestamp || new Date().toISOString();
    const date = new Date(timestampVal);
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
    outSummary.innerText = output ? (output.summary || '') : '';
    outCustomerImpact.innerText = output ? (output.customer_impact || '') : '';
    
    // Affected Orders (Bullet List)
    outAffectedOrders.innerHTML = '';
    if (output && output.affected_orders) {
        output.affected_orders.forEach(bullet => {
            const li = document.createElement('li');
            li.innerText = bullet;
            outAffectedOrders.appendChild(li);
        });
    }
    
    // Recommended Actions (Bullet List)
    outRecommendedActions.innerHTML = '';
    if (output && output.recommended_actions) {
        output.recommended_actions.forEach(bullet => {
            const li = document.createElement('li');
            li.innerText = bullet;
            outRecommendedActions.appendChild(li);
        });
    }

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
        if (currentRating === 0) return;
        
        const comment = feedbackComment.value.trim();
        saveFeedbackBtn.disabled = true;
        saveFeedbackBtn.innerText = 'Saving...';
        
        // 1. Save locally in IndexedDB first
        const adminName = document.getElementById('admin_name').value.trim();
        const supplierName = document.getElementById('supplier_name').value.trim();
        const inputs = document.getElementById('supplier_inputs').value.trim();
        
        let localHistory = await getLocalHistory();
        
        let localItemUpdated = false;
        localHistory.forEach(item => {
            if (item.admin_name === adminName && 
                item.supplier_name === supplierName && 
                item.supplier_inputs === inputs) {
                item.rating = currentRating;
                item.comment = comment;
                localItemUpdated = true;
            }
        });
        
        if (localItemUpdated) {
            await saveLocalHistoryList(localHistory);
        }
        
        // 2. Try to submit to backend if currentGenId is set
        let backendSuccess = false;
        if (currentGenId) {
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
                if (res.ok) {
                    backendSuccess = true;
                }
            } catch (e) {
                console.error("Backend feedback submit failed:", e);
            }
        }
        
        if (backendSuccess) {
            showToast('Feedback submitted! Thank you.');
        } else {
            showToast('Feedback saved locally!');
        }
        
        // Hide save button and comment section
        saveFeedbackBtn.classList.add('hidden');
        commentSection.classList.add('hidden');
        saveFeedbackBtn.disabled = false;
        saveFeedbackBtn.innerText = 'Save';
        
        // Refresh history to reflect rating changes
        loadHistory();
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

// // 9. Load History Tab Table
async function loadHistory() {
    const tableBody = document.getElementById('history-table-body');
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Loading history log...</td></tr>';
    
    let serverHistory = [];
    try {
        const res = await fetch('/api/history');
        if (res.ok) {
            serverHistory = await res.json();
        }
    } catch (e) {
        console.error("Failed to fetch history from server:", e);
    }
    
    // Load local history
    let localHistory = await getLocalHistory();
    
    // Merge server and local history
    const mergedMap = new Map();
    
    // 1. Add all local history items first
    localHistory.forEach(item => {
        if (!item.admin_name || !item.supplier_name || !item.supplier_inputs) return;
        const sig = `${item.admin_name.trim()}|${item.supplier_name.trim()}|${item.supplier_inputs.trim()}`;
        mergedMap.set(sig, item);
    });
    
    // 2. Merge with server history items
    serverHistory.forEach(item => {
        if (!item.admin_name || !item.supplier_name || !item.supplier_inputs) return;
        const sig = `${item.admin_name.trim()}|${item.supplier_name.trim()}|${item.supplier_inputs.trim()}`;
        if (mergedMap.has(sig)) {
            const localItem = mergedMap.get(sig);
            // Merge fields
            mergedMap.set(sig, {
                ...localItem,
                ...item, // server fields override local fields
                id: item.id || localItem.id,
                // keep rating & comment if local has it but server doesn't, or vice-versa
                rating: item.rating || localItem.rating || 0,
                comment: item.comment || localItem.comment || '',
                timestamp: item.timestamp || localItem.timestamp
            });
        } else {
            mergedMap.set(sig, item);
        }
    });
    
    // Convert map back to list
    mergedHistoryList = Array.from(mergedMap.values());
    
    // Ensure all items have a unique UI uid and valid timestamp
    mergedHistoryList.forEach((item, index) => {
        if (!item.uid) {
            item.uid = 'log_' + Math.random().toString(36).substr(2, 9) + '_' + (item.id || index);
        }
        if (!item.timestamp) {
            item.timestamp = new Date().toISOString();
        }
    });
    
    // Sort by timestamp descending
    mergedHistoryList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Update local storage to keep it synchronized
    await saveLocalHistoryList(mergedHistoryList);
    
    // Now render the table
    tableBody.innerHTML = '';
    
    if (mergedHistoryList.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No disruptions logged yet. Log your first alert on the dashboard.</td></tr>';
        return;
    }
    
    mergedHistoryList.forEach(log => {
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
        
        const summaryPreview = log.ai_output && log.ai_output.summary ? log.ai_output.summary : '';
        
        row.innerHTML = `
            <td><strong>${dateStr}</strong></td>
            <td>${log.supplier_name}</td>
            <td>${log.admin_name}</td>
            <td><div class="history-preview">${summaryPreview}</div></td>
            <td><div class="history-rating">${starsHtml}</div></td>
            <td>
                <div class="history-actions">
                    <button class="btn btn-secondary btn-xs view-log-btn" data-uid="${log.uid}">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                    <button class="btn btn-secondary btn-xs download-pdf-log-btn" data-uid="${log.uid}">
                        <i class="fa-solid fa-file-pdf"></i> PDF
                    </button>
                </div>
            </td>
        `;
        
        // Click to view detail
        row.querySelector('.view-log-btn').addEventListener('click', () => {
            viewGenerationDetails(log.uid);
        });
        
        // Click to download PDF directly
        row.querySelector('.download-pdf-log-btn').addEventListener('click', () => {
            downloadPDFFromLog(log);
        });
        
        tableBody.appendChild(row);
    });
}

// Retrieve dynamic generation details and render on Dashboard
async function viewGenerationDetails(uid) {
    try {
        // Find the item in our local merged list
        const item = mergedHistoryList.find(x => x.uid === uid);
        if (!item) throw new Error('Alert not found in history');
        
        // Render
        renderOutput(item);
        
        // Fill form fields with inputs
        document.getElementById('admin_name').value = item.admin_name;
        document.getElementById('supplier_name').value = item.supplier_name;
        document.getElementById('supplier_inputs').value = item.supplier_inputs;
        charCurrent.innerText = item.supplier_inputs.length;
        
        // Switch view to output card
        if (outputPlaceholder) outputPlaceholder.classList.add('hidden');
        if (loadingState) loadingState.classList.add('hidden');
        if (outputCard) outputCard.classList.remove('hidden');
        
        // Switch to Dashboard Tab
        const dashBtn = document.querySelector('.nav-btn[data-tab="dashboard-tab"]');
        if (dashBtn) {
            dashBtn.click();
        }
        
        // Apply existing rating values if present
        if (item.rating) {
            currentRating = item.rating;
            highlightStars(item.rating, false);
            commentSection.classList.remove('hidden');
            feedbackComment.value = item.comment || '';
        } else {
            resetRating();
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
    if (log.ai_output && log.ai_output.affected_orders) {
        log.ai_output.affected_orders.forEach(b => {
            ordersList += `<li style="margin-bottom: 8px;">${b}</li>`;
        });
    }
    
    let actionsList = '';
    if (log.ai_output && log.ai_output.recommended_actions) {
        log.ai_output.recommended_actions.forEach(b => {
            actionsList += `<li style="margin-bottom: 8px;">${b}</li>`;
        });
    }

    const summaryText = log.ai_output ? (log.ai_output.summary || '') : '';
    const impactText = log.ai_output ? (log.ai_output.customer_impact || '') : '';

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
            <p style="font-size: 0.95rem; color: #334155; line-height: 1.6; margin: 0;">${summaryText}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="font-family: Outfit, sans-serif; font-size: 1rem; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin: 0 0 10px 0;">2. Customer Impact Analysis</h4>
            <p style="font-size: 0.95rem; color: #334155; line-height: 1.6; margin: 0;">${impactText}</p>
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

function calculateLocalAnalytics(historyList) {
    const total_generations = historyList.length;
    
    let sumRating = 0;
    let countRating = 0;
    let sumResponseTime = 0;
    const suppliersSet = new Set();
    
    const dailyCounts = {}; // date -> count
    const dailyRatings = {}; // date -> { sum, count }
    const supplierCounts = {}; // supplier -> count
    
    historyList.forEach(item => {
        if (item.rating && item.rating > 0) {
            sumRating += item.rating;
            countRating++;
        }
        if (item.response_time_ms) {
            sumResponseTime += item.response_time_ms;
        }
        if (item.supplier_name) {
            const sName = item.supplier_name.trim();
            suppliersSet.add(sName);
            supplierCounts[sName] = (supplierCounts[sName] || 0) + 1;
        }
        
        if (item.timestamp) {
            const dateStr = new Date(item.timestamp).toISOString().split('T')[0];
            dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
            
            if (item.rating && item.rating > 0) {
                if (!dailyRatings[dateStr]) {
                    dailyRatings[dateStr] = { sum: 0, count: 0 };
                }
                dailyRatings[dateStr].sum += item.rating;
                dailyRatings[dateStr].count += 1;
            }
        }
    });
    
    const average_rating = countRating > 0 ? (sumRating / countRating) : 0.0;
    const average_response_time = total_generations > 0 ? (sumResponseTime / total_generations) : 0;
    const unique_suppliers = suppliersSet.size;
    
    // Daily volume for the last 7 calendar days
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
    }
    
    const daily_volume = last7Days.map(date => ({
        date: date,
        count: dailyCounts[date] || 0
    }));
    
    // Quality trends: average rating for days that actually have ratings
    const quality_trends = Object.keys(dailyRatings)
        .sort()
        .map(date => ({
            date: date,
            avg_rating: parseFloat((dailyRatings[date].sum / dailyRatings[date].count).toFixed(2))
        }))
        .slice(-7); // take last 7 rated days
        
    const top_suppliers = Object.keys(supplierCounts)
        .map(s => ({ supplier: s, count: supplierCounts[s] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
        
    return {
        total_generations: total_generations,
        average_rating: average_rating,
        average_response_time_ms: Math.round(average_response_time),
        unique_suppliers: unique_suppliers,
        daily_volume: daily_volume,
        quality_trends: quality_trends,
        top_suppliers: top_suppliers
    };
}

// 10. Load Admin Analytics Tab
async function loadAnalytics() {
    try {
        // Ensure history is loaded and merged list populated
        if (!mergedHistoryList || mergedHistoryList.length === 0) {
            await loadHistory();
        }
        
        const data = calculateLocalAnalytics(mergedHistoryList);
        
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
    updateStorageQuotaUI();
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
