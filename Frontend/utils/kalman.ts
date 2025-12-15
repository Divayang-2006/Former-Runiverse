export default class Kalman1D {
  x: [number, number] = [0, 0]; // [pos, vel]
  P: number[][] = [
    [1, 0],
    [0, 1],
  ];
  q_pos = 0.0001;
  q_vel = 0.01;
  r = 5e-5;
  initialized = false;

  init(pos: number, vel = 0) {
    this.x = [pos, vel];
    this.P = [
      [1, 0],
      [0, 1],
    ];
    this.initialized = true;
  }

  predict(dt: number) {
    if (!this.initialized) return;

    const F = [
      [1, dt],
      [0, 1],
    ];
    const Q = [
      [this.q_pos * Math.max(dt, 1e-3), 0],
      [0, this.q_vel * Math.max(dt, 1e-3)],
    ];

    const [pos, vel] = this.x;
    this.x = [pos + vel * dt, vel];

    const P = this.P;

    const FP = [
      [F[0][0] * P[0][0] + F[0][1] * P[1][0], F[0][0] * P[0][1] + F[0][1] * P[1][1]],
      [F[1][0] * P[0][0] + F[1][1] * P[1][0], F[1][0] * P[0][1] + F[1][1] * P[1][1]],
    ];

    const FPFt = [
      [FP[0][0] * F[0][0] + FP[0][1] * F[0][1], FP[0][0] * F[1][0] + FP[0][1] * F[1][1]],
      [FP[1][0] * F[0][0] + FP[1][1] * F[0][1], FP[1][0] * F[1][0] + FP[1][1] * F[1][1]],
    ];

    this.P = [
      [FPFt[0][0] + Q[0][0], FPFt[0][1] + Q[0][1]],
      [FPFt[1][0] + Q[1][0], FPFt[1][1] + Q[1][1]],
    ];
  }

  update(meas: number) {
    if (!this.initialized) {
      this.init(meas, 0);
      return;
    }

    const H = [1, 0];

    const y = meas - (H[0] * this.x[0] + H[1] * this.x[1]);

    const S = H[0] * this.P[0][0] + H[1] * this.P[1][0] + this.r;

    const K = [this.P[0][0] / S, this.P[1][0] / S];

    this.x = [this.x[0] + K[0] * y, this.x[1] + K[1] * y];

    const KH = [
      [K[0] * H[0], K[0] * H[1]],
      [K[1] * H[0], K[1] * H[1]],
    ];

    const IminusKH = [
      [1 - KH[0][0], -KH[0][1]],
      [-KH[1][0], 1 - KH[1][1]],
    ];

    const P = this.P;

    this.P = [
      [
        IminusKH[0][0] * P[0][0] + IminusKH[0][1] * P[1][0],
        IminusKH[0][0] * P[0][1] + IminusKH[0][1] * P[1][1],
      ],
      [
        IminusKH[1][0] * P[0][0] + IminusKH[1][1] * P[1][0],
        IminusKH[1][0] * P[0][1] + IminusKH[1][1] * P[1][1],
      ],
    ];
  }

  get position() {
    return this.x[0];
  }

  get velocity() {
    return this.x[1];
  }
}
