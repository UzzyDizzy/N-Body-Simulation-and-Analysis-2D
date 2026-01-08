#backend\ml\dataset.py
import csv
import os
import uuid

DATASET_DIR = "data/datasets"

class DatasetManager:
    def __init__(self):
        os.makedirs(DATASET_DIR, exist_ok=True)
        self.active = False
        self.current_file = None

    def start(self):
        if self.active:
            return

        name = f"dataset_{uuid.uuid4().hex[:6]}.csv"
        self.current_file = os.path.join(DATASET_DIR, name)

        with open(self.current_file, "w", newline="") as f:
            csv.writer(f).writerow([
                "run_id",
                "n_init",
                "steps",
                "merged",
                "escaped",
                "heuristic_stability",
                "ml_stability",
                "chaos"
            ])

        self.active = True

    def stop(self):
        self.active = False
        self.current_file = None

    def log(self, row):
        if not self.active or not self.current_file:
            return
        with open(self.current_file, "a", newline="") as f:
            csv.writer(f).writerow(row)

    def list_files(self):
        return [f for f in os.listdir(DATASET_DIR) if f.endswith(".csv")]

    def get_path(self, name):
        path = os.path.join(DATASET_DIR, name)
        return path if os.path.exists(path) else None

    def delete(self, name):
        p = self.get_path(name)
        if p:
            os.remove(p)

    def delete_all(self):
        for f in self.list_files():
            os.remove(os.path.join(DATASET_DIR, f))
