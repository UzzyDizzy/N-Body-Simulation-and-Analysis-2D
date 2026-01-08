#backend\simulation\nbody.py
import numpy as np
from backend.config import COLLISION_RADIUS, BOUND

G = 1.0

class NBodySystem:
    def __init__(self, n):
        self.mass = np.ones(n)
        self.pos = np.random.uniform(-5, 5, (n, 2))
        self.vel = np.random.uniform(-0.4, 0.4, (n, 2))

    def acceleration(self):
        n = len(self.mass)
        acc = np.zeros_like(self.pos)
        for i in range(n):
            for j in range(n):
                if i != j:
                    r = self.pos[j] - self.pos[i]
                    d = np.linalg.norm(r) + 1e-6
                    acc[i] += G * r / d**3
        return acc

    def step(self, dt):
        self.vel += self.acceleration() * dt
        self.pos += self.vel * dt
        self.handle_collisions()
        self.handle_escape()

    def handle_collisions(self):
        i = 0
        while i < len(self.mass):
            j = i + 1
            while j < len(self.mass):
                if np.linalg.norm(self.pos[i] - self.pos[j]) < COLLISION_RADIUS:
                    m = self.mass[i] + self.mass[j]
                    self.vel[i] = (self.mass[i]*self.vel[i] + self.mass[j]*self.vel[j]) / m
                    self.pos[i] = (self.mass[i]*self.pos[i] + self.mass[j]*self.pos[j]) / m
                    self.mass[i] = m
                    self.mass = np.delete(self.mass, j)
                    self.pos = np.delete(self.pos, j, axis=0)
                    self.vel = np.delete(self.vel, j, axis=0)
                else:
                    j += 1
            i += 1

    def handle_escape(self):
        mask = np.all(np.abs(self.pos) <= BOUND, axis=1)
        self.mass, self.pos, self.vel = self.mass[mask], self.pos[mask], self.vel[mask]

    def finished(self):
        return len(self.mass) <= 1
