import { DrawXPGraphWithTooltip } from "./DrawGraphs.js";

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("jwt");
    const userInfo = document.getElementById("userInfo");

    if (!token) {
        window.location.href = "/";
        return;
    }

    try {
const query = `
{
  user {
    id
    login
    auditRatio
    firstName
    lastName
    email
    xps(where: { event: { object: { type: { _eq: "module" } } } }) {
      path
      amount
      event {
        createdAt
        endAt
        processedAt
        startAt
        path
        object {
          id
          name
          type
        }
      }
    }
        transactions(where: { type: { _eq: "level" } }) {
                type
                amount 
                path
            }
  }
}`; // ✅ properly closed


        const response = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();

        if (data.errors) {
            userLogin.textContent = "Error loading profile data.";
            console.error(data.errors);
            return;
        }

        const user = data.data.user[0];
        localStorage.setItem("userId", user.id);
        
        console.log(data)
        // console.log(user)
        
        
    // getting final level of dude by filtering out piscine level ups
    const transactions = data.data.user[0].transactions;
    const filteredTransactions = transactions.filter(tx => {
        const segments = tx.path.split("/").filter(Boolean); // remove empty strings
        if (segments.length < 2) return false;
        const secondToLast = segments[segments.length - 2];
        return secondToLast === "div-01";
    });

    console.log(filteredTransactions)

// console.log(filteredTransactions);
userLogin.textContent = `Platform Username: ${user.login}`;
userFirstName.textContent = `First Name: ${user.firstName}`;
userLastName.textContent=`Last Name: ${user.lastName}`;
userEmail.textContent= `Email: ${user.email}`;
userAudit.textContent= `Audit Ratio: ${Math.round(user.auditRatio * 10) / 10}`;
userLevel.textContent = `Current User Level: ${filteredTransactions[filteredTransactions.length-1].amount}`;

GetExp();
const sortedAudits = await loadAndCompare ();
const {totalUp,totalDown} =await AuditNumbers(sortedAudits);

console.log(totalUp,totalDown)

userUp.textContent = `Up Ratio: ${totalUp}`;
userDown.textContent = `Down Ratio: ${totalDown}`;

localStorage.setItem("loggedInUsername", user.login);

    } catch (err) {
        // userInfo.textContent = "Failed to load user data.";
        console.error(err);
    }

    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("jwt");
        window.location.href = "/";
    });
});

// ensure a clean shape (call once at module start)
const auditRatioData = []; // array of transaction objects

async function AuditRatioGraph() {
    
    // fetch token from local storage to make sure user is logged in
    const token = localStorage.getItem("jwt");

    // if he aint logged in throw him back to log in screen
     if (!token) {
        window.location.href = "/";
        return;
    }

    try {
    const AuditRatioQuery = `
        {
            user{
                    transactions(where: { type: { _in: [up, down] } }) {
                         type
                         amount
                         createdAt
                         object {
                            name
                         }   
                    }
            }
        }`; // ✅ properly closed


        const response = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ query: AuditRatioQuery }),
        });

        const dataAuditRatio = await response.json();

        if (dataAuditRatio.errors) {
            userLogin.textContent = "Error loading profile data.";
            console.error(dataAuditRatio.errors);
            return;
        }

        const userAuditRatio = dataAuditRatio.data.user[0];
        
        const transactionsAuditRatio = userAuditRatio.transactions || [];

        //populating
        transactionsAuditRatio.forEach(tx => {
            auditRatioData.push({
                type: tx.type,
                amount: tx.amount,
                project: tx.object?.name || null,
                date: tx.createdAt,
            });
        });

        // console.log("✅ auditRatioData populated:", auditRatioData);


         } catch (err) {
        console.log("we f'd up")
        console.error(err);
    }
}


const userAudits = []; // array of transaction objects

async function AuditsGraph() {
    

    // fetch token from local storage to make sure user is logged in
    const token = localStorage.getItem("jwt");

    // if he aint logged in throw him back to log in screen
     if (!token) {
        window.location.href = "/";
        return;
    }

    try {
    const AuditsQuery = `
            {
                audit(
                    where: { closureType: { _in: [succeeded, failed] } }
                    order_by: { closedAt: asc } 
                ){
                    closedAt
                    auditorLogin
                    closureType
                    group {
                        path
                        members {
                          userLogin
                        }
                    }
                }
            }`; // ✅ properly closed


        const response = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ query: AuditsQuery }),
        });

        const dataAudits = await response.json();

        if (dataAudits.errors) {
            // userLogin.textContent = "Error loading profile data.";
            console.error(dataAudits.errors);
            return;
        }

        
       const audits = dataAudits.data.audit || [];
 

        audits.forEach(a => {
            // extract just the last part of the path
            const pathSegments = a.group.path.split("/").filter(Boolean);
            const lastSegment = pathSegments[pathSegments.length - 1] || null;

            // collect userLogins (may be multiple)
            const memberLogins = (a.group.members || []).map(m => m.userLogin);

            // push processed audit
            userAudits.push({
                type: a.closureType,   // string
                date: a.closedAt,         // date string
                auditorLogin: a.auditorLogin, // string
                project: lastSegment,         // last part of path
                members: memberLogins          // array of strings
            });
        });


         } catch (err) {
        console.log("we f'd up")
        console.error(err);
    }
}


async function loadAndCompare() {
    await AuditRatioGraph();
    await AuditsGraph();
    
    const sortedAudits = MergeMatches(userAudits, auditRatioData);
    const { maxAudit: HighestAuditAttained, minAudit: LowestAuditAttained } = FindMaxAudit(sortedAudits);
    const OldestDate = sortedAudits[0].date
    // Convert OldestDate to a Date object
    let paddedOldestDate = new Date(OldestDate);
    // Subtract one month
    paddedOldestDate.setMonth(paddedOldestDate.getMonth() - 1);

    DrawAuditGraphWithTooltip(sortedAudits, HighestAuditAttained,LowestAuditAttained, paddedOldestDate);

    return sortedAudits
}


function normalizeDate(dateString) {
    const d = new Date(dateString);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const hours = String(d.getUTCHours()).padStart(2, "0");
    const minutes = String(d.getUTCMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}



function MergeMatches(userAudits, auditRatioData) {
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
                auditorLogin: ratio.type === "up" ? currentUsername :currentUsername,
                auditProject: ratio.project,
                auditMembers: ratio.type === "down" ? currentUsername : "Non-Believer",
                ratioType: ratio.type,
                ratioAmount: ratio.amount,
                ratioProject: ratio.project
            });
        }
    });

    // Sort by date ascending
    merged.sort((a, b) => new Date(a.date) - new Date(b.date));

    return merged;
}

function FindMaxAudit (sortedAudits) {
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

        if (minAudit > startingUp/startingDown) {
            minAudit = startingUp/startingDown
        }

        if (maxAudit < startingUp/startingDown) {
            maxAudit = startingUp/startingDown
        } 
    });
    
    console.log("max",maxAudit)
    console.log("min",minAudit)
    return { maxAudit, minAudit }; // ✅ return both as an object
}

export function DrawAuditGraphWithTooltip(sortedAudits, HighestAuditAttained, LowestAuditAttained, OldestDate) {
    const padding = 60;
    const graphWidth = 800;
    const graphHeight = 700;

    // Remove old SVG if exists
    const oldSvg = document.getElementById("auditGraphSvg");
    if (oldSvg) oldSvg.remove();

    // Create SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "auditGraphSvg");

    // ✅ Make SVG responsive
    svg.setAttribute("viewBox", `0 0 ${graphWidth + padding * 2} ${graphHeight + padding * 2}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");

    const container = document.getElementById("auditGraphContainer");
    container.innerHTML = ""; // clear previous graph
    container.appendChild(svg);

    // Tooltip setup
    let tooltip = document.getElementById("auditTooltip");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "auditTooltip";
        tooltip.style.position = "absolute";
        tooltip.style.padding = "8px";
        tooltip.style.background = "rgba(0,0,0,0.8)";
        tooltip.style.color = "white";
        tooltip.style.borderRadius = "4px";
        tooltip.style.pointerEvents = "none";
        tooltip.style.display = "none";
        document.body.appendChild(tooltip);
    }

    // X-axis scaling
    const oldestTime = new Date(OldestDate).getTime();
    const newestTime = new Date(sortedAudits[sortedAudits.length - 1].date).getTime();
    const getX = date => {
        const t = new Date(date).getTime();
        const normalized = (t - oldestTime) / (newestTime - oldestTime);
        return padding + normalized * graphWidth;
    };

    // Y-axis scaling
    const ratios = sortedAudits.map(item => Number(item.currentRatio) || 0);
    const minY = Math.min(...ratios, LowestAuditAttained - 0.05);
    const maxY = Math.max(...ratios, HighestAuditAttained + 0.05);
    const getY = ratio => {
        const normalized = (ratio - minY) / (maxY - minY);
        return padding + graphHeight - normalized * graphHeight;
    };

    // Axes
    const xAxis = document.createElementNS(svgNS, "line");
    xAxis.setAttribute("x1", padding);
    xAxis.setAttribute("y1", padding + graphHeight);
    xAxis.setAttribute("x2", padding + graphWidth);
    xAxis.setAttribute("y2", padding + graphHeight);
    xAxis.setAttribute("stroke", "black");
    svg.appendChild(xAxis);

    const yAxis = document.createElementNS(svgNS, "line");
    yAxis.setAttribute("x1", padding);
    yAxis.setAttribute("y1", padding);
    yAxis.setAttribute("x2", padding);
    yAxis.setAttribute("y2", padding + graphHeight);
    yAxis.setAttribute("stroke", "black");
    svg.appendChild(yAxis);

    // Axis labels
    const xLabel = document.createElementNS(svgNS, "text");
    xLabel.setAttribute("x", padding + graphWidth / 2);
    xLabel.setAttribute("y", padding + graphHeight + 40);
    xLabel.setAttribute("text-anchor", "middle");
    xLabel.textContent = "Time";
    svg.appendChild(xLabel);

    const yLabel = document.createElementNS(svgNS, "text");
    yLabel.setAttribute("x", padding - 40);
    yLabel.setAttribute("y", padding + graphHeight / 2);
    yLabel.setAttribute("text-anchor", "middle");
    yLabel.setAttribute("transform", `rotate(-90 ${padding - 40},${padding + graphHeight / 2})`);
    yLabel.textContent = "Audit Ratio";
    svg.appendChild(yLabel);

    // Polyline
    const polyline = document.createElementNS(svgNS, "polyline");
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "blue");
    polyline.setAttribute("stroke-width", "2");
    const pointsArray = sortedAudits.map(item => {
        const ratio = Number(item.currentRatio) || 0;
        return `${getX(item.date)},${getY(ratio)}`;
    });
    polyline.setAttribute("points", pointsArray.join(" "));
    svg.appendChild(polyline);

    // Dots with tooltips
    sortedAudits.forEach(item => {
        const cx = getX(item.date);
        const cy = getY(Number(item.currentRatio) || 0);

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", 5);
        circle.setAttribute("fill", "red");
        svg.appendChild(circle);

        circle.addEventListener("mouseenter", e => {
            tooltip.style.display = "block";
            const formattedDate = new Date(item.date).toLocaleDateString();
            const members = Array.isArray(item.auditMembers)
                ? item.auditMembers
                : item.auditMembers
                ? [item.auditMembers]
                : [];
            tooltip.innerHTML = `
                <strong>Date:</strong> ${formattedDate}<br>
                <strong>Auditor:</strong> ${item.auditorLogin || "N/A"}<br>
                <strong>Project:</strong> ${item.auditProject || "N/A"}<br>
                <strong>Members:</strong> ${members.join(", ") || "N/A"}<br>
                <strong>${item.ratioType === "up" ? "Gained Ratio" : "Lost Ratio"}:</strong> ${item.ratioAmount || 0}<br>
                <strong>Current Ratio:</strong> ${item.currentRatio}<br>
                <strong>Project Name:</strong> ${item.ratioProject || "N/A"}
            `;
        });

        circle.addEventListener("mousemove", e => {
            tooltip.style.left = e.pageX + 10 + "px";
            tooltip.style.top = e.pageY + 10 + "px";
        });

        circle.addEventListener("mouseleave", () => {
            tooltip.style.display = "none";
        });
    });

    console.log("✅ Audit Graph drawn.");
}


function AuditNumbers(sortedAudits) {
   
console.log(sortedAudits)


    sortedAudits.forEach(tx => {
        const h = tx.ratioType;  
        // if (h=="down") {
        //     console.log(tx.auditProject)
        //     console.log(tx.auditType)
        //     console.log(tx.ratioAmount)
        //     console.log(tx.auditType0)
        // }
     } // <-- use ratioType
    );
    console.log("sortedAudits received:", sortedAudits);
        // Calculate total based on type
        let totalUp = 0;
        let totalDown = 0;
         sortedAudits.forEach(tx => {
        const t = tx.ratioType;   // <-- use ratioType

        if (t === "up") totalUp += tx.ratioAmount;
        else if (t === "down") {
            if ((tx.auditType !== "Cannot be recovered") || (tx.auditType === "Cannot be recovered" && tx.auditorLogin === tx.auditMembers)){
            totalDown += tx.ratioAmount;
        }
        }
    });

        console.log("Up total roufa:", totalUp.toFixed(2)); // formatted to 2 decimals
        console.log("Down total roufa:", totalDown.toFixed(2)); // formatted to 2 decimals
        // console.log("All transactions:", transactions);

        // console.log(data)
        // console.log("checking audit",user)

        
        return {totalUp, totalDown}

}





async function GetExp() {
    const token = localStorage.getItem("jwt");
    if (!token) {
        window.location.href = "/";
        return;
    }

    const query = `
    {
      user {
        transactions(
          where: {
            _and: [
              { type: { _eq: "xp" } },
              {
                _or: [
                  { object: { type: { _eq: "project" } } },
                  { object: { type: { _eq: "piscine" } } },
                   { object: { type: { _eq: "module" } } },
                  {
                    _and: [
                      { object: { type: { _eq: "exercise" } } },
                      { path: { _ilike: "%checkpoint%" } }
                    ]
                  }
                ]
              }
            ]
          }
        ) {
          amount
          createdAt
          object {
            type
            name
          }
        }
      }
    }`;

    try {
        const response = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ query }),
        });

        const data = await response.json();
        if (data.errors) {
            console.error(data.errors);
            return;
        }

        const transactions = data.data.user[0].transactions;

        // ✅ Store relevant data in an array
        const xpData = transactions.map(tx => ({
            amount: tx.amount,          // rounded XP
            date: tx.createdAt,                     // ISO timestamp
            type: tx.object?.type || "unknown",     // object type
            name: tx.object?.name || "unknown",     // project/exercise/piscine name
            cumXP : 0,
        }));

        let tempXP = 0;
        xpData.forEach(tx => {
            tempXP = tempXP + tx.amount
            tx.cumXP = tempXP
        })
        console.log("XP Data:", xpData);

        // You can also compute total XP if you want
        const xpSum = xpData.reduce((sum, tx) => sum + tx.amount, 0);
        console.log("Total XP:", xpSum);

        const totalXP = xpData.reduce((sum, tx) => sum + tx.amount, 0);
        xpData.sort((a, b) => new Date(a.date) - new Date(b.date));
        DrawXPGraphWithTooltip(xpData, totalXP);

        userExp.textContent = `Total Experience: ${totalXP}`;

        return totalXP; // ⬅️ return for reuse in graph drawing

    } catch (err) {
        console.error(err);
    }
}

// const CurrentExp = GetExp();

// const xpData = await GetExp(); // from your earlier function

