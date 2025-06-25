let leaderLines = [];

document.getElementById("generate-btn").addEventListener("click", async () => {
  const goal = document.getElementById("goal-input").value.trim();
  if (!goal) {
    alert("Please enter a goal.");
    return;
  }

  // Swap screens + placeholder
  document.getElementById("home-screen").style.display = "none";
  document.getElementById("roadmap-screen").style.display = "block";
  document.getElementById(
    "container"
  ).innerHTML = `<p>Generating roadmap for: <strong>${goal}</strong>...</p>`;

  try {
    // 🔑 Call your Vercel serverless function (no API key in browser)
    const response = await fetch("/api/generate-roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    if (!response.ok) throw new Error(await response.text());

    const { roadmap } = await response.json();

    // --- Build nodes from numbered list ---
    const steps = roadmap.match(/\d+\..+?(?=\n\d+\.|\n*$)/gs) || [];
    const container = document.getElementById("container");
    container.innerHTML = "";

    steps.forEach((step) => {
      const node = document.createElement("div");
      node.className = "node";
      node.style.marginBottom = "40px";
      node.innerText = step;

      node.addEventListener("click", () => node.classList.toggle("completed"));
      container.appendChild(node);
    });

    // --- Draw LeaderLines between nodes ---
    const nodes = document.querySelectorAll(".node");
    nodes.forEach((node, idx) => {
      if (idx < nodes.length - 1) {
        const line = new LeaderLine(node, nodes[idx + 1], {
          color: "white",
          size: 2,
          path: "straight",
          startPlug: "behind",
          endPlug: "arrow1",
        });
        leaderLines.push(line);
      }
    });
  } catch (err) {
    console.error("Error generating roadmap:", err);
    document.getElementById("container").innerHTML =
      "<p>Something went wrong. Please try again.</p>";
  }
});

// ⬅️ Back button – reset everything
document.getElementById("back-btn").addEventListener("click", () => {
  leaderLines.forEach((line) => line.remove());
  leaderLines = [];

  document.getElementById("container").innerHTML = "";
  document.getElementById("roadmap-screen").style.display = "none";
  document.getElementById("home-screen").style.display = "block";
});
