export function FormatSize(numStr) {
    const num = typeof numStr === "number" ? numStr : parseFloat(numStr);
    if (isNaN(num)) return null;

    const units = ["", "kb", "mb", "gb", "tb", "pb"];
    let size = num;
    let index = 0;

    while (size >= 1000 && index < units.length - 1) {
        size = size / 1000;
        index++;
    }

    // Round UP to nearest integer
    const rounded = Math.round(size);

    return `${rounded}${units[index]}`;
}

export function normalizeDate(dateString) {
    const d = new Date(dateString);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    const seconds = String(d.getUTCSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}


export function AuditNumbers(sortedAudits) {

    // Calculate total based on type
    let totalUp = 0;
    let totalDown = 0;
    sortedAudits.forEach(tx => {
        const t = tx.ratioType;   // <-- use ratioType

        if (t === "up") totalUp += tx.ratioAmount;
        else if (t === "down") {
            if ((tx.auditType !== "Cannot be recovered") || (tx.auditType === "Cannot be recovered" && tx.auditorLogin === tx.auditMembers)) {
                totalDown += tx.ratioAmount;
            }
        }
    });

    return { totalUp, totalDown }
}

export function FindMaxAudit(sortedAudits) {
    let startingUp = 100000;
    let startingDown = 100000;
    let maxAudit = 0;
    let minAudit = 5;


    sortedAudits.forEach(item => {
        if (item.ratioType === "up") {
            startingUp += item.ratioAmount;
        } else if (item.ratioType === "down") {
            startingDown += item.ratioAmount;
        }


        const currentRatio = startingUp / startingDown;

        // store current ratio inside the item
        item.currentRatio = Number(currentRatio.toFixed(2));

        if (minAudit > startingUp / startingDown) {
            minAudit = startingUp / startingDown
        }

        if (maxAudit < startingUp / startingDown) {
            maxAudit = startingUp / startingDown
        }
    });

    return { maxAudit, minAudit }; // ✅ return both as an object
}


export function MergeMatches(userAudits, auditRatioData) {
    const currentUsername = localStorage.getItem("loggedInUsername");
    // Normalize dates
    const normalize = a => ({ ...a, date: normalizeDate(a.date) });
    const audits = userAudits.map(normalize);
    const ratios = auditRatioData.map(normalize);

    const merged = [];

    ratios.forEach(ratio => {
        // Find all audits matching this ratio's date
        const matchingAudits = audits.filter(audit => audit.date === ratio.date);

        if (matchingAudits.length > 0) {
            matchingAudits.forEach(audit => {
                merged.push({
                    date: ratio.date,
                    auditType: audit.type,
                    auditorLogin: audit.auditorLogin,
                    auditProject: audit.project,
                    auditMembers: audit.members,
                    ratioType: ratio.type,
                    ratioAmount: ratio.amount,
                    ratioProject: ratio.project
                });
            });
            // Remove matched audits so they are not reused
            matchingAudits.forEach(audit => {
                const index = audits.indexOf(audit);
                if (index > -1) audits.splice(index, 1);
            });
        } else {
            // No audit matches this ratio
            merged.push({
                date: ratio.date,
                auditType: "Cannot be recovered",
                auditorLogin: ratio.type === "up" ? currentUsername : currentUsername,
                auditProject: ratio.project,
                auditMembers: ratio.type === "down" ? currentUsername : "Non-Believer",
                ratioType: ratio.type,
                ratioAmount: ratio.amount,
                ratioProject: ratio.project
            });
        }



    });

    merged.sort((a, b) => new Date(a.date) - new Date(b.date));


    return merged;
}