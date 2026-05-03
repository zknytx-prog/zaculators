const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");

const SUPPORT_EXCLUDES = new Set([
  "index.html",
  "index-final.html",
  "index-fixed.html",
  "index-root.html",
  "all-calculators.html",
  "about-us.html",
  "contact-us.html",
  "privacy-policy.html",
  "terms-of-service.html",
  "disclaimer.html",
  "UNIVERSAL_CALCULATOR_TEMPLATE.html",
  "mortgage-calculator-premium.html",
  "mortgage-calculator-standalone.html"
]);

const SAMPLE_DONE = new Set([
  "mortgage.html",
  "bmi.html",
  "retirement.html",
  "loan.html",
  "tip.html"
]);

const EXPANSIONS = {
  apr: "APR",
  bac: "BAC",
  bmi: "BMI",
  bmr: "BMR",
  emi: "EMI",
  etf: "ETF",
  gpa: "GPA",
  hiit: "HIIT",
  hoa: "HOA",
  ltv: "LTV",
  npv: "NPV",
  ppi: "PPI",
  roi: "ROI",
  tdee: "TDEE",
  vo2: "VO2",
  max: "Max"
};

const CATEGORY_MAP = {
  financial: [
    "annuity", "apr", "compound-interest", "credit", "debt", "discount", "dividend",
    "emergency-fund", "etf", "future-value", "inflation", "loan", "mortgage", "net-worth",
    "npv", "payback", "pension", "present-value", "retirement", "savings", "simple-interest",
    "social-security", "tax", "time-value", "tip", "percentage", "hourly-rate", "commission"
  ],
  health: [
    "bac", "bmi", "bmr", "body-fat", "calorie", "exercise", "fitness", "heart", "nutrition",
    "protein", "sleep", "tdee", "vo2", "waist", "water", "weight-loss"
  ],
  real_estate: [
    "closing-costs", "down-payment", "equity", "flipping", "home", "hoa", "lease", "property",
    "refinance", "rent-vs-buy", "mortgage-amortization", "loan-payoff", "investment-property"
  ],
  business: [
    "break-even", "cash-flow", "customer", "degree-roi", "expense", "financial-aid", "inventory",
    "markup", "payroll", "pricing", "profit", "revenue"
  ],
  education: [
    "course", "gpa", "grade", "scholarship", "student", "study", "tuition"
  ],
  conversion: [
    "aspect-ratio", "cooking", "currency", "data-storage", "density", "energy-converter", "flow-rate",
    "length", "pressure", "screen-ppi", "speed", "temperature", "time-zone", "unit-converter",
    "unit-price", "volume", "weight"
  ],
  personal: [
    "age", "birthday-budget", "event-planner", "gift-budget", "parking-fee", "trip-cost",
    "vacation-budget", "wedding-budget", "work-hours"
  ],
  automotive: [
    "appliance-cost", "electricity-cost", "energy-cost", "fuel-cost", "fuel-efficiency", "furniture-cost",
    "home-improvement", "insurance-premium", "moving-cost", "utility-cost", "vehicle-cost",
    "vehicle-depreciation", "vehicle-loan", "water-bill"
  ]
};

const CATEGORY_RELATED = {
  financial: ["loan.html", "apr.html", "future-value.html", "net-worth.html", "simple-interest.html", "retirement.html"],
  health: ["bmi.html", "protein-intake.html", "water-intake.html", "tdee.html", "vo2-max.html", "sleep-calculator.html"],
  real_estate: ["mortgage.html", "home-affordability.html", "property-tax.html", "rent-vs-buy.html", "refinance.html", "equity-calculator.html"],
  business: ["break-even.html", "profit-margin.html", "pricing-optimizer.html", "cash-flow-tracker.html", "revenue-projector.html", "inventory-manager.html"],
  education: ["gpa-calculator.html", "grade-converter.html", "student-loan.html", "tuition-forecaster.html", "scholarship-calculator.html", "study-planner.html"],
  conversion: ["unit-converter.html", "temperature.html", "currency.html", "length.html", "volume.html", "weight.html"],
  personal: ["budget-planner.html", "event-planner.html", "trip-cost.html", "vacation-budget.html", "work-hours.html", "age.html"],
  automotive: ["fuel-cost.html", "fuel-efficiency.html", "vehicle-cost.html", "vehicle-loan.html", "insurance-premium.html", "moving-cost.html"]
};

const TOPIC_HINTS = [
  { match: "annuity", definition: "estimate the value or payout effect of equal payments made on a fixed schedule", example: "monthly deposits of $400, a 5% annual return, and a 20-year timeline", interpretation: "Longer time, larger payments, and stronger returns usually increase the ending value." },
  { match: "bond", definition: "estimate income, pricing, or return on a fixed-income investment", example: "a $1,000 face value bond, a 4% coupon, and a market yield near 5%", interpretation: "Yield, coupon rate, and time to maturity often move the result more than investors expect." },
  { match: "bmi-percentile", definition: "compare a child's BMI to age- and sex-based growth chart percentiles", example: "a 10-year-old child's height, weight, age, and sex", interpretation: "Percentiles should be read as screening context, not a diagnosis on their own." },
  { match: "bmr", definition: "estimate how many calories your body uses at rest before activity is added", example: "height, weight, age, and sex for a 35-year-old adult", interpretation: "A higher BMR means more baseline energy use, but activity level still matters for daily needs." },
  { match: "dividend", definition: "estimate dividend income based on share count, yield, or payout assumptions", example: "a $15,000 holding with a 3.5% dividend yield", interpretation: "Yield can look attractive, but payout stability and total return still matter." },
  { match: "etf", definition: "estimate growth, contributions, and income from an exchange-traded fund position", example: "a starting investment of $10,000 with monthly additions and an expected annual return", interpretation: "Fees, return assumptions, and contribution size usually drive the long-term picture." },
  { match: "pension", definition: "estimate retirement income from a pension formula, contribution history, or payout option", example: "years of service, final salary, and a retirement age assumption", interpretation: "The most useful result is how well the projected benefit covers future spending." },
  { match: "social-security", definition: "estimate how claiming age and earnings history affect future Social Security income", example: "a planned claiming age, current estimate, and expected retirement timing", interpretation: "Claiming later can raise the monthly amount, but the best choice depends on cash flow and lifespan expectations." },
  { match: "credit-utilization", definition: "measure how much of your revolving credit limit you are using", example: "card balances of $900 against a total limit of $4,500", interpretation: "Lower utilization is generally better for credit health, especially if you stay well below your limit." },
  { match: "debt-consolidation", definition: "compare whether combining debts changes payment size, payoff speed, or total interest", example: "several balances, their rates, and a proposed new consolidation loan", interpretation: "A lower payment can help cash flow, but it is only a win if fees and repayment length are also reasonable." },
  { match: "net-worth", definition: "total what you own and subtract what you owe", example: "cash, investments, home equity, car value, and outstanding debts", interpretation: "The trend over time matters more than one isolated snapshot." },
  { match: "emergency-fund", definition: "estimate how much cash reserve you may want for short-term emergencies", example: "monthly core expenses and a target of three to six months", interpretation: "The right target depends on income stability, dependents, and how quickly you could replace lost earnings." },
  { match: "budget-planner", definition: "map income against recurring expenses and savings goals", example: "take-home pay, rent, food, transport, and savings targets", interpretation: "A workable budget leaves room for essentials, planned savings, and some margin for surprises." },
  { match: "cash-flow", definition: "compare money coming in with money going out over a set period", example: "monthly revenue or income, fixed expenses, and variable spending", interpretation: "Positive cash flow gives flexibility, while repeated negative cash flow usually signals a plan that needs adjustment." },
  { match: "customer-lifetime-value", definition: "estimate how much revenue or profit one customer can generate over time", example: "average order value, purchase frequency, gross margin, and retention period", interpretation: "LTV is most useful when you compare it to acquisition cost and actual retention patterns." },
  { match: "degree-roi", definition: "compare the cost of a degree with the income lift you expect from earning it", example: "tuition cost, time in school, salary before graduation, and salary after graduation", interpretation: "A stronger ROI usually comes from controlling cost, finishing on time, and choosing a path with durable earnings upside." },
  { match: "financial-aid", definition: "estimate how grants, scholarships, work study, and loans affect your remaining school bill", example: "school cost, aid amounts, and family contribution assumptions", interpretation: "The key question is how much cost is left after aid, not just how large the aid package sounds." },
  { match: "gpa", definition: "turn course grades and credit hours into an overall grade point average", example: "four classes with different letter grades and credit weights", interpretation: "Weighted credits matter, so one high-credit class can move the GPA more than several small classes." },
  { match: "grade", definition: "estimate current standing or the score needed to reach a target course grade", example: "current assignment average, exam weight, and target final grade", interpretation: "The result is most helpful for spotting whether your goal is still realistic before the final exam." },
  { match: "scholarship", definition: "estimate how scholarship funding reduces total school cost", example: "annual tuition, fees, housing, and scholarship awards", interpretation: "A scholarship changes the true price of school, so compare net cost, not sticker price." },
  { match: "study-planner", definition: "turn available hours and deadlines into a realistic study schedule", example: "days until the exam, total topics, and study hours per day", interpretation: "A good plan spreads work early enough that you do not rely on last-minute cramming." },
  { match: "tuition", definition: "estimate future school cost or current tuition burden using expected increases over time", example: "today's tuition, expected annual increase, and years until enrollment", interpretation: "Even modest yearly increases can significantly change the total cost over several years." },
  { match: "break-even", definition: "show the point where revenue covers cost and profit is zero", example: "price per unit, variable cost per unit, and total fixed overhead", interpretation: "The wider the gap between price and variable cost, the fewer sales you need to break even." },
  { match: "inventory", definition: "track stock levels, usage, turnover, or reorder timing", example: "opening stock, sales pace, reorder point, and restock quantity", interpretation: "Healthy inventory supports sales without tying up too much cash in slow-moving stock." },
  { match: "markup", definition: "translate cost into selling price or show the markup built into a price", example: "an item cost of $24 and a target markup of 60%", interpretation: "Markup and margin are not the same, so make sure you are using the right measure." },
  { match: "payroll", definition: "estimate gross pay, withholdings, or employer payroll cost", example: "hours worked, pay rate, taxes, and benefit deductions", interpretation: "The number to watch is often the gap between gross pay and take-home pay or total employer expense." },
  { match: "pricing", definition: "test how price changes affect revenue, margin, or volume assumptions", example: "current price, target margin, expected demand, and cost per sale", interpretation: "A higher price is only better if demand and margin still support the business." },
  { match: "profit", definition: "measure how much money remains after direct and indirect costs are covered", example: "revenue, cost of goods, and operating expenses", interpretation: "Watch both the dollar profit and the profit rate, because a large sales number can still hide a thin margin." },
  { match: "revenue", definition: "project sales totals based on price, volume, and growth assumptions", example: "average sale amount, monthly customers, and expected growth", interpretation: "A useful forecast should be ambitious enough to guide action but still grounded in realistic sales capacity." },
  { match: "home-affordability", definition: "estimate how much home price your income and monthly obligations can reasonably support", example: "household income, down payment, taxes, insurance, and debt payments", interpretation: "Affordability is stronger when the payment fits your budget even after taxes, insurance, and maintenance are added." },
  { match: "closing-costs", definition: "estimate the fees and prepaid items due when a property purchase closes", example: "home price, loan amount, lender fees, title charges, and escrow items", interpretation: "Closing costs matter because a deal can look affordable on the payment alone but still require much more cash upfront." },
  { match: "equity", definition: "estimate how much of a property you truly own after subtracting debt", example: "current home value and the remaining mortgage balance", interpretation: "Growing equity increases your financial cushion, but it is only liquid if you sell or borrow against it." },
  { match: "hoa", definition: "estimate homeowner association dues and their effect on total housing cost", example: "monthly dues, special assessments, and related housing expenses", interpretation: "A home may fit the mortgage budget but still feel expensive once recurring HOA costs are added." },
  { match: "lease-vs-buy", definition: "compare the long-term cost of leasing with the cost of owning outright", example: "lease payment, purchase price, financing cost, maintenance, and expected resale value", interpretation: "The better choice often depends on how long you keep the asset and how much flexibility you need." },
  { match: "property-tax", definition: "estimate annual or monthly property tax based on value and local rate assumptions", example: "assessed value, tax rate, and exemption details", interpretation: "Property tax can materially change carrying cost, so it should be reviewed alongside the mortgage payment." },
  { match: "refinance", definition: "compare a current loan with a proposed new loan to see whether savings justify the switch", example: "remaining balance, current rate, new rate, fees, and years left", interpretation: "Monthly savings matter, but the break-even point after refinance costs matters too." },
  { match: "rent-vs-buy", definition: "compare the financial trade-offs between renting and purchasing a home", example: "rent, home price, rate, taxes, insurance, and expected years in the home", interpretation: "The answer depends on time horizon, mobility, maintenance, and how much cash you want to tie up in housing." },
  { match: "annuity-calculator", definition: "estimate how a stream of equal payments grows or what that payment stream is worth today", example: "a fixed monthly deposit, an expected return, and a time horizon", interpretation: "Regularity is the key idea: when the payment amount and schedule stay consistent, the result becomes easier to compare across scenarios." },
  { match: "flipping", definition: "estimate potential profit on a property resale after rehab, holding costs, and selling costs", example: "purchase price, renovation budget, carrying cost, and expected resale price", interpretation: "A deal only works if enough margin remains after repair surprises and transaction costs." },
  { match: "property-appreciation", definition: "estimate how property value may change over time at a chosen growth rate", example: "current property value, expected annual growth, and number of years held", interpretation: "Appreciation assumptions should stay conservative because markets rarely move in a straight line." },
  { match: "property-valuation", definition: "estimate property value using income, comparable sales, or cost assumptions", example: "rent, cap rate, or comparable home values depending on the model", interpretation: "A valuation is more dependable when several methods point to a similar range." },
  { match: "bac", definition: "estimate blood alcohol concentration from drinks, body size, and time", example: "number of drinks, body weight, biological sex, and hours since drinking began", interpretation: "BAC calculators are rough estimates and should never be used to decide whether it is safe to drive." },
  { match: "body-fat", definition: "estimate body fat percentage from body measurements or composition data", example: "waist, neck, height, and sometimes hip measurements", interpretation: "Use the number as a trend marker, because measurement method can affect precision." },
  { match: "calorie-burn", definition: "estimate how many calories an activity may use based on time, intensity, and body size", example: "body weight, exercise type, and workout duration", interpretation: "The result is an estimate, not an excuse to out-eat the workout." },
  { match: "calorie-needs", definition: "estimate daily calorie needs using body size, age, sex, and activity level", example: "age, weight, height, sex, and typical activity", interpretation: "Maintenance needs vary, so the most useful signal is how your body responds over a few weeks." },
  { match: "fitness-level", definition: "turn a few performance or activity measures into a simple fitness benchmark", example: "activity frequency, test results, or training pace", interpretation: "The number is most useful when it motivates steady improvement rather than one-off comparison." },
  { match: "max-heart-rate", definition: "estimate a training heart-rate ceiling used for exercise zones", example: "your age and a common prediction formula", interpretation: "Formula-based max heart rate is a starting point, not a perfect personal limit." },
  { match: "nutrition", definition: "estimate intake targets for calories or macros based on body size and goals", example: "current weight, goal, activity level, and target calories", interpretation: "A good target should be sustainable, not just mathematically aggressive." },
  { match: "protein", definition: "estimate daily protein intake needs based on body weight and activity level", example: "body weight and a sedentary, active, or strength-training goal", interpretation: "The right intake depends on training, age, and overall calorie intake." },
  { match: "sleep", definition: "estimate sleep timing or wake-up windows using target bedtime and cycle timing", example: "desired wake time and standard 90-minute sleep cycles", interpretation: "The result is most useful as a routine guide, not as a guarantee of perfect rest." },
  { match: "tdee", definition: "estimate total daily energy expenditure by combining resting needs with activity", example: "age, body size, sex, and activity level", interpretation: "TDEE is often the anchor for planning weight maintenance, loss, or gain." },
  { match: "vo2-max", definition: "estimate aerobic capacity using pace, distance, heart rate, or test performance", example: "a timed run, walk test, or related cardio input", interpretation: "Higher values often reflect stronger aerobic fitness, but progress over time matters more than a one-day score." },
  { match: "waist-hip", definition: "compare waist size with hip size as one indicator of body fat distribution", example: "waist and hip measurements taken in inches or centimeters", interpretation: "It is a screening measure, so it works best alongside other health markers." },
  { match: "water-intake", definition: "estimate daily fluid needs from body size, climate, and activity", example: "body weight, exercise time, and weather conditions", interpretation: "Hydration targets shift with sweat loss, illness, heat, and sodium intake." },
  { match: "weight-loss", definition: "estimate how long it may take to lose weight at a chosen calorie deficit", example: "current weight, target weight, and expected weekly loss rate", interpretation: "Faster is not always better; the most reliable plan is one you can keep." },
  { match: "currency", definition: "convert one currency amount into another using the chosen exchange rate", example: "an amount in USD compared with EUR or another target currency", interpretation: "Exchange rates move constantly, so the result is best treated as a working estimate." },
  { match: "density", definition: "convert density units used in science, manufacturing, or engineering", example: "a density entered in kilograms per cubic meter or grams per milliliter", interpretation: "Unit precision matters because tiny placement errors can create large conversion mistakes." },
  { match: "flow-rate", definition: "convert or compare how much liquid or gas moves through a system over time", example: "gallons per minute, liters per second, or cubic feet per hour", interpretation: "Match the unit to the equipment spec so the number is useful in practice." },
  { match: "length", definition: "convert a distance or size measurement between common length units", example: "inches, feet, meters, miles, or centimeters", interpretation: "The result is simple, but using the wrong base unit can quietly derail a project or order." },
  { match: "pressure", definition: "convert pressure readings between units such as psi, bar, kPa, and atmospheres", example: "a tire, fluid, or process pressure reading in one unit", interpretation: "Make sure the unit matches the tool, gauge, or spec sheet you are using." },
  { match: "screen-ppi", definition: "estimate display sharpness by comparing pixel dimensions with screen size", example: "screen width and height in pixels plus the diagonal size", interpretation: "Higher PPI often looks sharper at the same viewing distance, but the visual difference still depends on how you use the screen." },
  { match: "speed", definition: "convert travel or process speed between units like mph, km/h, and m/s", example: "a speed reading from a workout, machine, or trip plan", interpretation: "Choose the unit that matches the rest of your data so you do not compare unlike values." },
  { match: "temperature", definition: "convert temperature between Celsius, Fahrenheit, and Kelvin", example: "an oven setting, weather reading, or lab measurement", interpretation: "Temperature conversion is simple, but it is important because the scale spacing is not identical across units." },
  { match: "time-zone", definition: "compare times across regions so meetings, calls, or deadlines line up correctly", example: "a start time in one city and the target city you need to coordinate with", interpretation: "The big thing to watch is daylight saving time, because offsets can change during the year." },
  { match: "unit-price", definition: "compare the cost per ounce, pound, liter, or count across package sizes", example: "two package prices with their corresponding sizes", interpretation: "The cheaper shelf price is not always the better value once unit cost is compared." },
  { match: "volume", definition: "convert liquid or container volume between units such as cups, liters, and gallons", example: "a recipe amount, tank size, or packaged volume", interpretation: "This matters whenever a size label, recipe, or equipment spec uses a different volume unit than the one you have." },
  { match: "weight", definition: "convert body weight, shipping weight, or product weight between common units", example: "pounds, kilograms, ounces, or grams", interpretation: "Double-check the source unit first, because an otherwise perfect conversion still fails if the starting unit is wrong." },
  { match: "age", definition: "measure exact age between a birth date and another date", example: "a birth date and today's date or a future target date", interpretation: "This is useful when a program, policy, or milestone depends on exact years, months, or days." },
  { match: "birthday-budget", definition: "estimate party cost by combining guest count, food, venue, and extras", example: "a guest list, food budget, decorations, and entertainment", interpretation: "Per-person cost often exposes where the plan is getting too expensive." },
  { match: "event-planner", definition: "combine guest count, supplies, and major line items into a single event budget", example: "venue, catering, rentals, and guest count", interpretation: "The most useful output is usually the total budget plus the cost per guest." },
  { match: "gift-budget", definition: "spread a gift budget across people, events, or seasons", example: "a total budget and a list of recipients or occasions", interpretation: "A small per-person adjustment can keep the total from creeping past your limit." },
  { match: "parking-fee", definition: "estimate total parking cost from the rate structure and time parked", example: "hourly rate, flat rate, and total hours parked", interpretation: "Parking fees often jump at threshold times, so the exact duration matters." },
  { match: "trip-cost", definition: "estimate travel cost by combining transportation, lodging, food, and extras", example: "miles driven or airfare, hotel nights, daily food cost, and activities", interpretation: "The best use is to catch the full trip cost before the booking stage." },
  { match: "vacation-budget", definition: "set a practical spending plan for a trip before bookings and daily purchases stack up", example: "transport, lodging, meals, and activity costs", interpretation: "A vacation budget works best when it includes a cushion for taxes, tips, and small surprises." },
  { match: "wedding-budget", definition: "estimate wedding cost from venue, guest count, food, attire, and service vendors", example: "guest count, venue, catering, flowers, and photography", interpretation: "The most useful number is often cost per guest, because it shows what is really driving the budget." },
  { match: "work-hours", definition: "convert schedules into weekly or monthly work-hour totals", example: "start time, end time, unpaid breaks, and number of workdays", interpretation: "This helps when you need to compare schedule load, payroll expectations, or overtime risk." },
  { match: "appliance-cost", definition: "estimate the cost of owning or running an appliance over time", example: "purchase price, energy use, and expected years of use", interpretation: "An item with a higher sticker price can still be cheaper over time if it uses less energy or lasts longer." },
  { match: "energy-cost", definition: "estimate energy expense from usage and your local rate", example: "kilowatt-hours used and the utility price per unit", interpretation: "Energy cost is easier to manage when you can see how usage changes the bill." },
  { match: "fuel-cost", definition: "estimate fuel spending from distance, efficiency, and fuel price", example: "a 220-mile trip, a vehicle efficiency figure, and a gas price per gallon", interpretation: "Fuel cost becomes more actionable when you compare several route or vehicle scenarios." },
  { match: "fuel-efficiency", definition: "measure how far a vehicle travels per gallon or per liter of fuel", example: "distance driven and fuel consumed", interpretation: "Efficiency is best tracked over several fill-ups so one unusual trip does not skew the picture." },
  { match: "furniture-cost", definition: "estimate total furniture spending after delivery, assembly, and add-ons", example: "base item price, quantity, delivery fee, and assembly cost", interpretation: "The displayed total is most useful when it includes the costs that are easy to forget at checkout." },
  { match: "insurance-premium", definition: "estimate premium cost based on coverage level, deductible, and risk factors", example: "coverage amount, deductible, and a monthly or annual term", interpretation: "A lower premium is not always better if it only comes from cutting coverage too far." },
  { match: "moving-cost", definition: "estimate relocation expense using distance, truck size, labor, and packing extras", example: "miles moved, home size, truck rental, and labor hours", interpretation: "A move gets expensive fast when travel time, packing, and temporary storage are added late." },
  { match: "utility-cost", definition: "estimate recurring household utility expense from usage and rate assumptions", example: "monthly usage and the price charged per unit", interpretation: "This is most useful when you compare seasons or test the effect of reducing usage." },
  { match: "vehicle-cost", definition: "estimate what a vehicle really costs after fuel, payment, maintenance, and insurance are added", example: "monthly payment, fuel, maintenance, registration, and insurance", interpretation: "The total monthly carrying cost is often much higher than the loan payment alone." },
  { match: "vehicle-depreciation", definition: "estimate how much value a vehicle may lose over time", example: "purchase price, annual depreciation rate, and years owned", interpretation: "Depreciation tends to hit hardest early, which is why ownership timing matters." },
  { match: "vehicle-loan", definition: "estimate vehicle financing cost from price, rate, down payment, and term", example: "purchase price, loan term, APR, and down payment", interpretation: "Longer terms can lower the payment while increasing total interest and negative equity risk." },
  { match: "water-bill", definition: "estimate a water bill from consumption, tiered rates, and fixed fees", example: "monthly water use, base charge, and any sewer or service fee", interpretation: "Bills often rise in steps, so small usage changes can have a bigger effect once you cross a pricing tier." }
];

function hashIndex(value, max) {
  const digest = crypto.createHash("md5").update(value).digest("hex");
  return parseInt(digest.slice(0, 8), 16) % max;
}

function readManifestDone() {
  const manifestPath = path.join(ROOT, "manifest.csv");
  if (!fs.existsSync(manifestPath)) {
    return new Set();
  }
  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/).slice(1);
  const files = lines.map((line) => line.split(",")[0]?.trim()).filter(Boolean);
  return new Set(files);
}

function listTargetFiles() {
  const manifestDone = readManifestDone();
  let files = fs.readdirSync(ROOT)
    .filter((name) => name.endsWith(".html"))
    .filter((name) => !SUPPORT_EXCLUDES.has(name))
    .filter((name) => !manifestDone.has(name))
    .filter((name) => !SAMPLE_DONE.has(name))
    .sort();
  if (process.env.TARGET_FILE) {
    files = files.filter((name) => name === process.env.TARGET_FILE);
  }
  if (process.env.FILE_OFFSET) {
    files = files.slice(Number(process.env.FILE_OFFSET));
  }
  if (process.env.FILE_LIMIT) {
    files = files.slice(0, Number(process.env.FILE_LIMIT));
  }
  return files;
}

function slugToTitle(slug) {
  return slug
    .replace(/\.html$/i, "")
    .split("-")
    .map((part) => EXPANSIONS[part.toLowerCase()] || part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace(/\bVs\b/g, "vs")
    .replace(/\bAnd\b/g, "and");
}

function inferCategory(slug) {
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((keyword) => slug.includes(keyword))) {
      return category;
    }
  }
  return "financial";
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function findTopicHint(slug) {
  return TOPIC_HINTS.find((entry) => slug.includes(entry.match)) || null;
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(text) {
  return decodeEntities(text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function getFirstMatch(content, regex, fallback = "") {
  const match = content.match(regex);
  return match ? stripTags(match[1]) : fallback;
}

function extractInputs(content) {
  const inputs = [];
  const inputRegex = /<label[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/label>[\s\S]*?(<(?:input|select)[\s\S]*?id="\1"[\s\S]*?(?:<\/select>|>))/gi;
  let match;
  while ((match = inputRegex.exec(content)) !== null) {
    const id = match[1];
    const label = stripTags(match[2]);
    const element = match[3];
    const type = (element.match(/type="([^"]+)"/i) || [null, "text"])[1].toLowerCase();
    const value = (element.match(/\svalue="([^"]*)"/i) || [null, ""])[1];
    const placeholder = (element.match(/\splaceholder="([^"]*)"/i) || [null, ""])[1];
    const min = (element.match(/\smin="([^"]*)"/i) || [null, ""])[1];
    const max = (element.match(/\smax="([^"]*)"/i) || [null, ""])[1];
    const step = (element.match(/\sstep="([^"]*)"/i) || [null, ""])[1];
    const hint = getFirstMatch(content, new RegExp(`<p[^>]*id="${id}-hint"[^>]*>([\\s\\S]*?)<\\/p>`, "i"), "");
    inputs.push({ id, label, type, value, placeholder, min, max, step, hint });
  }
  if (inputs.length) {
    return inputs;
  }
  const simpleLabelRegex = /<label[^>]*>([\s\S]*?)<\/label>\s*(<(?:input|select)[^>]*>)/gi;
  while ((match = simpleLabelRegex.exec(content)) !== null) {
    const label = stripTags(match[1]);
    const element = match[2];
    const type = (element.match(/type="([^"]+)"/i) || [null, "text"])[1].toLowerCase();
    const value = (element.match(/\svalue="([^"]*)"/i) || [null, ""])[1];
    const placeholder = (element.match(/\splaceholder="([^"]*)"/i) || [null, ""])[1];
    inputs.push({ id: "", label, type, value, placeholder, min: "", max: "", step: "", hint: "" });
  }
  return inputs;
}

function extractResults(content) {
  const results = [];
  let match;
  const resultItemRegex = /<div[^>]*class="result-item"[^>]*>[\s\S]*?<label[^>]*>([\s\S]*?)<\/label>[\s\S]*?<div[^>]*class="value"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<\/div>/gi;
  while ((match = resultItemRegex.exec(content)) !== null) {
    const label = stripTags(match[1]);
    const value = stripTags(match[2]);
    if (label && !results.some((item) => item.label === label)) {
      results.push({ label, value });
    }
  }
  if (results.length) {
    return results.slice(0, 6);
  }
  const resultSectionMatch = content.match(/<(?:div|section)[^>]*(?:id="results"|class="results[^"]*|class="results-section[^"]*")[^>]*>([\s\S]*?)<\/(?:div|section)>/i);
  if (resultSectionMatch) {
    const inner = resultSectionMatch[1];
    const pairRegex = /<label[^>]*>([\s\S]*?)<\/label>\s*<div[^>]*class="value"[^>]*>([\s\S]*?)<\/div>/gi;
    while ((match = pairRegex.exec(inner)) !== null) {
      const label = stripTags(match[1]);
      const value = stripTags(match[2]);
      if (label && !results.some((item) => item.label === label)) {
        results.push({ label, value });
      }
    }
  }
  return results.slice(0, 6);
}

function sampleValueForField(field, slug) {
  if (field.value) return field.value;
  if (field.placeholder && !/enter value/i.test(field.placeholder)) {
    return field.placeholder.replace(/^e\.g\.,?\s*/i, "");
  }
  const label = field.label.toLowerCase();
  if (label.includes("age")) return "35";
  if (label.includes("rate") || label.includes("interest") || label.includes("apr") || label.includes("percentage")) return "6.5";
  if (label.includes("term") || label.includes("years")) return "30";
  if (label.includes("months")) return "60";
  if (label.includes("amount") || label.includes("price") || label.includes("cost") || label.includes("income") || label.includes("salary") || label.includes("budget")) return "2500";
  if (label.includes("weight")) return "180";
  if (label.includes("height")) return "70";
  if (label.includes("distance")) return "12";
  if (label.includes("time")) return "45";
  if (label.includes("gpa")) return "3.6";
  if (label.includes("grade")) return "88";
  if (label.includes("people")) return "4";
  if (slug.includes("converter")) return "10";
  return "100";
}

function formatInputPhrase(field) {
  const value = sampleValueForField(field, "");
  return `${field.label.toLowerCase()} of ${value}`;
}

function getPageName(content, fileName) {
  const fallback = slugToTitle(fileName);
  const raw = getFirstMatch(content, /<h1[^>]*>([\s\S]*?)<\/h1>/i, getFirstMatch(content, /<title[^>]*>([\s\S]*?)<\/title>/i, fallback));
  const cleaned = raw
    .replace(/\s*\|\s*Precision Finance.*$/i, "")
    .replace(/\s*\|\s*Utility Calculator Suite.*$/i, "")
    .trim();
  if (/^(free\s+)?calculator$/i.test(cleaned) || /^free\s+calculator$/i.test(cleaned) || cleaned.length < 4) {
    return fallback;
  }
  return cleaned;
}

function inferPurpose(title, slug, inputs, results, category) {
  const topicHint = findTopicHint(slug);
  const inputText = inputs.slice(0, 3).map((field) => field.label.toLowerCase()).join(", ");
  const resultText = results.slice(0, 3).map((item) => item.label.toLowerCase()).join(", ");
  const name = title.replace(/\s*\|.*$/, "").trim();
  if (topicHint) {
    return `${name} is a planning tool that helps you ${topicHint.definition}.`;
  }
  const concept = {
    financial: `estimate money decisions such as payments, balances, savings targets, or return trade-offs`,
    health: `translate body or fitness inputs into a practical health benchmark`,
    real_estate: `compare property costs, financing decisions, or home equity scenarios`,
    business: `test pricing, cash flow, margin, or planning assumptions before acting`,
    education: `plan school costs, grades, or study choices using clear inputs`,
    conversion: `convert one unit, ratio, or technical measurement into another format without manual math`,
    personal: `turn everyday planning details into a faster decision`,
    automotive: `estimate ownership cost, fuel use, or expense changes tied to transportation and household use`
  }[category];
  return `${name} is a planning tool that uses ${inputText || "a few simple inputs"} to ${resultText ? `show ${resultText}` : concept}.`;
}

function buildSectionOne(meta) {
  const intros = [
    `${meta.pageName} helps you turn raw numbers into a usable answer before you make a choice.`,
    `${meta.pageName} gives you a faster way to test assumptions without reaching for a spreadsheet.`,
    `${meta.pageName} is built for quick scenario planning when you need a number you can act on.`
  ];
  const opener = intros[hashIndex(meta.slug, intros.length)];
  const topicLine = meta.topicHint
    ? `${meta.pageName} is used to ${meta.topicHint.definition}.`
    : meta.purpose;
  const useCase = {
    financial: "Someone comparing offers, setting a budget, or checking the long-term cost of a decision can use it to spot trade-offs early.",
    health: "People often use this type of result to guide training, nutrition, or general health conversations, not to replace a clinician.",
    real_estate: "It is useful when you want to know whether a property decision still makes sense after taxes, fees, financing, or timing are added.",
    business: "Owners, operators, and solo professionals use calculations like this to pressure-test pricing and avoid guessing from gut feel alone.",
    education: "Students and families use it to plan ahead, compare options, and keep a school decision tied to real numbers.",
    conversion: "It is especially handy when you need a clean answer for shopping, engineering, cooking, travel, or device setup.",
    personal: "It works best when you want a quick answer that is more concrete than a rough mental estimate.",
    automotive: "It is practical for daily budgeting because small fuel, payment, or ownership changes add up over time."
  }[meta.category];
  return [
    `${opener} ${topicLine}`,
    `People usually need this calculation when the wrong estimate can lead to overspending, unrealistic expectations, or poor planning. By putting the key inputs in one place, the calculator lets you test a baseline case first and then adjust one variable at a time.`,
    `${useCase} In real life, that might mean entering ${meta.exampleInputsShort} so you can see ${meta.resultSummary}.`,
    `Used that way, the calculator becomes less about one isolated number and more about making the next step clearer.`
  ].join(" ");
}

function buildSectionTwo(meta) {
  const steps = meta.inputs.slice(0, 5).map((field, index) => {
    const hint = field.hint ? ` ${field.hint}` : "";
    return `<li>Enter <strong>${escapeHtml(field.label)}</strong>.${escapeHtml(hint)}</li>`;
  });
  if (!steps.length) {
    steps.push("<li>Enter the figures that best match your situation.</li>");
    steps.push("<li>Review each field before calculating so your estimate reflects the right assumptions.</li>");
    steps.push("<li>Run a second scenario with one change at a time to compare outcomes.</li>");
  }
  const intro = `Start with the values you already know, even if they are rough estimates. The best way to use ${meta.pageName} is to treat the first result as a baseline and then test a few realistic alternatives.`;
  return `${intro}<ol>${steps.join("")}</ol><p>After you calculate, compare the results to your budget, timeline, or goal instead of looking at the output in isolation. Small input changes can move the answer more than most people expect.</p>`;
}

function buildSectionThree(meta) {
  const guidance = {
    financial: "In money decisions, a better result is usually the one that lowers cost, improves cash flow, or reaches your goal with less risk, but context still matters.",
    health: "In health and fitness, the number is best used as a screening or planning marker. One result rarely tells the whole story, so trends and personal context matter.",
    real_estate: "For property decisions, the strongest result is not always the cheapest result. You also need to weigh timing, liquidity, maintenance, and how long you expect to stay put.",
    business: "In business planning, a good result is one that stays realistic after cost, timing, and execution risk are considered, not just one that looks attractive on paper.",
    education: "For school planning, the useful result is the one that helps you compare affordability, effort, and payoff in a way that fits your real options.",
    conversion: "For conversion tools, the key question is precision. The result is only as useful as the units and assumptions you entered.",
    personal: "For everyday planning, a good result is one that helps you make a cleaner decision without creating false confidence.",
    automotive: "For vehicle and utility expenses, the important part is how the result affects your monthly and yearly cash flow."
  }[meta.category];
  const resultLine = meta.results.length
    ? `On this page, pay closest attention to ${meta.results.slice(0, 3).map((item) => item.label).join(", ")}.`
    : `On this page, the result should be read as a planning estimate rather than a guarantee.`;
  return [
    resultLine,
    `A raw number only becomes useful when you connect it to a real decision. For example, if the calculator shows a result that strains your budget, delays your timeline, or pushes you outside a healthy range, that is a signal to test new inputs instead of forcing the first answer to work.`,
    meta.topicHint ? `${meta.topicHint.interpretation} ${guidance}` : guidance,
    `That is why it helps to compare at least two scenarios: a conservative case, a likely case, and an optimistic case. When the result stays reasonable across all three, you can trust it more.`
  ].join(" ");
}

function buildSectionFour(meta) {
  const resultBits = meta.results.slice(0, 3)
    .filter((item) => item.value && /[0-9A-Za-z$%]/.test(item.value) && !/^[—\-�\s]+$/.test(item.value))
    .map((item) => `${item.label.toLowerCase()} of ${item.value}`);
  const outputSentence = resultBits.length
    ? `With those inputs, the calculator reports ${resultBits.join(", ")}.`
    : `With those inputs, the calculator gives you a quick estimate that you can compare against your own target or limit.`;
  return [
    `Here is a realistic example. Suppose you enter ${meta.topicHint ? meta.topicHint.example : meta.exampleInputsLong}.`,
    outputSentence,
    `The practical takeaway is not just the number itself. It tells you whether the scenario is comfortably workable, borderline, or worth revising before you move forward. If the result looks too aggressive, try changing one input at a time until you find a version that fits your real situation.`
  ].join(" ");
}

function buildFaqs(meta) {
  const base = [
    {
      q: `What does the ${meta.pageName} actually estimate?`,
      a: `${meta.pageName} uses the inputs on this page to estimate ${meta.resultSummary}. It is meant to speed up planning and comparison, not to replace a lender quote, lab result, utility bill, or professional review. The value of the tool is that it helps you test assumptions quickly before you commit to a decision.`
    },
    {
      q: `Which inputs matter most on this calculator?`,
      a: `The biggest drivers are usually ${meta.inputs.slice(0, 3).map((field) => field.label.toLowerCase()).join(", ") || "the main figures you enter"}. If one of those values is off, the final estimate can move a lot. When you are unsure, run a low, middle, and high scenario so you can see which assumption changes the answer the most.`
    },
    {
      q: `How accurate are the results?`,
      a: `The math can be very useful, but accuracy still depends on the quality of your inputs and on whether the calculator matches your real-life situation. Fees, taxes, timing, rounding, behavior, and outside rules can all shift the final outcome. Treat the result as a planning benchmark, then confirm important decisions with a more detailed source.`
    },
    {
      q: `When should I recalculate?`,
      a: `Recalculate whenever one of the main assumptions changes. That could mean a new rate, different budget, updated goal, different body measurement, a change in schedule, or revised pricing. The best use of this page is ongoing comparison, because one stale input can quietly make an otherwise solid estimate much less useful.`
    },
    {
      q: `How should I use this result in a real decision?`,
      a: `Use the result to narrow your options, not to end the conversation. If the answer supports your budget, timeline, or target range, it can help you move to the next step with more confidence. If it does not, that is still valuable because it tells you what needs to change before the decision becomes workable.`
    }
  ];

  if (meta.category === "health") {
    base[2] = {
      q: `Does this result count as medical advice?`,
      a: `No. Health and fitness calculators are best treated as education and self-monitoring tools. They can highlight patterns, ranges, and useful questions, but they do not know your full medical history, medications, training background, or symptoms. If the result concerns you, use it as a reason to speak with a qualified healthcare professional.`
    };
  }

  if (meta.category === "conversion") {
    base[1] = {
      q: `Why do units and rounding matter so much here?`,
      a: `Conversions only help when the starting unit is correct. A small mismatch between gallons and liters, inches and centimeters, or watts and kilowatts can create a very different answer. For shopping or rough planning, light rounding is fine. For design, dosing, machining, or exact ordering, keep more decimal places and double-check the source unit.`
    };
  }

  return base;
}

function buildRelated(meta) {
  const relatedPool = CATEGORY_RELATED[meta.category] || CATEGORY_RELATED.financial;
  const filtered = relatedPool.filter((file) => file !== meta.fileName);
  return filtered.slice(0, 4).map((file) => {
    const label = slugToTitle(file);
    return {
      file,
      label,
      reason: meta.category === "conversion"
        ? `Useful when you need a second unit or measurement check alongside ${meta.pageName.toLowerCase()}.`
        : meta.category === "health"
          ? `Helpful for comparing another health or fitness input that affects the same decision.`
          : `Useful when you want to check the next number that usually goes with this calculation.`
    };
  });
}

function buildGuideHtml(meta) {
  const faqs = buildFaqs(meta);
  const related = buildRelated(meta);
  return `
<section class="educational-guide" id="guide" aria-labelledby="guide-title">
  <div class="edu-card">
    <h2 id="guide-title">Understand This ${escapeHtml(meta.pageName)}</h2>

    <section class="edu-block">
      <h3>What is the ${escapeHtml(meta.pageName)}?</h3>
      <p>${escapeHtml(buildSectionOne(meta))}</p>
    </section>

    <section class="edu-block">
      <h3>How to Use This ${escapeHtml(meta.pageName)}</h3>
      ${buildSectionTwo(meta)}
    </section>

    <section class="edu-block">
      <h3>Understanding Your Results</h3>
      <p>${escapeHtml(buildSectionThree(meta))}</p>
    </section>

    <section class="edu-block">
      <h3>Example Calculation</h3>
      <p>${escapeHtml(buildSectionFour(meta))}</p>
    </section>

    <section class="edu-block">
      <h3>Frequently Asked Questions</h3>
      <div class="edu-faq">
        ${faqs.map((faq) => `<details><summary>${escapeHtml(faq.q)}</summary><p>${escapeHtml(faq.a)}</p></details>`).join("")}
      </div>
    </section>

    <section class="edu-block">
      <h3>Related Calculators</h3>
      <ul class="edu-related">
        ${related.map((item) => `<li><a href="${escapeHtml(item.file)}">${escapeHtml(item.label)}</a> - ${escapeHtml(item.reason)}</li>`).join("")}
      </ul>
    </section>
  </div>
</section>`.trim();
}

function buildFaqSchema(meta) {
  const faqs = buildFaqs(meta);
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a
      }
    }))
  });
}

function ensureStyles(content) {
  if (content.includes("educational-guide")) {
    return content;
  }
  const styleBlock = `
  <style id="educational-guide-styles">
    .educational-guide { margin: 2rem auto 0; max-width: 1100px; }
    .edu-card { background: #ffffff; border: 1px solid #dbe3ef; border-radius: 18px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); }
    .edu-card h2 { margin: 0 0 1rem; font-size: 1.7rem; color: #0f172a; }
    .edu-block + .edu-block { margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #e2e8f0; }
    .edu-block h3 { margin: 0 0 0.75rem; font-size: 1.2rem; color: #0f172a; }
    .edu-block p, .edu-block li { color: #334155; line-height: 1.7; font-size: 1rem; }
    .edu-block ol, .edu-block ul { margin: 0.75rem 0 0; padding-left: 1.25rem; }
    .edu-faq details { border: 1px solid #dbe3ef; border-radius: 14px; padding: 0.9rem 1rem; background: #f8fbff; }
    .edu-faq details + details { margin-top: 0.75rem; }
    .edu-faq summary { cursor: pointer; font-weight: 700; color: #0f172a; }
    .edu-faq p { margin: 0.75rem 0 0; }
    .edu-related { list-style: disc; }
    .edu-related li + li { margin-top: 0.5rem; }
  </style>`;
  if (content.includes("</head>")) {
    return content.replace("</head>", `${styleBlock}\n</head>`);
  }
  return `${styleBlock}\n${content}`;
}

function replaceExistingGuide(content, newGuideHtml) {
  const legacyStackPattern = /<div class="related-calculators">[\s\S]*?<section class="faq-section">[\s\S]*?<\/section>/i;
  if (legacyStackPattern.test(content)) {
    return content.replace(legacyStackPattern, newGuideHtml);
  }
  const genericFaqPattern = /<section class="faq-section">[\s\S]*?<\/section>\s*(?:<div class="disclaimer">[\s\S]*?<\/div>)?/i;
  if (genericFaqPattern.test(content)) {
    return content.replace(genericFaqPattern, newGuideHtml);
  }
  const looseFaqPattern = /<h2>FAQ<\/h2>[\s\S]*?(?:<div class="disclaimer">[\s\S]*?<\/div>)?/i;
  if (looseFaqPattern.test(content)) {
    return content.replace(looseFaqPattern, newGuideHtml);
  }
  const layoutFaqPattern = /<section class="layout">\s*<section class="panel stack" id="faq"[\s\S]*?<\/aside>\s*<\/section>/i;
  if (layoutFaqPattern.test(content)) {
    return content.replace(layoutFaqPattern, newGuideHtml);
  }
  if (content.includes("</main>")) {
    return content.replace("</main>", `\n${newGuideHtml}\n</main>`);
  }
  if (content.includes("</body>")) {
    return content.replace("</body>", `\n${newGuideHtml}\n</body>`);
  }
  return `${content}\n${newGuideHtml}\n`;
}

function replaceFaqSchema(content, schemaJson) {
  const schemaTag = `<script type="application/ld+json">${schemaJson}</script>`;
  const faqSchemaPattern = /<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?"@type"\s*:\s*"FAQPage"[\s\S]*?<\/script>/i;
  if (faqSchemaPattern.test(content)) {
    return content.replace(faqSchemaPattern, schemaTag);
  }
  if (content.includes("</head>")) {
    return content.replace("</head>", `  ${schemaTag}\n</head>`);
  }
  return `${schemaTag}\n${content}`;
}

function normalizeGenericMetadata(content, meta) {
  const titleReplacement = `<title>${escapeHtml(meta.pageName)} | Precision Finance</title>`;
  if (/<title>\s*(?:Free\s+Calculator|Calculator)\s*\|\s*Precision Finance\s*<\/title>/i.test(content)) {
    content = content.replace(/<title>[\s\S]*?<\/title>/i, titleReplacement);
  }
  if (/<h1[^>]*>\s*(?:Free\s+Calculator|Calculator)\s*(?:\|\s*Precision Finance)?\s*<\/h1>/i.test(content)) {
    content = content.replace(/<h1[^>]*>[\s\S]*?<\/h1>/i, `<h1>${escapeHtml(meta.pageName)}</h1>`);
  }
  const genericDescription = /<meta\s+name="description"\s+content="([^"]*)"\s*\/?>/i;
  const descriptionText = `${meta.pageName} by Precision Finance. Learn what it measures, how to use it, and how to read the result with plain-language examples and FAQs.`;
  if (genericDescription.test(content)) {
    const match = content.match(genericDescription);
    if (match && (!match[1] || /free calculator|calculate quickly|result calculated/i.test(match[1]))) {
      content = content.replace(genericDescription, `<meta name="description" content="${escapeHtml(descriptionText)}">`);
    }
  } else if (content.includes("</head>")) {
    content = content.replace("</head>", `  <meta name="description" content="${escapeHtml(descriptionText)}">\n</head>`);
  }
  return content;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function buildMeta(content, fileName) {
  const slug = fileName.replace(/\.html$/i, "");
  const pageName = getPageName(content, fileName).replace(/\s*\|\s*Precision Finance.*$/i, "").trim();
  const inputs = extractInputs(content);
  const results = extractResults(content);
  const category = inferCategory(slug);
  const topicHint = findTopicHint(slug);
  const exampleInputFields = inputs.slice(0, Math.min(inputs.length, 4));
  const exampleInputsShort = exampleInputFields.map((field) => formatInputPhrase(field)).join(", ");
  const exampleInputsLong = exampleInputFields.map((field) => `${field.label.toLowerCase()} = ${sampleValueForField(field, slug)}`).join(", ");
  const resultSummary = results.length
    ? results.slice(0, 3).map((item) => item.label.toLowerCase()).join(", ")
    : topicHint ? topicHint.definition.replace(/^estimate\s+/i, "").replace(/^measure\s+/i, "") : "the key outcome on the page";
  const purpose = inferPurpose(pageName, slug, inputs, results, category);
  return {
    fileName,
    slug,
    pageName,
    inputs,
    results,
    category,
    topicHint,
    exampleInputsShort: exampleInputsShort || "a realistic starting scenario",
    exampleInputsLong: exampleInputsLong || "a realistic starting scenario",
    resultSummary,
    purpose
  };
}

function processFile(fileName) {
  const fullPath = path.join(ROOT, fileName);
  const original = fs.readFileSync(fullPath, "utf8");
  const meta = buildMeta(original, fileName);
  const guideHtml = buildGuideHtml(meta);
  const schemaJson = buildFaqSchema(meta);
  const combinedText = [
    buildSectionOne(meta),
    stripTags(buildSectionTwo(meta)),
    buildSectionThree(meta),
    buildSectionFour(meta),
    ...buildFaqs(meta).flatMap((faq) => [faq.q, faq.a])
  ].join(" ");
  if (wordCount(combinedText) < 700) {
    throw new Error(`Generated content for ${fileName} is below 700 words.`);
  }
  let updated = ensureStyles(original);
  updated = replaceFaqSchema(updated, schemaJson);
  updated = normalizeGenericMetadata(updated, meta);
  updated = replaceExistingGuide(updated, guideHtml);
  fs.writeFileSync(fullPath, updated, "utf8");
  return {
    fileName,
    pageName: meta.pageName,
    wordCount: wordCount(combinedText)
  };
}

function run() {
  const files = listTargetFiles();
  const results = [];
  for (const fileName of files) {
    results.push(processFile(fileName));
  }
  const report = {
    processed: results.length,
    files: results
  };
  const reportPath = path.join(ROOT, "content-generation-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ processed: results.length, first: results.slice(0, 5) }, null, 2));
}

run();
