import request from "supertest";
import app from "../src/app.js";

describe("Organization & Invitation Endpoints", () => {
  const testUser = {
    email: "org_owner@example.com",
    password: "Password123!",
    name: "Org Owner",
  };

  let accessToken: string;
  let organizationId: string;
  let invitationToken: string;

  beforeAll(async () => {
    // Register & Login to get token
    await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });
    accessToken = res.body.data.accessToken;
  });

  it("should create a new organization", async () => {
    const res = await request(app)
      .post("/api/organizations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Test Corp" });

    expect(res.statusCode).toEqual(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.name).toEqual("Test Corp");
    organizationId = res.body.data.id;
  });

  it("should fail to create organization without authentication", async () => {
    const res = await request(app)
      .post("/api/organizations")
      .send({ name: "Hacker Corp" });

    expect(res.statusCode).toEqual(401);
  });

  it("should invite a user (by owner)", async () => {
    const res = await request(app)
      .post(`/api/organizations/${organizationId}/invites`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        email: "invited_member@example.com",
        roleName: "member",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.data).toHaveProperty("token");
    invitationToken = res.body.data.token;
  });

  it("should preview invitation details using token", async () => {
    const res = await request(app).get(`/api/invitations/details?token=${invitationToken}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.email).toEqual("invited_member@example.com");
    expect(res.body.data.organization.name).toEqual("Test Corp");
  });

  it("should allow a new registered user to accept the invitation", async () => {
    // Register the invited user
    await request(app).post("/api/auth/register").send({
      email: "invited_member@example.com",
      password: "Password123!",
      name: "Invited Member",
    });

    // Login to get token
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "invited_member@example.com",
      password: "Password123!",
    });
    const newMemberToken = loginRes.body.data.accessToken;

    // Accept invitation
    const acceptRes = await request(app)
      .post("/api/invitations/accept")
      .set("Authorization", `Bearer ${newMemberToken}`)
      .send({ token: invitationToken });

    expect(acceptRes.statusCode).toEqual(200);
    expect(acceptRes.body.data.membership).toHaveProperty("id");
  });
});
