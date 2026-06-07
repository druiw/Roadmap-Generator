const goalInput = document.getElementById("goal-input");
const generateBtn = document.getElementById("generate-btn");
const errorMsg = document.getElementById("error-msg");
const container = document.getElementById("container");
const homeScreen = document.getElementById("home-screen");
const roadmapScreen = document.getElementById("roadmap-screen");
const backBtn = document.getElementById("back-btn");

let leaderLines = [];

function clearLines() {
  leaderLines.forEach((line) => line.remove());
  leaderLines = [];
}

function drawLines() {
  clearLines();
  const nodes = container.querySelectorAll(".node");
  nodes.forEach((node, idx) => {
    if (idx < nodes.length - 1) {
      const line = new LeaderLine(node, nodes[idx + 1], {
        color: "#6c8cff",
        size: 2,
        path: "straight",
        startPlug: "behind",
        endPlug: "arrow1",
      });
      leaderLines.push(line);
    }
  });
}

// Keep the connector lines aligned when the window is resized.
window.addEventListener("resize", () => {
  if (leaderLines.length) drawLines();
});

async function generateRoadmap() {
  const goal = goalInput.value.trim();
  errorMsg.textContent = "";

  if (!goal) {
    errorMsg.textContent = "Please enter something you'd like to learn.";
    goalInput.focus();
    return;
  }

  // Swap screens + show a loading placeholder.
  homeScreen.style.display = "none";
  roadmapScreen.style.display = "block";
  container.innerHTML = `<p class="loading">Generating roadmap for "${goal}"…</p>`;

  try {
    const response = await fetch("/api/generate-roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    if (!response.ok) throw new Error(await response.text());

    const { roadmap } = await response.json();

    // Build nodes from the numbered list returned by the model.
    const steps = roadmap.match(/\d+\..+?(?=\n\d+\.|\n*$)/gs) || [];
    container.innerHTML = "";

    if (steps.length === 0) {
      container.innerHTML =
        "<p class='loading'>No steps were returned. Try rephrasing your goal.</p>";
      return;
    }

    steps.forEach((step) => {
      const node = document.createElement("div");
      node.className = "node";
      node.textContent = step.trim();
      node.addEventListener("click", () => node.classList.toggle("completed"));
      container.appendChild(node);
    });

    drawLines();
  } catch (err) {
    console.error("Error generating roadmap:", err);
    container.innerHTML =
      "<p class='loading'>Something went wrong. Please go back and try again.</p>";
  }
}

generateBtn.addEventListener("click", generateRoadmap);

// Let users press Enter to submit.
goalInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generateRoadmap();
});

// Back button – reset everything.
backBtn.addEventListener("click", () => {
  clearLines();
  container.innerHTML = "";
  roadmapScreen.style.display = "none";
  homeScreen.style.display = "block";
  goalInput.focus();
});
