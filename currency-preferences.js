const ZACULATORS_CURRENCIES = {
    USD: { code: "USD", name: "US Dollar", symbol: "$", prefixSpace: false },
    EUR: { code: "EUR", name: "Euro", symbol: "€", prefixSpace: false },
    GBP: { code: "GBP", name: "British Pound", symbol: "£", prefixSpace: false },
    CAD: { code: "CAD", name: "Canadian Dollar", symbol: "C$", prefixSpace: false },
    AUD: { code: "AUD", name: "Australian Dollar", symbol: "A$", prefixSpace: false },
    NZD: { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", prefixSpace: false },
    CHF: { code: "CHF", name: "Swiss Franc", symbol: "CHF", prefixSpace: true },
    JPY: { code: "JPY", name: "Japanese Yen", symbol: "¥", prefixSpace: false },
    CNY: { code: "CNY", name: "Chinese Yuan", symbol: "¥", prefixSpace: false },
    HKD: { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", prefixSpace: false },
    SGD: { code: "SGD", name: "Singapore Dollar", symbol: "S$", prefixSpace: false },
    INR: { code: "INR", name: "Indian Rupee", symbol: "₹", prefixSpace: false },
    PKR: { code: "PKR", name: "Pakistani Rupee", symbol: "Rs", prefixSpace: true },
    AED: { code: "AED", name: "UAE Dirham", symbol: "د.إ", prefixSpace: true },
    SAR: { code: "SAR", name: "Saudi Riyal", symbol: "﷼", prefixSpace: true },
    QAR: { code: "QAR", name: "Qatari Riyal", symbol: "QR", prefixSpace: true },
    KWD: { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD", prefixSpace: true },
    TRY: { code: "TRY", name: "Turkish Lira", symbol: "₺", prefixSpace: false },
    ZAR: { code: "ZAR", name: "South African Rand", symbol: "R", prefixSpace: true },
    NGN: { code: "NGN", name: "Nigerian Naira", symbol: "₦", prefixSpace: false },
    KES: { code: "KES", name: "Kenyan Shilling", symbol: "KSh", prefixSpace: true },
    BRL: { code: "BRL", name: "Brazilian Real", symbol: "R$", prefixSpace: true },
    MXN: { code: "MXN", name: "Mexican Peso", symbol: "Mex$", prefixSpace: false },
    MYR: { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", prefixSpace: true },
    IDR: { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", prefixSpace: true }
};

function getSelectedCurrency() {
    const stored = localStorage.getItem("zaculatorsCurrency");
    return ZACULATORS_CURRENCIES[stored] ? ZACULATORS_CURRENCIES[stored] : ZACULATORS_CURRENCIES.USD;
}

function getCurrencySymbol() {
    return getSelectedCurrency().symbol;
}

function getCurrencyCode() {
    return getSelectedCurrency().code;
}

function formatCurrency(amount) {
    const currency = getSelectedCurrency();
    const formattedNumber = Number(amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    return currency.prefixSpace ? `${currency.symbol} ${formattedNumber}` : `${currency.symbol}${formattedNumber}`;
}

function applyCurrencyLabels() {
    const currency = getSelectedCurrency();
    document.querySelectorAll("[data-currency-symbol]").forEach(node => {
        node.textContent = currency.symbol;
    });
    document.querySelectorAll("[data-currency-code]").forEach(node => {
        node.textContent = currency.code;
    });
}

function initializeCurrencySelector() {
    const selector = document.getElementById("currencyPreferenceSelector");
    if (!selector) {
        applyCurrencyLabels();
        return;
    }

    selector.innerHTML = "";
    Object.values(ZACULATORS_CURRENCIES).forEach(currency => {
        selector.add(new Option(`${currency.code} - ${currency.name}`, currency.code));
    });

    selector.value = getCurrencyCode();
    selector.addEventListener("change", event => {
        localStorage.setItem("zaculatorsCurrency", event.target.value);
        applyCurrencyLabels();
        document.dispatchEvent(new CustomEvent("zaculators:currencychange", {
            detail: getSelectedCurrency()
        }));
    });

    applyCurrencyLabels();
}
