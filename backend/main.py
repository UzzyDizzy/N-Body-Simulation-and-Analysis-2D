#backend\main.py
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import csv, os, torch

from backend.simulation.nbody import NBodySystem
from backend.ml.analysis import extract_features, early_stability_predict
from backend.ml.dataset import DatasetManager
from backend.ml.model import StabilityNet
from backend.config import DT

app = FastAPI()
app.mount("/static", StaticFiles(directory="frontend"), name="static")

dataset = DatasetManager()

model = None

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "stability.pt")

if os.path.exists(MODEL_PATH):
    model = StabilityNet(4)
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
    model.eval()

@app.get("/", response_class=HTMLResponse)
def index():
    return open("frontend/index.html", encoding="utf-8").read()

@app.get("/export/start")
def start(): dataset.start(); return {"ok": True}

@app.get("/export/stop")
def stop(): dataset.stop(); return {"ok": True}

@app.get("/export/list")
def list_files(): return {"files": dataset.list_files()}

@app.get("/export/download/{name}")
def download(name: str):
    return FileResponse(dataset.get_path(name), filename=name)

@app.get("/export/delete/{name}")
def delete(name: str):
    dataset.delete(name); return {"ok": True}

@app.get("/export/delete_all")
def delete_all():
    dataset.delete_all(); return {"ok": True}

@app.get("/export/analyze/{name}")
def analyze(name: str):
    path = dataset.get_path(name)

    heuristic, ml, chaos = [], [], []
    merged = escaped = 0

    with open(path) as f:
        for r in csv.DictReader(f):
            heuristic.append(float(r["heuristic_stability"]))
            chaos.append(float(r["chaos"]))
            ml.append(
                None if r["ml_stability"] == "" else float(r["ml_stability"])
            )
            merged += int(r["merged"])
            escaped += int(r["escaped"])

    return {
        "heuristic": heuristic,
        "ml": ml,
        "chaos": chaos,
        "merged": merged,
        "escaped": escaped
    }

@app.get("/simulate")
def simulate(n: int = 3, max_steps: int = 6000):
    sys = NBodySystem(n)
    traj = []

    for _ in range(max_steps):
        sys.step(DT)
        traj.append(sys.pos.copy())
        if sys.finished():
            break

    heuristic = early_stability_predict(traj)
    ml_prob = None

    if model:
        with torch.no_grad():
            ml_prob = float(model(torch.tensor(
                [extract_features(n, traj, sys.pos, sys.vel)],
                dtype=torch.float32
            )))

    dataset.log([
        id(traj), n, len(traj),
        int(len(sys.mass) == 1),
        int(len(sys.mass) == 0),
        heuristic,
        "" if ml_prob is None else ml_prob,
        extract_features(n, traj, sys.pos, sys.vel)[-1]
    ])

    return {
        "trajectory": [t.tolist() for t in traj],
        "heuristic": heuristic,
        "ml_prob": ml_prob,
        "steps": len(traj)
    }
