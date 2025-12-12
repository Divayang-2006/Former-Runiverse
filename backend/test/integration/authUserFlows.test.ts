import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app.js";
import User from "../../src/models/User.js";

const registerPayload = (overrides: Record<string, unknown> = {}) => ({
  username: `runner-${Math.random().toString(16).slice(2, 6)}`,
  email: `runner-${Math.random().toString(16).slice(2, 6)}@example.com`,
  password: "Passw0rd!",
  ...overrides,
});

const extractUser = (responseBody: unknown) => {
  const body = responseBody as { user?: Record<string, unknown>; data?: Record<string, unknown> };
  return body.user ?? body.data ?? {};
};

describe("Auth & User flows", () => {
  describe("POST /api/auth/register", () => {
    it("registers a new user and returns a token", async () => {
      const payload = registerPayload();

      const response = await request(app).post("/api/auth/register").send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ success: true, message: "Registration successful" });
      expect(typeof response.body.token).toBe("string");

      const user = extractUser(response.body);
      expect(user).toMatchObject({
        username: payload.username,
        email: payload.email.toLowerCase(),
      });
      expect(user).not.toHaveProperty("password");

      const createdUser = await User.findOne({ email: payload.email.toLowerCase() }).lean();
      expect(createdUser).not.toBeNull();
      expect(await bcrypt.compare(payload.password as string, createdUser!.password)).toBe(true);
    });

    it("rejects a registration missing required fields", async () => {
      const response = await request(app).post("/api/auth/register").send({ email: "missing@example.com" });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ success: false, message: "username, email, and password are required" });
    });

    it("prevents duplicate registrations", async () => {
      const payload = registerPayload({ username: "duplicate", email: "duplicate@example.com" });

      await request(app).post("/api/auth/register").send(payload).expect(201);
      const duplicateResponse = await request(app).post("/api/auth/register").send(payload);

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body).toMatchObject({ success: false, message: "User already exists" });
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in an existing user with valid credentials", async () => {
      const payload = registerPayload({ username: "loginuser", email: "login@example.com" });
      await request(app).post("/api/auth/register").send(payload).expect(201);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ identifier: payload.email, password: payload.password });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true, message: "Login successful" });
      const user = extractUser(response.body);
      expect(user).toMatchObject({ email: payload.email.toLowerCase(), username: payload.username });
      expect(user).not.toHaveProperty("password");
    });

    it("rejects invalid credentials", async () => {
      const payload = registerPayload({ username: "wrongpass", email: "wrongpass@example.com" });
      await request(app).post("/api/auth/register").send(payload).expect(201);

      const response = await request(app)
        .post("/api/auth/login")
        .send({ identifier: payload.email, password: "incorrect" });

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ success: false, message: "Invalid credentials" });
    });
  });

  describe("Authenticated user routes", () => {
    const authenticate = async () => {
      const payload = registerPayload({ username: "profileuser", email: "profile@example.com" });
      const registerResponse = await request(app).post("/api/auth/register").send(payload).expect(201);
      return { token: registerResponse.body.token as string, payload };
    };

    it("requires a bearer token", async () => {
      const response = await request(app).get("/api/auth/me");
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ success: false, message: "No token provided" });
    });

    it("returns the authenticated user's profile", async () => {
      const { token, payload } = await authenticate();

      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({ success: true, message: "Authenticated user" });
      const user = extractUser(response.body);
      expect(user).toMatchObject({ email: payload.email.toLowerCase(), username: payload.username });
    });

    it("updates the user profile", async () => {
      const { token } = await authenticate();

      const response = await request(app)
        .put("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ displayName: "Trail Runner", bio: "Loves elevation" })
        .expect(200);

      expect(response.body).toMatchObject({ success: true });
      const user = extractUser(response.body);
      expect(user).toMatchObject({ displayName: "Trail Runner", bio: "Loves elevation" });
    });
  });
});
