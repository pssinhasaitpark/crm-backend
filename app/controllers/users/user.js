//app/controllers/users/user.js
import bcrypt from "bcryptjs";
import User from "../../models/users/user.js";
import Company from "../../models/company.js";
import Customer from "../../models/customers.js";
import { handleResponse } from "../../utils/helper.js";
import { createUserValidator, loginValidator, createAssociateValidator } from "../../validators/users/user.js";
import { signAccessToken } from "../../middlewares/jwtAuth.js";
import mongoose from "mongoose";

const registerUser = async (req, res) => {
  try {
    const { error } = createUserValidator.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((err) => err.message.replace(/["\\]/g, ""));
      return handleResponse(res, 400, messages.join(", "));
    }

    const { full_name, email, phone_number, location, company, role, password, } = req.body;

    if (!company || !mongoose.Types.ObjectId.isValid(company)) {
      return handleResponse(res, 400, "Please select a valid company.");
    }

    const existingCompany = await Company.findOne({ _id: company, deleted: false });
    if (!existingCompany) {
      return handleResponse(res, 404, "Company not found or has been deleted.");
    }

    const existingUser = await User.findOne({ $or: [{ email }, { phone_number }] });
    if (existingUser) {
      return handleResponse(res, 409, "Email or phone number already registered.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      full_name,
      email,
      phone_number,
      // personal_phone_number,
      location,
      company,
      company_name: existingCompany.companyName,
      role,
      password: hashedPassword,
      status: "active",
    });

    const userResponse = {
      id: newUser._id,
      full_name: newUser.full_name,
      email: newUser.email,
      company: newUser.company_name,
      role: newUser.role,
      status: newUser.status,
    };

    return handleResponse(res, 201, `${role} registered successfully`, userResponse);
  } catch (error) {
    console.error("Register error:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const loginUser = async (req, res) => {
  try {
    const { error } = loginValidator.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((err) => err.message.replace(/["\\]/g, ""));
      return handleResponse(res, 400, messages.join(", "));
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return handleResponse(res, 404, "User not found with this email");
    }

    if (user.status !== "active") {
      return handleResponse(res, 403, "Your account is inactive. Please contact admin.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return handleResponse(res, 401, "Invalid credentials");
    }

    const token = signAccessToken(user._id, user.role, user.email);

    const responseData = {
      id: user._id,
      // full_name: user.full_name,
      // email: user.email,
      role: user.role,
      token,
    };

    return handleResponse(res, 200, "Login successful", responseData);
  } catch (error) {
    console.error("Login error:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }        
};

const me = async (req, res) => {
  try {

    const user = await User.findById(req.user.id).select("-password -__v -createdBy");

    if (!user) {
      return handleResponse(res, 404, "User not found.");
    }

    return handleResponse(res, 200, "User details fetched successfully", user.toObject());
  } catch (error) {
    console.error("Error fetching user details:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const meh = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v -createdBy");
    if (!user) {
      return handleResponse(res, 404, "User not found.");
    }

    let responseData = user.toObject();

    // Add customer/lead stats based on role
    if (user.role === "channel_partner") {
      // For CP: Count all customers created by them
      const totalCustomers = await Customer.countDocuments({ "createdBy.id": user._id });
      const statusCounts = await Customer.aggregate([
        { $match: { "createdBy.id": user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      responseData.customers = {
        total: totalCustomers,
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
      };
    } else if (user.role === "agent") {
      // For Agent: Count all leads assigned to their company
      const totalLeads = await Customer.countDocuments({ company: user.company });
      const statusCounts = await Customer.aggregate([
        { $match: { company: user.company } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      responseData.leads = {
        total: totalLeads,
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
      };
    }

    return handleResponse(res, 200, "User details fetched successfully", responseData);
  } catch (error) {
    console.error("Error fetching user details:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

export const user = {       
  registerUser,
  loginUser,
  me,
};