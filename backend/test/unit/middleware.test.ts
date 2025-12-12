import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";
import { authMiddleware } from "../../src/middlewares/auth.js";
import User from "../../src/models/User.js";
import { verifyAccessToken } from "../../src/services/tokenService.js";

jest.mock("../../src/services/tokenService.js", () => ({
	verifyAccessToken: jest.fn(),
}));

type MockResponse = Response & { status: jest.Mock; json: jest.Mock };

const createMockResponse = (): MockResponse => {
	const res = {} as MockResponse;
	res.status = jest.fn(() => res);
	res.json = jest.fn(() => res);
	return res;
};

const mockVerifyAccessToken = verifyAccessToken as jest.MockedFunction<typeof verifyAccessToken>;

const createMockNext = (): jest.MockedFunction<NextFunction> =>
	jest.fn() as unknown as jest.MockedFunction<NextFunction>;

describe("authMiddleware", () => {
	beforeEach(() => {
		mockVerifyAccessToken.mockReset();
	});

	it("rejects requests without bearer token", async () => {
		const req = { headers: {} } as Request;
		const res = createMockResponse();
		const next = createMockNext();

		await authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ success: false, message: "No token provided" });
		expect(next).not.toHaveBeenCalled();
	});

	it("rejects when token verification fails", async () => {
		const req = { headers: { authorization: "Bearer invalid" } } as Request;
		const res = createMockResponse();
		const next = createMockNext();

		mockVerifyAccessToken.mockImplementation(() => {
			throw new Error("Invalid token");
		});

		await authMiddleware(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ success: false, message: "Token is not valid" });
		expect(next).not.toHaveBeenCalled();
	});

	it("attaches the user and calls next when token is valid", async () => {
		const req = { headers: { authorization: "Bearer valid" } } as Parameters<typeof authMiddleware>[0];
		const res = createMockResponse();
		const next = createMockNext();
		const userDoc = { _id: "507f1f77bcf86cd799439011", username: "runner" };

		mockVerifyAccessToken.mockReturnValue({ id: userDoc._id });

		const selectMock = jest
			.fn(() => Promise.resolve(userDoc)) as unknown as ReturnType<typeof User.findById>["select"];
		const findByIdSpy = jest.spyOn(User, "findById").mockReturnValue({
			select: selectMock,
		} as unknown as ReturnType<typeof User.findById>);

		await authMiddleware(req, res, next);

		expect(findByIdSpy).toHaveBeenCalledWith(userDoc._id);
		expect(req.user).toEqual(userDoc);
		expect(next).toHaveBeenCalledTimes(1);

		findByIdSpy.mockRestore();
	});
});
