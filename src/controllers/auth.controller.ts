import { Request, Response, NextFunction } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../utils/prisma.js";
import { logAudit } from "../utils/auditLogger.js";
import { sendEmail } from "../utils/email.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;

/**
 * Controller for User Registration.
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        status: "fail",
        message: "Email is already registered",
      });
      return;
    }

    // Hash password with Argon2
    const passwordHash = await argon2.hash(password);

    // Save User in DB
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for User Login with Session Creation.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find User by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
      return;
    }

    // Verify Password using Argon2
    const isPasswordValid = await argon2.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      res.status(401).json({
        status: "fail",
        message: "Invalid email or password",
      });
      return;
    }

    // Generate Access Token (15 minutes)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Generate Refresh Token (7 days)
    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Hash Refresh Token before saving to DB Session table
    const refreshTokenHash = await argon2.hash(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store Session in Database
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        expiresAt,
      },
    });

    // Audit Log for successful login
    await logAudit({
      userId: user.id,
      action: "login",
      entityType: "User",
      entityId: user.id,
      req,
    });

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for refreshing Access Token using Refresh Token.
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    // Verify Refresh Token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      res.status(401).json({
        status: "fail",
        message: "Invalid or expired refresh token",
      });
      return;
    }

    // Find active sessions for the user
    const activeSessions = await prisma.session.findMany({
      where: {
        userId: decoded.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    // Check if any session's refreshTokenHash matches the provided refreshToken
    let validSession = null;
    for (const session of activeSessions) {
      const isMatch = await argon2.verify(session.refreshTokenHash, refreshToken);
      if (isMatch) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
      res.status(401).json({
        status: "fail",
        message: "Invalid session or refresh token revoked",
      });
      return;
    }

    // Generate new Access Token (15 minutes)
    const newAccessToken = jwt.sign(
      { userId: validSession.user.id, email: validSession.user.email },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Generate new Refresh Token (7 days)
    const newRefreshToken = jwt.sign(
      { userId: validSession.user.id },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    const newRefreshTokenHash = await argon2.hash(newRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Rotate token in database (Update existing session)
    await prisma.session.update({
      where: { id: validSession.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
      },
    });

    res.status(200).json({
      status: "success",
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for User Logout (revoking session).
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
      // If token is expired or malformed, we still attempt logout gracefully
      res.status(200).json({
        status: "success",
        message: "Logged out successfully",
      });
      return;
    }

    // Find active sessions for the user
    const userSessions = await prisma.session.findMany({
      where: {
        userId: decoded.userId,
      },
    });

    // Find and delete matching session
    for (const session of userSessions) {
      const isMatch = await argon2.verify(session.refreshTokenHash, refreshToken);
      if (isMatch) {
        await prisma.session.delete({
          where: { id: session.id },
        });
        break;
      }
    }

    res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to get all active sessions for the current user.
 */
export const getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ status: "fail", message: "Unauthorized" });
      return;
    }

    const sessions = await prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      status: "success",
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to revoke a specific session.
 */
export const revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.params.sessionId as string;

    if (!userId) {
      res.status(401).json({ status: "fail", message: "Unauthorized" });
      return;
    }

    // Verify session belongs to user
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      res.status(404).json({ status: "fail", message: "Session not found" });
      return;
    }

    await prisma.session.delete({
      where: { id: sessionId },
    });

    res.status(200).json({
      status: "success",
      message: "Session revoked successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller for Password Reset Request (Forgot Password).
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Return 200 to prevent email enumeration
      res.status(200).json({ status: "success", message: "If that email exists, a reset link has been sent." });
      return;
    }

    const resetTokenStr = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token: resetTokenStr,
        userId: user.id,
        expiresAt,
      }
    });

    // Send email with reset token
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetTokenStr}`;
    await sendEmail({
      to: email,
      subject: "Password Reset Request",
      text: `You requested a password reset. Please go to this link to reset your password: ${resetUrl}`,
      html: `<p>You requested a password reset.</p><p>Please <a href="${resetUrl}">click here</a> to reset your password.</p>`
    });

    res.status(200).json({ status: "success", message: "If that email exists, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to Reset Password using Token.
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      res.status(400).json({ status: "fail", message: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await argon2.hash(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
      // Optional: revoke all existing sessions to force re-login
      prisma.session.deleteMany({
        where: { userId: resetToken.userId }
      })
    ]);

    res.status(200).json({ status: "success", message: "Password has been successfully reset. Please login with your new password." });
  } catch (error) {
    next(error);
  }
};
