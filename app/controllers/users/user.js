//app/controllers/users/user.js
import bcrypt from "bcryptjs";
import User from "../../models/users/user.js";
import Company from "../../models/company.js";
import Customer from "../../models/customers.js";
import AssociateUser from "../../models/users/associateUsers.js";
import { handleResponse } from "../../utils/helper.js";
import {
  createUserValidator,
  loginValidator,
  createAssociateValidator,
} from "../../validators/users/user.js";
import { signAccessToken } from "../../middlewares/jwtAuth.js";
import mongoose from "mongoose";

const registerUser = async (req, res) => {
  try {
    const { error } = createUserValidator.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      const messages = error.details.map((err) =>
        err.message.replace(/["\\]/g, "")
      );
      return handleResponse(res, 400, messages.join(", "));
    }

    const {
      full_name,
      email,
      phone_number,
      location,
      company,
      role,
      password,
    } = req.body;

    if (!company || !mongoose.Types.ObjectId.isValid(company)) {
      return handleResponse(res, 400, "Please select a valid company.");
    }

    const existingCompany = await Company.findOne({
      _id: company,
      deleted: false,
    });
    if (!existingCompany) {
      return handleResponse(res, 404, "Company not found or has been deleted.");
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { phone_number }],
    });
    if (existingUser) {
      return handleResponse(
        res,
        409,
        "Email or phone number already registered."
      );
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

    return handleResponse(
      res,
      201,
      `${role} registered successfully`,
      userResponse
    );
  } catch (error) {
    console.error("Register error:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const loginUser = async (req, res) => {
  try {
    const { error } = loginValidator.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((err) =>
        err.message.replace(/["\\]/g, "")
      );
      return handleResponse(res, 400, messages.join(", "));
    }

    const { email, password } = req.body;

    console.log(`🔐 Login attempt for: ${email}`);

    // Step 1️⃣ — Check if user exists in main User collection
    let user = await User.findOne({ email }).select("+password");

    // Step 2️⃣ — If not found, check in AssociateUser collection
    let isAssociate = false;
    if (!user) {
      user = await AssociateUser.findOne({ email }).select("+password");
      if (user) isAssociate = true;
    }

    // Step 3️⃣ — Not found anywhere
    if (!user) {
      return handleResponse(res, 404, "User not found with this email");
    }

    // Step 4️⃣ — Validate status
    if (user.status !== "active") {
      return handleResponse(
        res,
        403,
        "Your Account is Inactive. Please Contact with Admin to make Account Active."
      );
    }

    // Step 5️⃣ — Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return handleResponse(res, 401, "Invalid credentials");
    }

    // Step 6️⃣ — Build JWT payload
    const tokenPayload = {
      id: user._id,
      role: user.role,
      email: user.email,
      company: user.company,
      company_name: user.company_name,
      isAssociate,
    };

    // Step 7️⃣ — Generate token
    const token = signAccessToken(user._id, user.role, user.email, {
      company: user.company,
      company_name: user.company_name,
      isAssociate,
    });

    // Step 8️⃣ — Prepare clean response
    const responseData = {
      id: user._id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      company: user.company_name,
      isAssociate,
      token,
    };

    console.log(
      `✅ Login successful for ${isAssociate ? "Associate" : "Main"} user: ${
        user.full_name
      }`
    );

    return handleResponse(res, 200, "Login successful", responseData);
  } catch (error) {
    console.error("❌ Login error:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const me = async (req, res) => {
  try {
    // 🔍 First try to find in main users
    const user = await User.findById(req.user.id).select(
      "-password -__v -createdBy"
    );

    // 🔍 If not found, try associate users
    if (!user) {
      user = await AssociateUser.findById(req.user.id).select(
        "-password -__v -createdBy"
      );
    }

    if (!user) {
      return handleResponse(res, 404, "User not found.");
    }

    return handleResponse(
      res,
      200,
      "User details fetched successfully",
      user.toObject()
    );
  } catch (error) {
    console.error("Error fetching user details:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return handleResponse(
        res,
        403,
        "Access denied. Only admins can view all users."
      );
    }

    const { role, q = "", page = 1, perPage = 10, includeCustomerDetails } = req.query;
    const filter = {};

    if (role && ["agent", "channel_partner"].includes(role)) {
      filter.role = role;
    }

    if (q) {
      const regex = new RegExp(q, "i");
      const isValidObjectId = mongoose.Types.ObjectId.isValid(q);

      filter.$or = [
        { full_name: regex },
        { email: regex },
        { phone_number: regex },
        { location: regex },
        { company_name: regex },
      ];

      if (isValidObjectId) {
        filter.$or.push({ company: new mongoose.Types.ObjectId(String(q)) });
      }
    }

    const skip = (Number(page) - 1) * Number(perPage);

    const users = await User.find(filter)
      .select("-password -__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(perPage))
      .lean();

    if (!users.length) {
      return handleResponse(res, 404, "No users found for the given criteria.");
    }

    // const usersWithCustomerCount = await Promise.all(
    //   users.map(async (user) => {
    //     let customerCount = 0;

    //     if (user.role === "agent") {
    //       // Customers accepted by this agent
    //       customerCount = await Customer.countDocuments({
    //         acceptedBy: user._id,
    //       });
    //     } else if (user.role === "channel_partner") {
    //       // Customers created by this channel partner
    //       customerCount = await Customer.countDocuments({
    //         "createdBy.id": user._id,
    //       });
    //     }

    //     return { ...user, customerCount };
    //   })
    // );
     const usersWithCounts = await Promise.all(
          users.map(async (user) => {
            let customerCount = 0;
            let associatedCPCount = 0;
    
            if (user.role === "agent") {
              // Customers accepted by this agent
              customerCount = await Customer.countDocuments({ acceptedBy: user._id });
            } 
            else if (user.role === "channel_partner") {
              // Customers created by this channel partner
              customerCount = await Customer.countDocuments({ "createdBy.id": user._id });
    
              // Associated CPs (from AssociateUser model)
              associatedCPCount = await AssociateUser.countDocuments({
                "createdBy.id": user._id,
                role: "channel_partner"
              });
            }
    
            return { ...user, customerCount, associatedCPCount };
          })
        );

    const totalItems = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / perPage);

    return handleResponse(res, 200, "Users fetched successfully", {
      results: usersWithCounts,
      totalItems,
      currentPage: Number(page),
      totalPages,
      totalItemsOnCurrentPage: users.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

export const user = {
  registerUser,
  loginUser,
  me,
  getAllUsers,
};
