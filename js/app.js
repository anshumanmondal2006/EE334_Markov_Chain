const state = {
  labels: ["State 1", "State 2"],
  P: [[0.8, 0.2], [0.4, 0.6]],
  p0: [1, 0],
  p: [1, 0],
  running: false,
  timer: null,
  stepIdx: 0,
  chart: null
}

const $ = s => document.querySelector(s)
const $$ = s => Array.from(document.querySelectorAll(s))

function normalizeRow(r) { const s = r.reduce((a, b) => a + b, 0); return s ? r.map(x => x / s) : r }
function normalizeVector(v) { const s = v.reduce((a, b) => a + b, 0); return s ? v.map(x => x / s) : v }
function multRowVecMat(p, P) { const n = P.length; const r = Array(n).fill(0); for (let j = 0; j < n; j++) { for (let k = 0; k < n; k++)r[j] += p[k] * P[k][j] } return r }

function buildStatesInputs() {
  const c = $("#statesContainer")
  c.innerHTML = ""
  state.labels.forEach((n, i) => {
    const inp = document.createElement("input")
    inp.value = n
    inp.addEventListener("input", () => {
      state.labels[i] = inp.value || `State ${i + 1}`
      updateMatrixHeaders()
      updateGraph()
      rebuildChart()
    })
    c.appendChild(inp)
  })
}

function updateMatrixHeaders() {
  const table = $("#matrixTable")
  const init = $("#initTable")
  const n = state.labels.length

  table.innerHTML = ""
  const header = document.createElement("tr")
  header.innerHTML = `<th></th>` + state.labels.map(l => `<th>${l}</th>`).join("")
  table.appendChild(header)

  for (let i = 0; i < n; i++) {
    const tr = document.createElement("tr")
    tr.innerHTML = `<th>${state.labels[i]}</th>` + state.P[i].map((v, j) => `<td><input type="number" step="0.001" min="0" value="${v.toFixed(3)}" data-i="${i}" data-j="${j}" class="cell"></td>`).join("")
    table.appendChild(tr)
  }

  init.innerHTML = ""
  const h2 = document.createElement("tr")
  h2.innerHTML = state.labels.map(l => `<th>${l}</th>`).join("")
  init.appendChild(h2)

  const r = document.createElement("tr")
  r.innerHTML = state.p0.map((v, j) => `<td><input type="number" step="0.001" min="0" value="${v.toFixed(3)}" data-j="${j}" class="init"></td>`).join("")
  init.appendChild(r)

  $$(".cell").forEach(inp => inp.addEventListener("change", e => {
    const i = +e.target.dataset.i, j = +e.target.dataset.j
    state.P[i][j] = Math.max(0, parseFloat(e.target.value) || 0)
    updateGraph()
  }))

  $$(".init").forEach(inp => inp.addEventListener("change", e => {
    const j = +e.target.dataset.j
    state.p0[j] = Math.max(0, parseFloat(e.target.value) || 0)
  }))
}

function addState() {
  if (state.labels.length >= 3) return
  const n = state.labels.length
  state.labels.push(`State ${n + 1}`)
  state.P.forEach(r => r.push(0))
  state.P.push(Array(n + 1).fill(0))
  state.P[n][n] = 1
  state.p0.push(0)
  state.p.push(0)
  buildStatesInputs()
  updateMatrixHeaders()
  rebuildChart()
  updateGraph()
}

function removeState() {
  if (state.labels.length <= 2) return
  state.labels.pop()
  state.P.pop()
  state.P.forEach(r => r.pop())
  state.p0.pop()
  state.p.pop()
  buildStatesInputs()
  updateMatrixHeaders()
  rebuildChart()
  updateGraph()
}

function randomizeMatrix() {
  const n = state.P.length
  for (let i = 0; i < n; i++) {
    let row = []
    for (let j = 0; j < n; j++)row.push(Math.random())
    state.P[i] = normalizeRow(row)
  }
  updateMatrixHeaders()
  updateGraph()
}

function normalizeRows() {
  state.P = state.P.map(normalizeRow)
  updateMatrixHeaders()
  updateGraph()
}

function setUniformInit() {
  const n = state.labels.length
  state.p0 = Array(n).fill(1 / n)
  updateMatrixHeaders()
}

function normalizeInit() {
  state.p0 = normalizeVector(state.p0)
  updateMatrixHeaders()
}

function resetSim() {
  state.stepIdx = 0
  state.p = normalizeVector(state.p0.slice())
  if (state.chart) {
    state.chart.data.labels = [0]
    state.chart.data.datasets.forEach(ds => ds.data = [state.p[ds._idx]])
    state.chart.update()
  }
  updateGraph()
}

function stepOnce() {
  state.stepIdx++
  state.p = multRowVecMat(state.p, state.P)
  state.chart.data.labels.push(state.stepIdx)
  state.chart.data.datasets.forEach(ds => ds.data.push(state.p[ds._idx]))
  state.chart.update()
  updateGraph()
}

function run() {
  if (state.running) return
  state.running = true
  $("#run").disabled = true
  $("#pause").disabled = false
  function tick() {
    if (!state.running) return
    stepOnce()
    state.timer = setTimeout(tick, +$("#speed").value)
  }
  tick()
}

function pause() {
  state.running = false
  $("#run").disabled = false
  $("#pause").disabled = true
  clearTimeout(state.timer)
}

function updateGraph() {
  const svg = $("#graph")
  svg.innerHTML = ""
  const n = state.labels.length

  let nodes = []
  if (n === 2) {
    nodes = [
      { x: 250, y: 300, label: state.labels[0], prob: state.p[0] },
      { x: 550, y: 300, label: state.labels[1], prob: state.p[1] }
    ]
  } else {
    nodes = [
      { x: 400, y: 120, label: state.labels[0], prob: state.p[0] },
      { x: 180, y: 420, label: state.labels[1], prob: state.p[1] },
      { x: 620, y: 420, label: state.labels[2], prob: state.p[2] }
    ]
  }

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const p = state.P[i][j]
      if (p <= 0) continue
      const a = nodes[i], b = nodes[j]
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
      let d, labelX, labelY

      if (i === j) {
        continue;
      } else {
        const dx = b.x - a.x
        const dy = b.y - a.y
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const curveOffset = (i < j ? -60 : 60)
        d = `M ${a.x} ${a.y} Q ${mx} ${my + curveOffset} ${b.x} ${b.y}`
        labelX = mx
        labelY = my + curveOffset
      }

      path.setAttribute("d", d)
      path.setAttribute("stroke", "var(--accent)")
      path.setAttribute("fill", "none")
      path.setAttribute("stroke-width", (1 + 5 * p))
      svg.appendChild(path)

      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text")
      txt.setAttribute("x", labelX)
      txt.setAttribute("y", labelY)
      txt.setAttribute("text-anchor", "middle")
      txt.setAttribute("fill", "#9fb9ff")
      txt.textContent = p.toFixed(2)
      svg.appendChild(txt)
    }
  }

  nodes.forEach(nd => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle")
    circle.setAttribute("cx", nd.x)
    circle.setAttribute("cy", nd.y)
    circle.setAttribute("r", 32)
    circle.setAttribute("fill", "rgba(46,160,67," + (0.2 + 0.8 * nd.prob) + ")")
    circle.setAttribute("stroke", "#e6edf3")
    circle.setAttribute("stroke-width", "2")
    svg.appendChild(circle)

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text")
    label.setAttribute("x", nd.x)
    label.setAttribute("y", nd.y + 5)
    label.setAttribute("text-anchor", "middle")
    label.setAttribute("fill", "#fff")
    label.textContent = nd.label
    svg.appendChild(label)

    const prob = document.createElementNS("http://www.w3.org/2000/svg", "text")
    prob.setAttribute("x", nd.x)
    prob.setAttribute("y", nd.y + 55)
    prob.setAttribute("text-anchor", "middle")
    prob.setAttribute("fill", "#9fb9ff")
    prob.textContent = nd.prob.toFixed(3)
    svg.appendChild(prob)
  })
}

function rebuildChart() {
  const ctx = $("#distChart").getContext("2d")
  if (state.chart) state.chart.destroy()
  const colors = ["#58a6ff", "#2ea043", "#ff7b72"]
  state.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [0],
      datasets: state.labels.map((l, i) => ({
        label: l,
        data: [state.p[i]],
        borderColor: colors[i],
        borderWidth: 2,
        tension: 0.25,
        fill: false,
        _idx: i
      }))
    },
    options: {
      responsive: true,
      animation: false,
      scales: { y: { min: 0, max: 1 } },
      elements: { point: { radius: 0 } }
    }
  })
}

function main() {
  buildStatesInputs()
  updateMatrixHeaders()
  rebuildChart()
  resetSim()
  updateGraph()
  $("#addState").onclick = addState
  $("#removeState").onclick = removeState
  $("#randomize").onclick = randomizeMatrix
  $("#normalizeRows").onclick = normalizeRows
  $("#uniformInit").onclick = setUniformInit
  $("#normalizeInit").onclick = normalizeInit
  $("#step").onclick = stepOnce
  $("#run").onclick = run
  $("#pause").onclick = pause
  $("#reset").onclick = resetSim
  $("#speed").oninput = e => $("#speedValue").textContent = e.target.value + " ms"
}
document.addEventListener("DOMContentLoaded", main)