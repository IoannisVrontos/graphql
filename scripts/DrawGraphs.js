import { FormatSize } from "./utils.js";

export function DrawXPGraphWithTooltip(xpData, totalXP) {
    const padding = 60;
    const graphWidth = 800;
    const graphHeight = 700;

    // Remove old SVG if exists
    const oldSvg = document.getElementById("xpGraphSvg");
    if (oldSvg) oldSvg.remove();

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("id", "xpGraphSvg");

    // ✅ Make SVG responsive using viewBox
    svg.setAttribute("viewBox", `0 0 ${graphWidth + padding * 2} ${graphHeight + padding * 2}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");

    const container = document.getElementById("xpGraphContainer");
    container.innerHTML = ""; // clear previous graph
    container.appendChild(svg);

    // Tooltip setup
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

    // X-axis scale
    const oldestDate = new Date(xpData[0].date);
    const newestDate = new Date();
    const oldestTime = oldestDate.getTime();
    const newestTime = newestDate.getTime();

    const getX = date => {
        const t = new Date(date).getTime();
        const normalized = (t - oldestTime) / (newestTime - oldestTime);
        return padding + normalized * graphWidth;
    };

    const getY = amount => {
        return padding + graphHeight - (amount / totalXP) * graphHeight;
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
    yLabel.textContent = "XP Gained";
    svg.appendChild(yLabel);

    // Polyline
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

    // Dots with tooltip
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

        circle.addEventListener("mouseenter", e => {
            tooltip.style.display = "block";
            tooltip.innerHTML = `
                <strong>Date:</strong> ${new Date(item.date).toLocaleDateString()}<br>
                <strong>Project:</strong> ${item.name || "N/A"}<br>
                <strong>Type:</strong> ${item.type || "N/A"}<br>
                <strong>XP Gained:</strong> ${FormatSize(item.amount)}<br>
                <strong>Total XP so far:</strong> ${FormatSize(item.cumXP)}
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
                <strong>${item.ratioType === "up" ? "Gained Ratio" : "Lost Ratio"}:</strong> ${FormatSize(item.ratioAmount) || 0}<br>
                <strong>Current Ratio:</strong> ${item.currentRatio}<br>
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