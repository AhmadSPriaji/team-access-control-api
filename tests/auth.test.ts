import request from "supertest";
import app from "../src/app.js";

describe("Auth Endpoints", () => {
  const testUser = {
    email: "test@example.com",
    password: "Password123!",
    name: "Test User",
  };

  let refreshToken: string;
  let accessToken: string;

  it("should register a new user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("status", "success");
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.email).toEqual(testUser.email);
  });

  it("should not register a user with an existing email", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);
    expect(res.statusCode).toEqual(409); // Conflict
    expect(res.body).toHaveProperty("message", "Email is already registered");
  });

  it("should login successfully and return tokens", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("status", "success");
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");

    // Save tokens for next tests
    accessToken = res.body.data.accessToken;
    refreshToken = res.body.data.refreshToken;
  });

  it("should fail login with incorrect password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: "WrongPassword1!",
    });
    expect(res.statusCode).toEqual(401); // Unauthorized
    expect(res.body).toHaveProperty("message", "Invalid email or password");
  });

  it("should refresh access token and rotate refresh token", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("status", "success");
    expect(res.body.data).toHaveProperty("accessToken");
    expect(res.body.data).toHaveProperty("refreshToken");

    // Update refresh token to the new one rotated
    refreshToken = res.body.data.refreshToken;
  });

  it("should get active sessions", async () => {
    const res = await request(app)
      .get("/api/auth/sessions")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveProperty("sessions");
    expect(Array.isArray(res.body.data.sessions)).toBe(true);
    
    // Save a session ID to test revocation
    if (res.body.data.sessions.length > 0) {
      const sessionId = res.body.data.sessions[0].id;
      
      const revokeRes = await request(app)
        .delete(`/api/auth/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${accessToken}`);
      
      expect(revokeRes.statusCode).toEqual(200);
    }
  });

  it("should logout successfully", async () => {
    const res = await request(app)
      .post("/api/auth/logout")
      .send({ refreshToken });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("status", "success");
  });

  it("should fail to refresh token after logout", async () => {
    const res = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty("message", "Invalid session or refresh token revoked");
  });
});
