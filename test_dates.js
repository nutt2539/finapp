const now = new Date("2026-07-17T07:00:00+07:00");
const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), 1);
console.log("Current Month Start:", currentMonthStart);
console.log("Next Year:", nextYear);

const expectedIncomes = [
    { date: "2026-07", amount: "1200" },
    { date: "2026-08", amount: "2400" },
    { date: "2025-06", amount: "5000" }, // past
    { date: "2027-08", amount: "5000" }  // future
];

let sumExtraIncomes = 0;
expectedIncomes.forEach(inc => {
    const parts = inc.date.split('-');
    if (parts.length === 2) {
        const incDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        console.log("IncDate:", incDate, " >= ", currentMonthStart, ":", incDate >= currentMonthStart, " <= ", nextYear, ":", incDate <= nextYear);
        if (incDate >= currentMonthStart && incDate <= nextYear) {
            sumExtraIncomes += parseFloat(inc.amount) || 0;
        }
    }
});
console.log("Sum:", sumExtraIncomes);
console.log("Monthly Boost:", sumExtraIncomes / 12);
