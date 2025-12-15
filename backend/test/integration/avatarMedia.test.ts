import { afterAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import request from "supertest";

import app from "../../src/app.js";
import User from "../../src/models/User.js";
import * as cloudinaryService from "../../src/services/cloudinaryService.js";

const createTempImage = (): string => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "avatar-test-"));
  const filePath = path.join(tempDir, `${crypto.randomUUID()}.png`);
  fs.writeFileSync(filePath, crypto.randomBytes(64));
  return filePath;
};

describe("Avatar media endpoints", () => {
  const uploadSpy = jest.spyOn(cloudinaryService, "uploadImageBuffer");

  beforeEach(() => {
    uploadSpy.mockReset();
    uploadSpy.mockResolvedValue({
      url: "http://cdn.test/avatar.png",
      secureUrl: "https://cdn.test/avatar.png",
      publicId: "avatar-123",
    });
  });

  afterAll(() => {
    uploadSpy.mockRestore();
  });

  const register = async () => {
    const payload = {
      username: `avatar-${Math.random().toString(16).slice(2, 8)}`,
      email: `avatar-${Math.random().toString(16).slice(2, 8)}@example.com`,
      password: "Passw0rd!",
    };

    const response = await request(app).post("/api/auth/register").send(payload);
    expect(response.status).toBe(201);
    return { token: response.body.token as string, userId: response.body.user.id as string };
  };

  it("rejects avatar upload without a file", async () => {
    const { token } = await register();

    const response = await request(app)
      .post("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: "No avatar file provided" });
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("uploads avatar, stores Cloudinary url, and returns sanitized profile", async () => {
    const { token, userId } = await register();
    const tempFile = createTempImage();

    const response = await request(app)
      .post("/api/users/me/avatar")
      .set("Authorization", `Bearer ${token}`)
      .attach("avatar", tempFile)
      .expect(201);

    expect(uploadSpy).toHaveBeenCalledTimes(1);
    expect(response.body).toMatchObject({ success: true });
    expect(response.body.data).toMatchObject({ avatar: "https://cdn.test/avatar.png" });

    const updatedUser = await User.findById(userId).lean();
    expect(updatedUser?.avatar).toBe("https://cdn.test/avatar.png");
  });
});
