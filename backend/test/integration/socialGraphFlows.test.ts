import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import FollowRelation from "../../src/models/FollowRelation.js";
import FriendRequest from "../../src/models/FriendRequest.js";

const registerUser = async () => {
  const payload = {
    username: `user-${Math.random().toString(16).slice(2, 8)}`,
    email: `user-${Math.random().toString(16).slice(2, 8)}@example.com`,
    password: "Passw0rd!",
  };

  const response = await request(app).post("/api/auth/register").send(payload);
  expect(response.status).toBe(201);
  return { token: response.body.token as string, userId: response.body.user.id as string };
};

describe("Social graph flows", () => {
  it("follows and unfollows other users", async () => {
    const follower = await registerUser();
    const target = await registerUser();

    const followResponse = await request(app)
      .post(`/api/follow/${target.userId}`)
      .set("Authorization", `Bearer ${follower.token}`)
      .expect(201);

    expect(followResponse.body).toMatchObject({ success: true });
    const relation = await FollowRelation.findOne({ followerId: follower.userId, followingId: target.userId });
    expect(relation).not.toBeNull();

    const selfFollowResponse = await request(app)
      .post(`/api/follow/${follower.userId}`)
      .set("Authorization", `Bearer ${follower.token}`)
      .expect(400);
    expect(selfFollowResponse.body).toMatchObject({ message: "Cannot follow yourself" });

    const unfollowResponse = await request(app)
      .delete(`/api/follow/${target.userId}`)
      .set("Authorization", `Bearer ${follower.token}`)
      .expect(200);

    expect(unfollowResponse.body).toMatchObject({ success: true });
    const remaining = await FollowRelation.findOne({ followerId: follower.userId, followingId: target.userId });
    expect(remaining).toBeNull();
  });

  it("suggests new users to follow", async () => {
    const actor = await registerUser();
    const followed = await registerUser();
    const suggested = await registerUser();

    await request(app)
      .post(`/api/follow/${followed.userId}`)
      .set("Authorization", `Bearer ${actor.token}`)
      .expect(201);

    const response = await request(app)
      .get("/api/friends/suggestions")
      .set("Authorization", `Bearer ${actor.token}`)
      .expect(200);

    expect(response.body).toMatchObject({ success: true });
    const suggestionIds = response.body.data.map((entry: { id: string }) => entry.id);
    expect(suggestionIds).toContain(suggested.userId);
    expect(suggestionIds).not.toContain(actor.userId);
    expect(suggestionIds).not.toContain(followed.userId);
  });

  it("handles friend request lifecycle", async () => {
    const sender = await registerUser();
    const receiver = await registerUser();

    const creationResponse = await request(app)
      .post("/api/friend-requests")
      .set("Authorization", `Bearer ${sender.token}`)
      .send({ receiverId: receiver.userId })
      .expect(201);

    expect(creationResponse.body).toMatchObject({ success: true });
    const requestId = creationResponse.body.data._id as string;
    const stored = await FriendRequest.findById(requestId).lean();
    expect(stored?.status).toBe("pending");

    const incoming = await request(app)
      .get("/api/friend-requests")
      .set("Authorization", `Bearer ${receiver.token}`)
      .expect(200);

    expect(incoming.body.data[0]).toMatchObject({ id: requestId, status: "pending" });

    const acceptResponse = await request(app)
      .post(`/api/friend-requests/${requestId}/accept`)
      .set("Authorization", `Bearer ${receiver.token}`)
      .expect(200);

    expect(acceptResponse.body).toMatchObject({ success: true });
    expect(acceptResponse.body.data).toMatchObject({ status: "accepted" });

    const outgoing = await request(app)
      .get("/api/friend-requests")
      .query({ direction: "outgoing" })
      .set("Authorization", `Bearer ${sender.token}`)
      .expect(200);

    expect(outgoing.body.data[0]).toMatchObject({ id: requestId, status: "accepted" });
  });
});
