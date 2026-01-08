//frontend\app.js
window.onload = () => {
    updateCSVList();

    function drawFrame(ctx, title, xLabel, yLabel) {
        ctx.strokeStyle = "#0ff";
        ctx.strokeRect(0, 0, 300, 200);

        ctx.fillStyle = "#0ff";
        ctx.font = "12px monospace";
        ctx.fillText(title, 10, 15);

        ctx.font = "10px monospace";
        ctx.fillText(xLabel, 130, 195);
        ctx.save();
        ctx.translate(5, 120);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();
    }

  console.log("GravNet-ML JS loaded");

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  let playbackSpeed = 1.0;
  let running = false;
  let frame = 0;
  let data = null;
  let colors = [];
  let anim = null;
  let exportOn = false;

  /* ---------- TAB CONTROL ---------- */
  window.showTab = function(id){
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(id).classList.add("active");
  };

  function randColor(){
    return `hsl(${Math.random()*360},100%,60%)`;
  }

  function draw(f){
    ctx.clearRect(0,0,600,600);
    const step = data.trajectory[Math.floor(f)];
    if(!step) return;

    step.forEach((p,i)=>{
      ctx.strokeStyle = colors[i];
      ctx.beginPath();
      for(let k=0;k<=f;k++){
        const pt = data.trajectory[k]?.[i];
        if(!pt) break;
        const x = 300 + pt[0]*20;
        const y = 300 + pt[1]*20;
        k===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(300+p[0]*20,300+p[1]*20,5,0,Math.PI*2);
      ctx.fillStyle = colors[i];
      ctx.fill();
    });
  }

  window.run = async function(){
    cancelAnimationFrame(anim);

    const n = document.getElementById("n").value;
    const res = await fetch(`/simulate?n=${n}`);
    data = await res.json();

    document.getElementById("info").innerText =
        `Steps: ${data.steps}
        Heuristic Stability: ${data.heuristic.toFixed(3)}
        ML Stability: ${
        data.ml_prob === null ? "No model available" : data.ml_prob.toFixed(3)
    }`;


    colors = Array.from({length:n}, randColor);
    frame = 0;
    running = true;
    animate();
    updateCSVList();
  };

  function animate(){
    if(!running) return;

    draw(frame);
    frame += playbackSpeed;

    if(frame >= data.trajectory.length){
      running = false;
      return;
    }

    document.getElementById("info").innerText =
      `Playback Speed: ${playbackSpeed.toFixed(1)}
        Step: ${Math.floor(frame)}/${data.steps} (Max Steps Computed : 10000)
        Heuristic Stability: ${data.heuristic.toFixed(3)}
        ML Stability: ${
        data.ml_prob === null ? "No model available" : data.ml_prob.toFixed(3)
    }`;

    anim = requestAnimationFrame(animate);
  }

  window.increaseSpeed = () => playbackSpeed += 0.5;
  window.decreaseSpeed = () =>
    playbackSpeed = Math.max(0.5, playbackSpeed - 0.5);

  window.toggleExport = async function(){
    exportOn = !exportOn;
    document.getElementById("light").style.background =
      exportOn ? "lime" : "red";

    await fetch(exportOn ? "/export/start" : "/export/stop");
    updateCSVList();
  };

  async function updateCSVList(){
    const res = await fetch("/export/list");
    const json = await res.json();

    const list = document.getElementById("csvList");
    const select = document.getElementById("csvSelect");

    list.innerHTML = "";
    select.innerHTML = "";

    if(json.files.length === 0){
      list.innerText = "(none)";
      return;
    }

    json.files.forEach(f=>{
      const d = document.createElement("div");
      d.className = "csv";
      d.innerHTML =
        `${f}
         <button onclick="downloadCSV('${f}')">⬇</button>
         <button onclick="deleteCSV('${f}')">🗑</button>`;
      list.appendChild(d);

      const opt = document.createElement("option");
      opt.value = f;
      opt.text = f;
      select.appendChild(opt);
    });
  }

  window.downloadCSV = name =>
    window.open(`/export/download/${name}`);

  window.deleteCSV = async function(name){
    await fetch(`/export/delete/${name}`);
    updateCSVList();
  };

  window.deleteAllCSVs = async function(){
    await fetch("/export/delete_all");
    updateCSVList();
  };

  
  /* ================= ANALYSIS ================= */
  window.analyze = async function () {
    const f = document.getElementById("csvSelect").value;
    if (!f) return;

    const d = await (await fetch(`/export/analyze/${f}`)).json();

    scatterPlotHC(d.heuristic, d.chaos);
    barPlotCounts(d.merged, d.escaped);
    histPlot(d.heuristic, "plot3", "Heuristic Stability");

    if (d.ml.some(v => v !== null)) {
      histPlot(d.ml.filter(v => v !== null), "plot4", "ML Stability");
    } else {
      emptyPlot("plot4", "No ML Model");
    }
  };

  /* ================= PLOTS ================= */
  function scatterPlotHC(stab, chaos) {
    const ctx = document.getElementById("plot1").getContext("2d");
    ctx.clearRect(0, 0, 300, 200);
    drawFrame(ctx, "Stability vs Chaos", "Stability →", "Chaos ↑");

    const maxC = Math.max(...chaos, 1);
    stab.forEach((s, i) => {
      const x = 40 + s * 240;
      const y = 170 - (chaos[i] / maxC) * 140;
      ctx.fillStyle = "#0ff";
      ctx.fillRect(x, y, 4, 4);
    });
  }

  function barPlotCounts(m, e) {
    const ctx = document.getElementById("plot2").getContext("2d");
    ctx.clearRect(0, 0, 300, 200);
    drawFrame(ctx, "Outcomes", "Type", "Count");

    const max = Math.max(m, e, 1);
    ctx.fillStyle = "#0f0";
    ctx.fillRect(90, 170 - (m / max) * 140, 40, (m / max) * 140);
    ctx.fillText("Merged", 85, 185);

    ctx.fillStyle = "#f55";
    ctx.fillRect(170, 170 - (e / max) * 140, 40, (e / max) * 140);
    ctx.fillText("Escaped", 165, 185);
  }

  function histPlot(arr, id, label) {
    const ctx = document.getElementById(id).getContext("2d");
    ctx.clearRect(0, 0, 300, 200);
    drawFrame(ctx, `${label} Distribution`, label, "Frequency");

    const bins = 10;
    const hist = Array(bins).fill(0);
    arr.forEach(v => hist[Math.min(bins - 1, Math.floor(v * bins))]++);

    const max = Math.max(...hist, 1);
    hist.forEach((h, i) => {
      const barHeight = (h / max) * 140;
      ctx.fillStyle = "#0ff";
      ctx.fillRect(40 + i * 22, 170 - barHeight, 18, barHeight);
    });
  }

  function emptyPlot(id, title) {
    const ctx = document.getElementById(id).getContext("2d");
    ctx.clearRect(0, 0, 300, 200);
    ctx.fillStyle = "#0ff";
    ctx.fillText(title, 80, 100);
  }
};