import request from "supertest";
import app from "../src/app.js";

describe("Project Endpoints", () => {
  const ownerUser = {
    email: "project_owner@example.com",
    password: "Password123!",
    name: "Project Owner",
  };

  let accessToken: string;
  let organizationId: string;

  beforeAll(async () => {
    // Register & Login
    await request(app).post("/api/auth/register").send(ownerUser);
    const loginRes = await request(app).post("/api/auth/login").send({
      email: ownerUser.email,
      password: ownerUser.password,
    });
    accessToken = loginRes.body.data.accessToken;

    // Create Organization
    const orgRes = await request(app)
      .post("/api/organizations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Project Corp" });
    organizationId = orgRes.body.data.id;
  });

  it("should create a project", async () => {
    const res = await request(app)
      .post(`/api/organizations/${organizationId}/projects`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Alpha Build",
        description: "Initial alpha testing phase",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.name).toEqual("Alpha Build");
  });

  it("should retrieve projects list", async () => {
    const res = await request(app)
      .get(`/api/organizations/${organizationId}/projects`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.data)).toBeTruthy();
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].name).toEqual("Alpha Build");
  });

  it("should retrieve projects list using API Key (Viewer Role)", async () => {
    // 1. Generate an API Key with viewer role
    const apiKeyRes = await request(app)
      .post(`/api/organizations/${organizationId}/api-keys`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Viewer API Key",
        roleName: "viewer",
      });

    expect(apiKeyRes.statusCode).toEqual(201);
    const rawApiKey = apiKeyRes.body.data.key;

    // 2. Fetch projects using the API Key (No Bearer token)
    const res = await request(app)
      .get(`/api/organizations/${organizationId}/projects`)
      .set("x-api-key", rawApiKey);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body.data)).toBeTruthy();
  });

  it("should create a project using API Key (Member Role)", async () => {
    // 1. Generate an API Key with member role
    const apiKeyRes = await request(app)
      .post(`/api/organizations/${organizationId}/api-keys`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Member API Key",
        roleName: "member",
      });

    expect(apiKeyRes.statusCode).toEqual(201);
    const rawApiKey = apiKeyRes.body.data.key;

    // 2. Create project using the API Key
    const res = await request(app)
      .post(`/api/organizations/${organizationId}/projects`)
      .set("x-api-key", rawApiKey)
      .send({
        name: "API Key Build",
        description: "Created via M2M",
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body.data.name).toEqual("API Key Build");
  });

  it("should fail to create a project using API Key (Viewer Role)", async () => {
    // 1. Generate an API Key with viewer role
    const apiKeyRes = await request(app)
      .post(`/api/organizations/${organizationId}/api-keys`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        name: "Viewer API Key 2",
        roleName: "viewer",
      });

    expect(apiKeyRes.statusCode).toEqual(201);
    const rawApiKey = apiKeyRes.body.data.key;

    // 2. Create project using the API Key (Should fail)
    const res = await request(app)
      .post(`/api/organizations/${organizationId}/projects`)
      .set("x-api-key", rawApiKey)
      .send({
        name: "Viewer Build",
        description: "Created via M2M",
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body.message).toContain("Forbidden");
  });
});
