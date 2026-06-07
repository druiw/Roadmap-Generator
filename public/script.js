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

const treeLayout = d3
  .tree()
  .nodeSize([DX, DY])
  .separation((a, b) => (a.parent === b.parent ? 1 : 1.25));

// Dev-only: open the page with ?mock to preview the tree layout with sample
// data (e.g. via Live Server), without hitting the API. Remove when no longer
// needed.
const USE_MOCK = new URLSearchParams(location.search).has("mock");
const MOCK_TREE = {
  label: "Learn frontend development",
  children: [
    {
      label: "HTML Basics",
      children: [
        { label: "Document structure" },
        { label: "Forms & inputs" },
        { label: "Semantic tags" },
      ],
    },
    {
      label: "CSS Fundamentals",
      children: [
        { label: "Box model" },
        { label: "Flexbox & Grid" },
        { label: "Responsive design" },
      ],
    },
    {
      label: "JavaScript",
      children: [
        { label: "Syntax & types" },
        { label: "DOM manipulation" },
        { label: "Fetch & async" },
      ],
    },
    {
      label: "Build a project",
      children: [{ label: "Deploy to Vercel" }],
    },
  ],
};

const SVG_NS = "http://www.w3.org/2000/svg";

let root = null; // current d3.hierarchy root

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

// The natural-size tree (nodes + connectors). Kept around so a resize can
// re-fit it to the viewport without rebuilding the whole layout.
let treeInner = null;
let naturalWidth = 0;
let naturalHeight = 0;

function render() {
  canvas.innerHTML = "";
  treeInner = null;
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
  naturalWidth = maxX - minX + NODE_W + PADDING * 2;

  // Build the tree at its natural size, then scale it to fit the viewport.
  treeInner = document.createElement("div");
  treeInner.className = "tree-inner";
  treeInner.style.width = naturalWidth + "px";

  // SVG connectors sit behind the nodes in the same coordinate space.
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "links");
  svg.setAttribute("width", naturalWidth);
  treeInner.appendChild(svg);

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

    treeInner.appendChild(el);
    elFor.set(n, el);
  }

  canvas.appendChild(treeInner);

  // Now that nodes are in the DOM we can measure their real (wrapped) heights
  // to place connectors and size the canvas.
  let maxBottom = 0;
  for (const n of nodes) {
    const top = n.y + PADDING;
    maxBottom = Math.max(maxBottom, top + elFor.get(n).offsetHeight);
  }
  naturalHeight = maxBottom + PADDING;
  treeInner.style.height = naturalHeight + "px";
  svg.setAttribute("height", naturalHeight);

  // Connect each node to its parent (inverted tree: top -> bottom).
  for (const n of nodes) {
    if (!n.parent) continue;
    const p = n.parent;
    const sx = p.x + offsetX;
    const sy = p.y + PADDING + elFor.get(p).offsetHeight; // parent bottom-center
    const ex = n.x + offsetX;
    const ey = n.y + PADDING; // child top-center
    const my = (sy + ey) / 2; // midpoint for a smooth vertical curve

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute(
      "d",
      `M ${sx} ${sy} C ${sx} ${my}, ${ex} ${my}, ${ex} ${ey}`
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#6c8cff");
    path.setAttribute("stroke-width", "2");
    svg.appendChild(path);
  }

  fitToViewport();
}

// Scale the tree so its full width fits the viewport (vertical scroll only).
function fitToViewport() {
  if (!treeInner || !naturalWidth) return;
  const available = canvas.clientWidth;
  const scale = Math.min(1, available / naturalWidth);
  treeInner.style.transform = `scale(${scale})`;
  // Center the scaled tree horizontally within the viewport.
  treeInner.style.left = Math.max(0, (available - naturalWidth * scale) / 2) + "px";
  // Reserve the scaled height on the page so the wrapper scrolls correctly.
  canvas.style.height = naturalHeight * scale + "px";
}

// Re-fit the tree to the viewport on resize / orientation change.
let resizeRaf = null;
window.addEventListener("resize", () => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(fitToViewport);
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
  root = null;
  treeInner = null;
  canvas.removeAttribute("style");
  canvas.innerHTML = `<p class="loading">Generating roadmap for "${goal}"…</p>`;

  try {
    let tree;
    if (USE_MOCK) {
      tree = MOCK_TREE;
    } else {
      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });
      if (!response.ok) throw new Error(await response.text());
      ({ tree } = await response.json());
    }

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
  root = null;
  treeInner = null;
  canvas.innerHTML = "";
  canvas.removeAttribute("style");
  roadmapScreen.style.display = "none";
  homeScreen.style.display = "block";
  goalInput.focus();
});
