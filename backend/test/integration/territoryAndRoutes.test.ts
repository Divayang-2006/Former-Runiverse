import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import TerritoryCell from "../../src/models/TerritoryCell.js";

const registerUser = async () => {
  const payload = {
    username: `hex-${Math.random().toString(16).slice(2, 8)}`,
    email: `hex-${Math.random().toString(16).slice(2, 8)}@example.com`,
    password: "Passw0rd!",
  };

  const response = await request(app).post("/api/auth/register").send(payload);
  expect(response.status).toBe(201);
  return { token: response.body.token as string, userId: response.body.user.id as string };
};

describe("Territory cells", () => {
  it("rejects capture requests without hexId", async () => {
    const { token } = await registerUser();

    const response = await request(app)
      .post("/api/territory/capture")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: "hexId is required" });
  });

  it("captures a territory cell and assigns ownership", async () => {
    const { token, userId } = await registerUser();

    const response = await request(app)
      .post("/api/territory/capture")
      .set("Authorization", `Bearer ${token}`)
      .send({ hexId: "8928308280fffff" })
      .expect(201);

    expect(response.body).toMatchObject({ success: true });
    expect(response.body.data).toMatchObject({ hexId: "8928308280fffff", ownerId: userId });

    const stored = await TerritoryCell.findOne({ hexId: "8928308280fffff" }).lean();
    expect(stored).not.toBeNull();
    expect(stored?.ownerId?.toString()).toBe(userId);
    expect(stored?.captureCount).toBeGreaterThan(0);
  });

  it("lists only the authenticated user's captured cells", async () => {
    const owner = await registerUser();
    const other = await registerUser();

    await request(app)
      .post("/api/territory/capture")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ hexId: "8928308280fffef" })
      .expect(201);

    await request(app)
      .post("/api/territory/capture")
      .set("Authorization", `Bearer ${other.token}`)
      .send({ hexId: "8928308280fffee" })
      .expect(201);

    const response = await request(app)
      .get("/api/territory/my")
      .set("Authorization", `Bearer ${owner.token}`)
      .expect(200);

    expect(response.body).toMatchObject({ success: true });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({ hexId: "8928308280fffef" });
  });

  it("filters territory cells by bbox list", async () => {
    const owner = await registerUser();

    await request(app)
      .post("/api/territory/capture")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ hexId: "8928308280fffed" })
      .expect(201);

    const response = await request(app)
      .get("/api/territory/hexes")
      .query({ bbox: "8928308280fffed,8928308280fffff" })
      .expect(200);

    expect(response.body).toMatchObject({ success: true });
    const hexIds = response.body.data.map((cell: { hexId: string }) => cell.hexId);
    expect(hexIds).toContain("8928308280fffed");
  });
});
