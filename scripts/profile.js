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
        
        // console.log(data)
        // console.log(user)
        
    // getting final level of dude by filtering out piscine level ups
    const transactions = data.data.user[0].transactions;
    const filteredTransactions = transactions.filter(tx => {
        const segments = tx.path.split("/").filter(Boolean); // remove empty strings
        if (segments.length < 2) return false;
        const secondToLast = segments[segments.length - 2];
        return secondToLast === "div-01";
    });

// console.log(filteredTransactions);
userLogin.textContent = `Platform Username: ${user.login}`;
userFirstName.textContent = `First Name: ${user.firstName}`;
userLastName.textContent=`Last Name: ${user.lastName}`;
userEmail.textContent= `Email: ${user.email}`;
userAudit.textContent= `Audit Ratio: ${Math.round(user.auditRatio * 10) / 10}`;
userLevel.textContent = `Current User Level: ${filteredTransactions.length+1}`;

const CurrentExp = GetExp();
const sortedAudits = await loadAndCompare ();
const {totalUp,totalDown} = AuditNumbers(sortedAudits);

console.log(totalUp,totalDown)

userUp.textContent = `Up Ratio: ${totalUp}`;
userDown.textContent = `Down Ratio: ${totalDown}`;

userExp.textContent = `Total Experience: ${CurrentExp}`;

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



async function fetchCurrentUserDynamic() {
    const token = localStorage.getItem("jwt");
    if (!token) {
        console.error("No token found — please log in first.");
        return;
    }

    // Step 1: Introspect the 'user' type
    const introspectionQuery = `
    {
        __type(name: "user") {
            fields {
                name
                type {
                    kind
                    ofType {
                        kind
                    }
                }
            }
        }
    }`;

    let scalarFields = [];

    try {
        const introspectResp = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ query: introspectionQuery })
        }); // ✅ fetch fully closed here

        const introspectData = await introspectResp.json();

        if (introspectData.errors) {
            console.error("GraphQL Introspection Errors:", introspectData.errors);
            return;
        }

        // Filter only scalar fields
        scalarFields = introspectData.data.__type.fields
            .filter(f => {
                const kind = f.type.kind === "NON_NULL" ? f.type.ofType.kind : f.type.kind;
                return kind !== "OBJECT" && kind !== "LIST" && kind !== "INTERFACE";
            })
            .map(f => f.name);

        if (scalarFields.length === 0) {
            console.error("No scalar fields found for 'user'");
            return;
        }

    } catch (err) {
        console.error("Introspection fetch error:", err);
        return;
    }

    // Step 2: Build query with all scalar fields
    const fieldsString = scalarFields.join("\n        ");
    const userQuery = `
    {
        user {
            ${fieldsString}
        }
    }`;

    // Step 3: Fetch current user data
    try {
        const userResp = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ query: userQuery })
        }); // ✅ fetch fully closed here

        const userData = await userResp.json();

        if (userData.errors) {
            console.error("GraphQL Errors:", userData.errors);
            return;
        }

        // console.log("Current user data:", userData.data.user);

    } catch (err) {
        console.error("Fetch user error:", err);
    }
}

// Call the function
// fetchCurrentUserDynamic();


async function fetchCurrentUserEverything() {
    const token = localStorage.getItem("jwt");
    if (!token) {
        console.error("No token found — please log in first.");
        return;
    }

    // Step 1: Introspect scalar fields of 'user'
    const introspectionQuery = `
    {
        __type(name: "user") {
            fields {
                name
                type {
                    kind
                    ofType {
                        kind
                    }
                }
            }
        }
    }`;

    let scalarFields = [];

    try {
        const introspectResp = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ query: introspectionQuery })
        }); // ✅ fetch properly closed

        const introspectData = await introspectResp.json();

        if (introspectData.errors) {
            console.error("GraphQL Introspection Errors:", introspectData.errors);
            return;
        }

        // Keep only scalar fields
        scalarFields = introspectData.data.__type.fields
            .filter(f => {
                const kind = f.type.kind === "NON_NULL" ? f.type.ofType.kind : f.type.kind;
                return kind !== "OBJECT" && kind !== "LIST" && kind !== "INTERFACE";
            })
            .map(f => f.name);

        if (scalarFields.length === 0) {
            console.error("No scalar fields found for 'user'");
            return;
        }

    } catch (err) {
        console.error("Introspection fetch error:", err);
        return;
    }

    // Step 2: Build full query with relationships
    const fieldsString = scalarFields.join("\n        ");
    const fullQuery = `
    {
        user {
            ${fieldsString}
            transactions {
                id
                type
                amount
                objectId
                userId
                createdAt
                path
                object {
                    results {
                    userLogin
                        audits {
                            auditorLogin
                        }
                    }
                    type
                    name
                    id
                }
            }
            progresses {
                id
                userId
                objectId
                grade
                createdAt
                updatedAt
                path
                object {
                    id
                    name
                    type
                    attrs
                }
            }
            results {
                id
                objectId
                userId
                grade
                type
                createdAt
                updatedAt
                path
            }
            objects {
                id
                name
                type
                attrs
            }
        }
    }`;

    // Step 3: Fetch full user data
    try {
        const userResp = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ query: fullQuery })
        }); // ✅ fetch properly closed

        const userData = await userResp.json();

        if (userData.errors) {
            console.error("GraphQL Errors:", userData.errors);
            return;
        }

        console.log("Full user data:", userData.data.user);

    } catch (err) {
        console.error("Fetch user error:", err);
    }
}

// Call the function
fetchCurrentUserEverything();


// const userId = 3164; // get this from your current user

async function fetchProjectProgressesOnly() {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("jwt");
    if (!token) {
        console.error("No token found — please log in first.");
        return;
    }

    // Valid GraphQL query
    const query = `
   query($userId: Int!) {
        user(where: { id: { _eq: $userId } }) {
            progresses(
            where: { grade: { _is_null: false } }
            order_by: { createdAt: asc }
            ) {
                id
                grade
                path
                createdAt
                updatedAt
                object {
                    id
                    name
                    type
                    attrs
                     groups(where: { members: { userId: { _eq: $userId } } }) {
                        members {
                            userLogin
                        }
                    }
                }
            }
        }
    }`; // template literal closed

    try {
        const response = await fetch("/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // ✅ correct template literal
            },
           body: JSON.stringify({
                query,
                variables: { userId }, // ✅ pass variable value here
            }),
        }); // fetch fully closed

        const data = await response.json();

        if (data.errors) {
            console.error("GraphQL Errors:", data.errors);
            return;
        }


    // const user = data.data.user;

    // if (!user || !user.progresses) {
    // console.error("User or progresses not found", data);
    // return;
    // }
const user = data.data.user;

// If user is an array, take the first element
const currentUser = Array.isArray(user) ? user[0] : user;

if (!currentUser || !currentUser.progresses) {
    console.error("No progresses found for the current user", data);
} else {
    // Safe: optional chaining
    // currentUser.progresses.forEach((p, i) => {
    //     console.log(`Progress #${i}: id=${p.id}, objectType=${p.object?.type}`);
    // });

    const projectProgresses = currentUser.progresses.filter(
        p => p.object?.type?.toLowerCase() === "project"
    );

    // console.log("Project progresses:", projectProgresses);
        return projectProgresses;
}

    

    } catch (err) {
        console.error("Fetch error:", err);
    }
}

fetchProjectProgressesOnly();

// take object id from progresses.object and use that for transactions for "xp" to make first graph

// for audit ratio we use "up" and "down" first to test








///testing

// async function TestingShit() {
//  const token = localStorage.getItem("jwt");
// const query = `
// {
//   transactions(
//     where: {
//       objectId: { _eq: 101570 }
//       type: { _eq: "up" }
//     }
//   ) {
//     id
//     type
//     amount
//     path
//     createdAt
//     userId
//   }
// }
// `;

// const response = await fetch("/graphql", {
//     method: "POST",
//     headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${token}`,
//     },
//     body: JSON.stringify({ query }),
// });

// const data = await response.json();
// console.log(data.transactions);
// console.log(data)
// }

// TestingShit()


async function CheckingAudit() {
    const token = localStorage.getItem("jwt");
    const userInfo = document.getElementById("userInfo");

    if (!token) {
        window.location.href = "/";
        return;
    }

    try {
const query = `
        {
            user{
                    transactions(where: { type: { _in: [up, down] } }) {
                         type
                         amount
                         createdAt
                         object {
                             type
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
            body: JSON.stringify({ query }),
        });

        const data = await response.json();

        if (data.errors) {
            userLogin.textContent = "Error loading profile data.";
            console.error(data.errors);
            return;
        }

        const user = data.data.user[0];
        
        const transactions = user.transactions || [];

        // Calculate total based on type
        let totalUp = 0;
        let totalDown = 0;
        transactions.forEach(tx => {
            if (tx.type === "up") totalUp += tx.amount;
            else if (tx.type === "down") totalDown += tx.amount;
        });

        console.log("Up total:", totalUp.toFixed(2)); // formatted to 2 decimals
        console.log("Down total:", totalDown.toFixed(2)); // formatted to 2 decimals
        console.log("All transactions:", transactions);

        // console.log(data)
        // console.log("checking audit",user)

        
    } catch (err) {
        console.log("we f'd up")
        console.error(err);
    }
}

CheckingAudit();


// ensure a clean shape (call once at module start)
const auditRatioData = []; // array of transaction objects

async function AuditRatioGraph() {
    
    // ensureArrays(auditRatioData);

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
 
        let sumUp = 0 ;
        let sumDown = 0 ;

        transactionsAuditRatio.forEach(tx => {
            if (tx.type == "up") {
                sumUp += sumUp + tx.amount
            } else if (tx.type == "down") {
                sumDown += sumDown + tx.amount
            }
        });

        console.log("up",sumUp)
        console.log("down",sumDown)
        //populating
        transactionsAuditRatio.forEach(tx => {
            auditRatioData.push({
                type: tx.type,
                amount: tx.amount,
                project: tx.object?.name || null,
                date: tx.createdAt,
            });
        });

        console.log("✅ auditRatioData populated:", auditRatioData);


         } catch (err) {
        console.log("we f'd up")
        console.error(err);
    }
}

// AuditRatioGraph();

const userAudits = []; // array of transaction objects

async function AuditsGraph() {
    
    // ensureArrays(auditRatioData);

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

    //    const userAudits = dataAudits.data.user[0];
        
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

        // console.log("✅ userAudits populated:", userAudits);


         } catch (err) {
        console.log("we f'd up")
        console.error(err);
    }
}

// AuditsGraph();



// let userAuditsDone = false;
// let auditRatioDataDone = false;

// // Example usage:
// if (userAuditsDone && auditRatioDataDone) {
// const result = FindMatches(userAudits, auditRatioData);

// console.log("Audits without a matching XP entry:", result.auditsWithoutMatch);
// console.log("XP entries without a matching audit:", result.ratioWithoutMatch);
// }




function FindMatches(userAudits, auditRatioData) {
    
    // create sets of dates for easy lookup
    const auditDates = new Set(userAudits.map(a => normalizeDate(a.date)));
    const ratioDates = new Set(auditRatioData.map(a => normalizeDate(a.date)));

  // find items in userAudits that are NOT in auditRatioData
    const auditsWithoutMatch = userAudits.filter(a => !ratioDates.has(normalizeDate(a.date)));

    // find items in auditRatioData that are NOT in userAudits
    const ratioWithoutMatch = auditRatioData.filter(a => !auditDates.has(normalizeDate(a.date)));
    // console.log(auditDates)
    // console.log(ratioDates)
    return {
        auditsWithoutMatch,
        ratioWithoutMatch
    };

}



async function loadAndCompare() {
    await AuditRatioGraph();
    await AuditsGraph();

    

    // now both arrays are populated
    const result = FindMatches(userAudits, auditRatioData);
    console.log("Audits without a matching XP entry:", result.auditsWithoutMatch);
    console.log("XP entries without a matching audit:", result.ratioWithoutMatch);
    





    const sortedAudits = MergeMatches(userAudits, auditRatioData);
    console.log("lego", sortedAudits)
    const { maxAudit: HighestAuditAttained, minAudit: LowestAuditAttained } = FindMaxAudit(sortedAudits);
    console.log(HighestAuditAttained,LowestAuditAttained)
    console.log("best audit",HighestAuditAttained)
    const OldestDate = sortedAudits[0].date

    // Convert OldestDate to a Date object
    let paddedOldestDate = new Date(OldestDate);
    // Subtract one month
    paddedOldestDate.setMonth(paddedOldestDate.getMonth() - 1);
    // console.log("date check",OldestDate)

    DrawAuditGraphWithTooltip(sortedAudits, HighestAuditAttained,LowestAuditAttained, paddedOldestDate);

    CheckingAuditFinal(sortedAudits);
    // AuditRatioPsofa(auditRatioData);

    return sortedAudits
}

// call the async wrapper
// loadAndCompare();



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
                auditorLogin: ratio.type === "up" ? currentUsername : "Non-Believer",
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


function DrawAuditGraphWithTooltip(sortedAudits, HighestAuditAttained,LowestAuditAttained, OldestDate) {
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
    svg.setAttribute("width", graphWidth + padding * 2);
    svg.setAttribute("height", graphHeight + padding * 2);
const container = document.getElementById("auditGraphContainer");
container.innerHTML = ""; // clear previous graph
container.appendChild(svg);

    // Create tooltip div (hidden by default)
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

    // Convert dates to timestamps
    const oldestTime = new Date(OldestDate).getTime();
    const newestTime = new Date(sortedAudits[sortedAudits.length - 1].date).getTime();

    const getX = date => {
        const t = new Date(date).getTime();
        const normalized = (t - oldestTime) / (newestTime - oldestTime);
        return padding + normalized * graphWidth;
    };

    // ===== Y-axis min/max setup =====
    // minY: starting ratio for bottom of graph
    // maxY: top ratio for graph
    const ratios = sortedAudits.map(item => Number(item.currentRatio) || 0);
    const minY = Math.min(...ratios,LowestAuditAttained-0.05); // change this if you want a different min
    const maxY = Math.max(...ratios, HighestAuditAttained+0.05); // change this if needed
    console.log("minY:", minY, "maxY:", maxY); // debug

    const getY = ratio => {
        const normalized = (ratio - minY) / (maxY - minY); // normalize to 0..1
        return padding + graphHeight - normalized * graphHeight; // flip y-axis
    };
    // ================================

    // Draw axes
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

    // Draw polyline connecting points
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

    // Draw dots with tooltips
    sortedAudits.forEach(item => {
        const cx = getX(item.date);
        const cy = getY(Number(item.currentRatio) || 0);

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", 5);
        circle.setAttribute("fill", "red");
        svg.appendChild(circle);

        // Tooltip events
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

    console.log("SVG graph with tooltips drawn.");
}

async function CheckingAuditFinal(sortedAudits) {
   
        // Calculate total based on type
        let totalUp = 0;
        let totalDown = 0;
        sortedAudits.forEach(tx => {
            if (tx.ratioType === "up") totalUp += tx.ratioAmount;
            else if (tx.ratioType === "down") totalDown += tx.ratioAmount;
        });

        console.log("Up total:", totalUp.toFixed(2)); // formatted to 2 decimals
        console.log("Down total :", totalDown.toFixed(2)); // formatted to 2 decimals
        // console.log("All transactions:", transactions);

        // console.log(data)
        // console.log("checking audit",user)

        

}


async function AuditNumbers(sortedAudits) {
   
        // Calculate total based on type
        let totalUp = 0;
        let totalDown = 0;
        sortedAudits.forEach(tx => {
            if (tx.type === "up") totalUp += tx.amount;
            else if (tx.type === "down") totalDown += tx.amount;
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
        }));

        console.log("XP Data:", xpData);

        // You can also compute total XP if you want
        const xpSum = xpData.reduce((sum, tx) => sum + tx.amount, 0);
        console.log("Total XP:", xpSum);

        const totalXP = xpData.reduce((sum, tx) => sum + tx.amount, 0);
        DrawXPGraphWithTooltip(xpData, totalXP);

        userExp.textContent = `Total Experience: ${totalXP}`;

        return totalXP; // ⬅️ return for reuse in graph drawing

    } catch (err) {
        console.error(err);
    }
}

// const CurrentExp = GetExp();

// const xpData = await GetExp(); // from your earlier function


function DrawXPGraphWithTooltip(xpData, totalXP) {
    const padding = 60;
    const graphWidth = 800;
    const graphHeight = 700;

    // 🧹 Remove old SVG if exists
    const oldSvg = document.getElementById("xpGraphSvg");
    if (oldSvg) oldSvg.remove();

    // 🖼️ Create SVG
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "xpGraphSvg");
    svg.setAttribute("width", graphWidth + padding * 2);
    svg.setAttribute("height", graphHeight + padding * 2);
   const container = document.getElementById("xpGraphContainer");
container.innerHTML = ""; // clear previous graph
container.appendChild(svg);

    // 💬 Tooltip setup
    let tooltip = document.getElementById("xpTooltip");
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = "xpTooltip";
        tooltip.style.position = "absolute";
        tooltip.style.padding = "8px";
        tooltip.style.background = "rgba(0,0,0,0.8)";
        tooltip.style.color = "white";
        tooltip.style.borderRadius = "4px";
        tooltip.style.pointerEvents = "none";
        tooltip.style.display = "none";
        document.body.appendChild(tooltip);
    }

    // 🕓 Define X-axis time range
    const oldestDate = new Date(xpData[0].date);
    const newestDate = new Date(); // today
    const oldestTime = oldestDate.getTime();
    const newestTime = newestDate.getTime();

    // 🧭 Scale functions
    const getX = date => {
        const t = new Date(date).getTime();
        const normalized = (t - oldestTime) / (newestTime - oldestTime);
        return padding + normalized * graphWidth;
    };

    const getY = amount => {
        return padding + graphHeight - (amount / totalXP) * graphHeight;
    };

    // 🧱 Draw axes
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

    // 🏷️ Axis labels
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
    yLabel.textContent = "XP Gained";
    svg.appendChild(yLabel);

    // 📈 Draw line connecting XP points
    let cumulativeXP = 0;
    const pointsArray = xpData.map(item => {
        cumulativeXP += item.amount;
        return `${getX(item.date)},${getY(cumulativeXP)}`;
    });

    const polyline = document.createElementNS(svgNS, "polyline");
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "green");
    polyline.setAttribute("stroke-width", "2");
    polyline.setAttribute("points", pointsArray.join(" "));
    svg.appendChild(polyline);

    // 🔴 Draw dots with tooltips
    cumulativeXP = 0;
    xpData.forEach(item => {
        cumulativeXP += item.amount;
        const cx = getX(item.date);
        const cy = getY(cumulativeXP);

        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", cx);
        circle.setAttribute("cy", cy);
        circle.setAttribute("r", 5);
        circle.setAttribute("fill", "orange");
        svg.appendChild(circle);

        // Tooltip events
        circle.addEventListener("mouseenter", e => {
            tooltip.style.display = "block";
            const formattedDate = new Date(item.date).toLocaleDateString();
            tooltip.innerHTML = `
                <strong>Date:</strong> ${formattedDate}<br>
                <strong>Project:</strong> ${item.name || "N/A"}<br>
                <strong>Type:</strong> ${item.type || "N/A"}<br>
                <strong>XP Gained:</strong> ${item.amount}<br>
                <strong>Total XP so far:</strong> ${Math.round(cumulativeXP)}
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

    console.log("✅ XP Graph drawn.");
}
