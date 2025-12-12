import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type UploadStreamCallback = (error: unknown, result: unknown) => void;
type UploadStreamReturn = { end: (buffer?: Buffer) => void };
type UploadStreamFn = (options: Record<string, unknown>, callback: UploadStreamCallback) => UploadStreamReturn;

const uploadStreamMock = jest.fn();
const configMock = jest.fn();

jest.mock("cloudinary", () => ({
  __esModule: true,
  v2: {
    config: configMock,
    uploader: {
      upload_stream: uploadStreamMock,
    },
  },
}));

import { uploadImageBuffer } from "../../src/services/cloudinaryService.js";
import { v2 as cloudinary } from "cloudinary";

describe("cloudinaryService", () => {
  beforeEach(() => {
    uploadStreamMock.mockReset();
  });

  it("uploads a buffer and resolves with Cloudinary result", async () => {
    uploadStreamMock.mockImplementation((_options: unknown, callback: UploadStreamCallback) => {
      callback(undefined, {
        url: "http://cdn.example.com/avatar.jpg",
        secure_url: "https://cdn.example.com/avatar.jpg",
        public_id: "avatar-123",
      });
      return { end: jest.fn() } as UploadStreamReturn;
    });

    const buffer = Buffer.from("avatar-bytes");
    const result = await uploadImageBuffer(buffer, { folder: "runiverse/avatars", publicId: "user-1" });

    expect(cloudinary.config).toHaveBeenCalled();
    expect(uploadStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({ folder: "runiverse/avatars", public_id: "user-1", overwrite: true }),
      expect.any(Function)
    );
    expect(result).toEqual({
      url: "http://cdn.example.com/avatar.jpg",
      secureUrl: "https://cdn.example.com/avatar.jpg",
      publicId: "avatar-123",
    });
  });

  it("rejects when Cloudinary reports an error", async () => {
    uploadStreamMock.mockImplementation((_options: unknown, callback: UploadStreamCallback) => {
      callback({ message: "upload failed" }, undefined);
      return { end: jest.fn() } as UploadStreamReturn;
    });

    await expect(uploadImageBuffer(Buffer.from("broken"))).rejects.toMatchObject({ message: "upload failed" });
  });

  it("rejects when Cloudinary returns no result", async () => {
    uploadStreamMock.mockImplementation((_options: unknown, callback: UploadStreamCallback) => {
      callback(undefined, undefined);
      return { end: jest.fn() } as UploadStreamReturn;
    });

    await expect(uploadImageBuffer(Buffer.from("no-result"))).rejects.toThrow("Cloudinary upload failed");
  });
});
