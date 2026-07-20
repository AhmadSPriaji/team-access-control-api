import request from "supertest";
import app from "../src/app.js";

describe("Audit Log Endpoints", () => {
  const adminUser = {
    email: "audit_admin@example.com",
    password: "Password123!",
    name: "Audit Admin",
  };

  let accessToken: string;
  let organizationId: string;

  beforeAll(async () => {
    // Register & Login
    await request(app).post("/api/auth/register").send(adminUser);
    const loginRes = await request(app).post("/api/auth/login").send({
      email: adminUser.email,
      password: adminUser.password,
    });
    accessToken = loginRes.body.data.accessToken;

    // Create Organization (this should log org.created automatically)
    const orgRes = await request(app)
      .post("/api/organizations")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ name: "Audit Corp" });
    organizationId = orgRes.body.data.id;
  });

  it("should retrieve audit logs and find org.created event", async () => {
    const res = await request(app)
      .get(`/api/organizations/${organizationId}/audit-logs`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toBeInstanceOf(Array);
    
    const logs = res.body.data;
    const orgCreatedLog = logs.find((log: any) => log.action === "org.created");
    
    expect(orgCreatedLog).toBeDefined();
    expect(orgCreatedLog.entityType).toEqual("Organization");
  });

  it("should filter audit logs by action", async () => {
    const res = await request(app)
      .get(`/api/organizations/${organizationId}/audit-logs?action=org.created`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data.every((log: any) => log.action === "org.created")).toBeTruthy();
  });
});
