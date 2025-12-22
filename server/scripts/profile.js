import { DrawXPGraphWithTooltip, DrawAuditGraphWithTooltip } from "./DrawGraphs.js";
import { FormatSize, AuditNumbers, FindMaxAudit, MergeMatches } from "./utils.js";

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
        
    // getting final level of dude by filtering out piscine level ups
    const transactions = data.data.user[0].transactions;
    const filteredTransactions = transactions.filter(tx => {
        const segments = tx.path.split("/").filter(Boolean); // remove empty strings
        if (segments.length < 2) return false;
        const secondToLast = segments[segments.length - 2];
        return secondToLast === "div-01";
    });

userLogin.textContent = `${user.login}`;
userFirstName.textContent = `${user.firstName}`;
userLastName.textContent=`${user.lastName}`;
userEmail.textContent= `${user.email}`;
userAudit.textContent= `${Math.round(user.auditRatio * 10) / 10}`;
userLevel.textContent = `${filteredTransactions[filteredTransactions.length-1].amount}`;

GetExp();
const sortedAudits = await loadAndCompare ();
const {totalUp,totalDown} =await AuditNumbers(sortedAudits);

userUp.textContent = `Up Ratio: ${FormatSize(totalUp)}`;
userDown.textContent = `Down Ratio: ${FormatSize(totalDown)}`;

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

        // You can also compute total XP if you want
        const totalXP = xpData.reduce((sum, tx) => sum + tx.amount, 0);
        xpData.sort((a, b) => new Date(a.date) - new Date(b.date));
        DrawXPGraphWithTooltip(xpData, totalXP);

        userExp.textContent = `${FormatSize(totalXP)}`;

        return totalXP; // ⬅️ return for reuse in graph drawing

    } catch (err) {
        console.error(err);
    }
}