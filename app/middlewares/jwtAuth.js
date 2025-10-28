//app/middlewares/jwtAuth.js
import jwt from "jsonwebtoken";
import User from '../models/users/user.js';
import Admin from "../models/admin.js";
import crypto from "crypto";
import { handleResponse } from "../utils/helper.js";

export const generateToken = (userId, user_role, userEmail, secret, expiresIn = process.env.EXPIRATION_TIME) => {
  return new Promise((resolve, reject) => {
    const payload = {
      aud: "parkhya.in",
      user_id: userId,
      user_role: user_role,
      email: userEmail,
    };

    const options = {
      subject: `${userId}`,
      expiresIn,
    };

    jwt.sign(payload, secret, options, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
};

export const signAccessToken = (userId, role, email) => {
  return jwt.sign(
    { user_id: userId, role, email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};

export const signResetToken = ({ email, userId, role }) => {
  return new Promise((resolve, reject) => {
    const payload = { email, userId, role };
    const options = { expiresIn: process.env.EXPIRATION_TIME || '1h' };

    jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, options, (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
};

export const encryptToken = (token) => {
  const key = crypto.createHash("sha256").update(process.env.ACCESS_TOKEN_SECRET).digest();

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(process.env.ACCESS_TOKEN_SECRET).slice(0, 16)
  );
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

export const decryptToken = (encryptedToken) => {
  const key = crypto.createHash("sha256").update(process.env.ACCESS_TOKEN_SECRET).digest();

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    key,
    Buffer.from(process.env.ACCESS_TOKEN_SECRET).slice(0, 16)
  );
  let decrypted = decipher.update(encryptedToken, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

export const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return handleResponse(res, 403, "Access denied. Admin only route.");
  }
  next();
};
/*
export const verifyToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return handleResponse(res, 403, "Access Denied. No token provided.");

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    let user;
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.user_id || decoded.id);
    } else {
      user = await User.findById(decoded.user_id || decoded.id);
    }

    if (!user) return handleResponse(res, 403, "User not found or unauthorized.");

    req.user = {
      id: user._id.toString(),
      role: decoded.role,
      name: user.name || user.full_name,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    if (error instanceof jwt.JsonWebTokenError)
      return handleResponse(res, 403, "Invalid token.");
    if (error instanceof jwt.TokenExpiredError)
      return handleResponse(res, 403, "Token expired.");
    return handleResponse(res, 500, "Internal Server Error");
  }
};
*/

import AssociateUser from "../models/users/associateUsers.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return handleResponse(res, 403, "Access Denied. No token provided.");

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    let user;

    // ✅ Check for user based on role
    if (decoded.role === "admin") {
      user = await Admin.findById(decoded.user_id || decoded.id);
    } else if (["agent", "channel_partner"].includes(decoded.role)) {
      // Try to find in main User collection first
      user = await User.findById(decoded.user_id || decoded.id);

      // If not found, check AssociateUser collection
      if (!user) {
        user = await AssociateUser.findById(decoded.user_id || decoded.id);
      }
    }

    if (!user) {
      return handleResponse(res, 403, "User not found or unauthorized.");
    }

    // ✅ Attach minimal user info to request
    req.user = {
      id: user._id.toString(),
      role: decoded.role,
      name: user.full_name || user.name,
      email: user.email,
      company: user.company,
      company_name: user.company_name,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    if (error instanceof jwt.JsonWebTokenError)
      return handleResponse(res, 403, "Invalid token.");
    if (error instanceof jwt.TokenExpiredError)
      return handleResponse(res, 403, "Token expired.");
    return handleResponse(res, 500, "Internal Server Error");
  }
};