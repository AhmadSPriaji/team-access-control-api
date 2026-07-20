import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middlewares/errorHandler.js";
import authRoutes from "./routes/auth.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import invitationRoutes from "./routes/invitation.routes.js";
import projectRoutes from "./routes/project.routes.js";
import auditLogRoutes from "./routes/auditLog.routes.js";
import { setupSwagger } from "./utils/swagger.js";

import { requestId } from "./middlewares/requestId.js";

const app = express();

// Security & Utility Middlewares
app.use(requestId);
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/organizations/:orgId/projects", projectRoutes);
app.use("/api/organizations/:orgId/audit-logs", auditLogRoutes);
app.use("/api/invitations", invitationRoutes);

// Global Error Handler
app.use(errorHandler);

// Setup Swagger UI
setupSwagger(app);

export default app;
