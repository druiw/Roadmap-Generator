const goalInput = document.getElementById("goal-input");
const generateBtn = document.getElementById("generate-btn");
const errorMsg = document.getElementById("error-msg");
const homeScreen = document.getElementById("home-screen");
const roadmapScreen = document.getElementById("roadmap-screen");
const backBtn = document.getElementById("back-btn");
const canvas = document.getElementById("canvas");

// Layout constants (px). NODE_W must match .node width in style.css.
const NODE_W = 170;
const NODE_H = 64;
const DX = 210; // horizontal spacing between sibling subtrees
const DY = 140; // vertical spacing between tree levels
const PADDING = 60;

const treeLayout = d3.tree().nodeSize([DX, DY]);

let root = null; // current d3.hierarchy root
let leaderLines = [];

function clearLines() {
  leaderLines.forEach((line) => line.remove());
  leaderLines = [];
}

// Collapse/expand a node by swapping its children in and out of view.
function toggleCollapse(node) {
  if (node.children) {
    node._children = node.children;
    node.children = null;
  } else {
    node.children = node._children;
    node._children = null;
  }
  render();
}

function render() {
  clearLines();
  canvas.innerHTML = "";
  if (!root) return;

  treeLayout(root);
  const nodes = root.descendants();

  // Find bounds so we can shift everything into positive coordinates.
  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = 0;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x);
    maxY = Math.max(maxY, n.y);
  }
  const offsetX = PADDING + NODE_W / 2 - minX;

  canvas.style.width = maxX - minX + NODE_W + PADDING * 2 + "px";
  canvas.style.height = maxY + NODE_H + PADDING * 2 + "px";

  const elFor = new Map();

  for (const n of nodes) {
    const el = document.createElement("div");
    el.className = "node" + (n.data.completed ? " completed" : "");
    el.style.left = n.x + offsetX - NODE_W / 2 + "px";
    el.style.top = n.y + PADDING + "px";

    const label = document.createElement("span");
    label.className = "node-label";
    label.textContent = n.data.label;
    el.appendChild(label);

    // Clicking the node body toggles completion (per node).
    el.addEventListener("click", () => {
      n.data.completed = !n.data.completed;
      el.classList.toggle("completed", n.data.completed);
    });

    // Nodes with children get a caret to collapse/expand the branch.
    if (n.children || n._children) {
      const caret = document.createElement("button");
      caret.type = "button";
      caret.className = "caret";
      caret.textContent = n._children ? "▸" : "▾";
      caret.setAttribute(
        "aria-label",
        n._children ? "Expand branch" : "Collapse branch"
      );
      caret.addEventListener("click", (e) => {
        e.stopPropagation(); // don't also toggle completion
        toggleCollapse(n);
      });
      el.appendChild(caret);
    }

    canvas.appendChild(el);
    elFor.set(n, el);
  }

  // Connect each node to its parent (inverted tree: top -> bottom).
  for (const n of nodes) {
    if (n.parent) {
      const line = new LeaderLine(elFor.get(n.parent), elFor.get(n), {
        color: "#6c8cff",
        size: 2,
        path: "fluid",
        startSocket: "bottom",
        endSocket: "top",
        startPlug: "behind",
        endPlug: "arrow1",
        endPlugSize: 1.5,
      });
      leaderLines.push(line);
    }
  }

  // Center the view on the tree if it's wider than the screen.
  requestAnimationFrame(() => {
    const extra = canvas.offsetWidth - window.innerWidth;
    if (extra > 0) window.scrollTo({ left: extra / 2 });
  });
}

// Keep connector lines aligned when the window is resized.
window.addEventListener("resize", () => {
  leaderLines.forEach((line) => line.position());
});

async function generateRoadmap() {
  const goal = goalInput.value.trim();
  errorMsg.textContent = "";

  if (!goal) {
    errorMsg.textContent = "Please enter something you'd like to learn.";
    goalInput.focus();
    return;
  }

  homeScreen.style.display = "none";
  roadmapScreen.style.display = "block";
  clearLines();
  root = null;
  canvas.removeAttribute("style");
  canvas.innerHTML = `<p class="loading">Generating roadmap for "${goal}"…</p>`;

  try {
    const response = await fetch("/api/generate-roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    if (!response.ok) throw new Error(await response.text());

    const { tree } = await response.json();
    if (!tree || typeof tree.label !== "string") {
      throw new Error("Empty roadmap");
    }

    canvas.innerHTML = "";
    root = d3.hierarchy(tree);
    render();
  } catch (err) {
    console.error("Error generating roadmap:", err);
    canvas.innerHTML =
      "<p class='loading'>Something went wrong. Please go back and try again.</p>";
  }
}

generateBtn.addEventListener("click", generateRoadmap);

goalInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") generateRoadmap();
});

backBtn.addEventListener("click", () => {
  clearLines();
  root = null;
  canvas.innerHTML = "";
  canvas.removeAttribute("style");
  roadmapScreen.style.display = "none";
  homeScreen.style.display = "block";
  goalInput.focus();
});
