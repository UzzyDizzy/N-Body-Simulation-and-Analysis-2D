# backend/ml/analysis.py
import numpy as np

def early_stability_predict(traj):
    if len(traj) < 10:
        return 0.5

    c0 = np.mean(traj[0], axis=0)
    c1 = np.mean(traj[-1], axis=0)

    disp = np.linalg.norm(c1 - c0)
    return float(np.exp(-0.15 * disp))


def chaos_indicator(pos, vel):
    if len(vel) == 0:
        return 0.0
    return float(np.mean(np.linalg.norm(vel, axis=1)))


def extract_features(n_init, traj, pos, vel):
    return [
        float(n_init),
        float(len(traj)),
        early_stability_predict(traj),
        chaos_indicator(pos, vel),
    ]
