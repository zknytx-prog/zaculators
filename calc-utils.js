/**
 * Precision Finance - Shared Calculator Utilities
 * Used by all 170 calculators for consistency
 * Last updated: April 19, 2026
 */

// ===== STORAGE & PERSISTENCE =====

/**
 * Save calculator results to localStorage
 * @param {string} calculatorId - Unique calculator identifier
 * @param {object} data - Results data to save
 */
function saveResults(calculatorId, data) {
    try {
        const payload = {
            data: data,
            timestamp: new Date().toISOString(),
            calculator: calculatorId
        };
        localStorage.setItem(`precision_calc_${calculatorId}`, JSON.stringify(payload));
        showToast('✓ Results saved to your device');
        return true;
    } catch (e) {
        console.error('LocalStorage save error:', e);
        showToast('⚠️ Could not save (storage full)');
        return false;
    }
}

/**
 * Load saved results from localStorage
 * @param {string} calculatorId - Unique calculator identifier
 * @returns {object|null} - Saved data or null if not found
 */
function loadResults(calculatorId) {
    try {
        const stored = localStorage.getItem(`precision_calc_${calculatorId}`);
        if (stored) {
            const payload = JSON.parse(stored);
            return payload.data;
        }
        return null;
    } catch (e) {
        console.error('LocalStorage load error:', e);
        return null;
    }
}

/**
 * Clear all saved results for a calculator
 * @param {string} calculatorId - Unique calculator identifier
 */
function clearSavedResults(calculatorId) {
    try {
        localStorage.removeItem(`precision_calc_${calculatorId}`);
        showToast('✓ Saved results cleared');
    } catch (e) {
        console.error('LocalStorage clear error:', e);
    }
}

// ===== SHARING & EXPORT =====

/**
 * Generate shareable text summary of results
 * @param {string} calculatorTitle - Name of calculator
 * @param {object} results - Results to share
 * @returns {string} - Formatted summary text
 */
function generateShareSummary(calculatorTitle, results) {
    let summary = `📊 ${calculatorTitle}\n`;
    summary += `🔗 Precision Finance Calculator\n`;
    summary += `📅 ${new Date().toLocaleDateString()}\n\n`;
    
    for (const [key, value] of Object.entries(results)) {
        summary += `${key}: ${value}\n`;
    }
    
    summary += `\n💰 Free calculator at precision-finance.com`;
    return summary;
}

/**
 * Copy result summary to clipboard
 * @param {string} calculatorTitle - Name of calculator
 * @param {object} results - Results to share
 */
function shareResults(calculatorTitle, results) {
    const summary = generateShareSummary(calculatorTitle, results);
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summary).then(() => {
            showToast('📤 Summary copied to clipboard');
        }).catch(() => {
            fallbackCopy(summary);
        });
    } else {
        fallbackCopy(summary);
    }
}

/**
 * Fallback copy for older browsers
 * @param {string} text - Text to copy
 */
function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
        document.execCommand('copy');
        showToast('📤 Summary copied to clipboard');
    } catch (e) {
        showToast('⚠️ Could not copy (use manual selection)');
    }
    
    document.body.removeChild(textarea);
}

/**
 * Generate shareable URL with encoded results
 * @param {string} baseUrl - Calculator URL
 * @param {object} results - Results to encode
 * @returns {string} - URL with query parameters
 */
function generateShareUrl(baseUrl, results) {
    const params = new URLSearchParams();
    Object.entries(results).forEach(([key, value]) => {
        params.append(key, value);
    });
    return `${baseUrl}?${params.toString()}`;
}

// ===== PRINTING =====

/**
 * Print result card only (not full page)
 * @param {string} elementId - ID of results element to print
 * @param {string} title - Calculator title for print header
 */
function printResults(elementId, title) {
    const printWindow = window.open('', '_blank');
    const resultsElement = document.getElementById(elementId);
    
    if (!resultsElement) {
        showToast('⚠️ Results not found');
        return;
    }
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title} - Precision Finance</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    padding: 20px;
                    max-width: 600px;
                    margin: 0 auto;
                    color: #0f172a;
                }
                h1 {
                    font-size: 1.5rem;
                    margin-bottom: 1rem;
                    color: #2563eb;
                }
                .result-section {
                    background: #f0fdf4;
                    border-left: 4px solid #16a34a;
                    padding: 1rem;
                    border-radius: 6px;
                    margin: 1rem 0;
                }
                .result-item {
                    margin-bottom: 1rem;
                }
                .result-label {
                    font-size: 0.9rem;
                    color: #64748b;
                    margin-bottom: 0.25rem;
                }
                .result-value {
                    font-size: 1.3rem;
                    font-weight: 600;
                    color: #16a34a;
                }
                .footer {
                    margin-top: 2rem;
                    padding-top: 1rem;
                    border-top: 1px solid #e2e8f0;
                    font-size: 0.85rem;
                    color: #64748b;
                    text-align: center;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div class="result-section">
                ${resultsElement.innerHTML}
            </div>
            <div class="footer">
                <p>Calculated with Precision Finance Calculator</p>
                <p>${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Trigger print after content loads
    printWindow.onload = () => {
        printWindow.print();
    };
}

// ===== NOTIFICATIONS =====

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default: 3000)
 */
function showToast(message, duration = 3000) {
    let toast = document.getElementById('toast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 1rem;
            right: 1rem;
            background: #2563eb;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

// ===== FORMATTING =====

/**
 * Format number as currency (USD)
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} - Formatted currency string
 */
function formatCurrency(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

/**
 * Format number with thousand separators
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted number
 */
function formatNumber(value, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

/**
 * Format number as percentage
 * @param {number} value - Decimal value (0.5 = 50%)
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted percentage
 */
function formatPercent(value, decimals = 1) {
    return formatNumber(value * 100, decimals) + '%';
}

/**
 * Format number with unit suffix
 * @param {number} value - Number to format
 * @param {string} unit - Unit suffix (kg, lbs, etc)
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted with unit
 */
function formatWithUnit(value, unit, decimals = 2) {
    return formatNumber(value, decimals) + ' ' + unit;
}

// ===== VALIDATION =====

/**
 * Validate number input
 * @param {any} value - Value to check
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {object} - { valid: boolean, error: string }
 */
function validateNumber(value, min = null, max = null) {
    const num = parseFloat(value);
    
    if (isNaN(num) || !isFinite(num)) {
        return { valid: false, error: 'Please enter a valid number' };
    }
    
    if (min !== null && num < min) {
        return { valid: false, error: `Minimum value is ${min}` };
    }
    
    if (max !== null && num > max) {
        return { valid: false, error: `Maximum value is ${max}` };
    }
    
    return { valid: true, error: null };
}

/**
 * Validate positive number
 * @param {any} value - Value to check
 * @returns {object} - { valid: boolean, error: string }
 */
function validatePositive(value) {
    const result = validateNumber(value);
    if (!result.valid) return result;
    
    const num = parseFloat(value);
    if (num <= 0) {
        return { valid: false, error: 'Value must be greater than 0' };
    }
    
    return { valid: true, error: null };
}

/**
 * Validate age (18+)
 * @param {any} value - Age value
 * @returns {object} - { valid: boolean, error: string }
 */
function validateAge(value) {
    const result = validateNumber(value, 0, 120);
    if (!result.valid) return result;
    
    const num = parseFloat(value);
    if (num < 18) {
        return { valid: false, error: 'Must be 18 or older' };
    }
    
    return { valid: true, error: null };
}

/**
 * Show validation error on input field
 * @param {HTMLElement} input - Input element
 * @param {string} error - Error message (null to clear)
 */
function showValidationError(input, error) {
    const errorElement = input.parentElement.querySelector('.error-message');
    
    if (error) {
        input.style.borderColor = '#dc2626';
        if (errorElement) {
            errorElement.textContent = error;
            errorElement.classList.add('show');
        }
    } else {
        input.style.borderColor = '';
        if (errorElement) {
            errorElement.classList.remove('show');
        }
    }
}

// ===== CALCULATIONS =====

/**
 * Calculate percentage of value
 * @param {number} percentage - Percentage (0-100)
 * @param {number} value - Base value
 * @returns {number} - Calculated amount
 */
function calcPercentage(percentage, value) {
    return (percentage / 100) * value;
}

/**
 * Calculate percentage increase
 * @param {number} original - Original value
 * @param {number} new - New value
 * @returns {number} - Percentage change
 */
function calcPercentageChange(original, newVal) {
    return ((newVal - original) / original) * 100;
}

/**
 * Calculate compound interest
 * @param {number} principal - Initial amount
 * @param {number} rate - Annual rate (as decimal, 0.05 = 5%)
 * @param {number} time - Time in years
 * @param {number} compounds - Compounds per year
 * @returns {number} - Final amount
 */
function calcCompoundInterest(principal, rate, time, compounds = 12) {
    return principal * Math.pow(1 + rate / compounds, compounds * time);
}

/**
 * Calculate simple interest
 * @param {number} principal - Initial amount
 * @param {number} rate - Annual rate (as decimal)
 * @param {number} time - Time in years
 * @returns {number} - Interest amount
 */
function calcSimpleInterest(principal, rate, time) {
    return principal * rate * time;
}

/**
 * Calculate loan payment (EMI)
 * @param {number} principal - Loan amount
 * @param {number} monthlyRate - Monthly interest rate (annual/12/100)
 * @param {number} months - Number of months
 * @returns {number} - Monthly payment
 */
function calcLoanPayment(principal, monthlyRate, months) {
    if (monthlyRate === 0) return principal / months;
    return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / 
           (Math.pow(1 + monthlyRate, months) - 1);
}

// ===== CONVERSIONS =====

/**
 * Convert Celsius to Fahrenheit
 * @param {number} celsius - Temperature in Celsius
 * @returns {number} - Temperature in Fahrenheit
 */
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

/**
 * Convert Fahrenheit to Celsius
 * @param {number} fahrenheit - Temperature in Fahrenheit
 * @returns {number} - Temperature in Celsius
 */
function fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
}

/**
 * Convert kilometers to miles
 * @param {number} km - Distance in kilometers
 * @returns {number} - Distance in miles
 */
function kmToMiles(km) {
    return km * 0.621371;
}

/**
 * Convert miles to kilometers
 * @param {number} miles - Distance in miles
 * @returns {number} - Distance in kilometers
 */
function milesToKm(miles) {
    return miles / 0.621371;
}

/**
 * Convert kilograms to pounds
 * @param {number} kg - Weight in kg
 * @returns {number} - Weight in pounds
 */
function kgToPounds(kg) {
    return kg * 2.20462;
}

/**
 * Convert pounds to kilograms
 * @param {number} pounds - Weight in pounds
 * @returns {number} - Weight in kg
 */
function poundsToKg(pounds) {
    return pounds / 2.20462;
}

// ===== UTILITIES =====

/**
 * Debounce function for input handlers
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {function} - Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} - Formatted date
 */
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

/**
 * Calculate days between two dates
 * @param {string} date1 - Date in YYYY-MM-DD format
 * @param {string} date2 - Date in YYYY-MM-DD format
 * @returns {number} - Days between (positive if date2 > date1)
 */
function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = d2 - d1;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate age from birth date
 * @param {string} birthDate - Birth date in YYYY-MM-DD format
 * @returns {number} - Age in years
 */
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

/**
 * Check if number is within range
 * @param {number} value - Value to check
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {boolean}
 */
function isInRange(value, min, max) {
    return value >= min && value <= max;
}

// ===== EXPORT FOR USAGE =====
// All functions are globally available when this script is included
// Usage: <script src="/calc-utils.js"></script>
