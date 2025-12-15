import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";

describe("App Integration", () => {
  it("responds with a welcome message on GET /", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ message: "Runiverse Backend running 🚀" });
  });
});
