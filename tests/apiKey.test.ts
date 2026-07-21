import request from "supertest";
import app from "../src/app.js";

describe("API Key Endpoints", () => {
  const testUser = {
    email: "apikey_owner@example.com",
    password: "Password123!",
    name: "API Key Owner",
  };

  let accessToken: string;
  let organizationId: string;
  let apiKeyId: string;

  beforeAll(async () => {
    // Register & Login to get token
    await request(app).post("/api/auth/register").send(testUser);
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });
    accessToken = res.body.data.accessToken;

    // Create an organization
    const orgRes = await request(app)
      .post("/api/organizations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "API Key Test Corp" });

    organizationId = orgRes.body.data.id;
  });

  it("should generate a new API Key", async () => {
    const res = await request(app)
      .post(`/api/organizations/${organizationId}/api-keys`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Production Key" });

    expect(res.statusCode).toEqual(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data).toHaveProperty("key");
    expect(res.body.data.name).toEqual("Production Key");
    
    apiKeyId = res.body.data.id;
  });

  it("should list API Keys", async () => {
    const res = await request(app)
      .get(`/api/organizations/${organizationId}/api-keys`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.apiKeys).toBeInstanceOf(Array);
    expect(res.body.data.apiKeys.length).toBeGreaterThan(0);
    // Key should not be fully returned in list
    expect(res.body.data.apiKeys[0]).not.toHaveProperty("keyHash");
    expect(res.body.data.apiKeys[0]).toHaveProperty("keyPrefix");
  });

  it("should revoke an API Key", async () => {
    const res = await request(app)
      .delete(`/api/organizations/${organizationId}/api-keys/${apiKeyId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual("API Key revoked successfully");

    // Verify it's deleted
    const listRes = await request(app)
      .get(`/api/organizations/${organizationId}/api-keys`)
      .set("Authorization", `Bearer ${accessToken}`);
    
    expect(listRes.body.data.apiKeys.length).toEqual(0);
  });
});
