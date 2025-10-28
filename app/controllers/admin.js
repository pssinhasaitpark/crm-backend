import bcrypt from "bcryptjs";
import Admin from "../models/admin.js";
import { handleResponse } from "../utils/helper.js";
import { registerAdminValidator, loginAdminValidator } from "../validators/admin.js";
import { signAccessToken } from "../middlewares/jwtAuth.js";

const registerAdmin = async (req, res) => {
  try {
    const { error } = registerAdminValidator.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((err) => err.message.replace(/["\\]/g, ""));
      return handleResponse(res, 400, messages.join(", "));
    }

    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return handleResponse(res, 400, "Admin already exists. Only one admin allowed.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      status: "active",
      role: "admin"
    });

    const responseData = {
      id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      status: newAdmin.status,
    };

    return handleResponse(res, 201, "Admin registered successfully", responseData);
  } catch (error) {
    console.error("Register Admin Error:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { error } = loginAdminValidator.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((err) => err.message.replace(/["\\]/g, ""));
      return handleResponse(res, 400, messages.join(", "));
    }

    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      return handleResponse(res, 404, "Admin not found with this email");
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return handleResponse(res, 401, "Invalid credentials");
    }

    const token = signAccessToken(admin._id, "admin", admin.email);

    return handleResponse(res, 200, "Admin Login Successfully", {token});
  } catch (error) {
    console.error("Login Admin Error:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};


export const admin = {
    registerAdmin,
    loginAdmin
}