import bcrypt from "bcryptjs";
import Admin from "../models/admin.js";
import User from "../models/users/user.js";
import AssociateUser from "../models/users/associateUsers.js";
import Customer from "../models/customers.js";
import { connectedUsers } from "../utils/socketHandler.js";
import { handleResponse } from "../utils/helper.js";
import {
  registerAdminValidator,
  loginAdminValidator,
  updateAdminValidator,
} from "../validators/admin.js";
import { signAccessToken } from "../middlewares/jwtAuth.js";
import mongoose from "mongoose";

const registerAdmin = async (req, res) => {
  try {
    const { error } = registerAdminValidator.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      const messages = error.details.map((err) =>
        err.message.replace(/["\\]/g, "")
      );
      return handleResponse(res, 400, messages.join(", "));
    }

    const { name, email, password } = req.body;

    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return handleResponse(
        res,
        400,
        "Admin already exists. Only one admin allowed."
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      status: "active",
      role: "admin",
    });

    const responseData = {
      id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      status: newAdmin.status,
    };

    return handleResponse(
      res,
      201,
      "Admin registered successfully",
      responseData
    );
  } catch (error) {
    console.error("Register Admin Error:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { error } = loginAdminValidator.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      const messages = error.details.map((err) =>
        err.message.replace(/["\\]/g, "")
      );
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

    return handleResponse(res, 200, "Admin Login Successfully", { token });
  } catch (error) {
    console.error("Login Admin Error:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const me = async (req, res) => {
  try {
    const adminId = req.user?.id;

    if (!adminId) {
      return handleResponse(res, 401, "Unauthorized! Admin Not Found");
    }

    const admin = await Admin.findById(adminId).select(
      "-password -__v -createdBy -createdAt -updatedAt"
    );

    if (!admin) {
      return handleResponse(res, 404, "Admin not found");
    }

    return handleResponse(
      res,
      200,
      "Admin details fetched successfully",
      admin.toObject()
    );
  } catch (error) {
    console.error("Error fetching Admin details:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const updateUserStatusById = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return handleResponse(res, 403, "Access denied. Admins only.");
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid user ID");
    }

    if (!["active", "inactive"].includes(status)) {
      return handleResponse(res, 400, "Status must be 'active' or 'inactive'");
    }

    let updatedUser = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true, projection: { password: 0 } }
    );

    if (!updatedUser) {
      updatedUser = await AssociateUser.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true, projection: { password: 0 } }
      );
    }

    if (!updatedUser) return handleResponse(res, 404, "User not found");

    // 🔴 Real-time logout if status is inactive
    if (status === "inactive" && req.io) {
      const socketId = connectedUsers.get(updatedUser._id.toString());
      if (socketId) {
        req.io.to(socketId).emit("force-logout", {
          title: "Account Deactivated",
          message:
            "🔴 Your account has been set to Inactive by the Admin. Please contact the Admin to reactivate it.",
          type: "warning",
        });

        // Disconnect the socket
        const socket = req.io.sockets.sockets.get(socketId);
        if (socket) socket.disconnect(true);

        // Remove from connectedUsers map
        connectedUsers.delete(updatedUser._id.toString());
      }
    }

    return handleResponse(
      res,
      200,
      `User status updated to ${status} successfully`,
      updatedUser.toObject()
    );
  } catch (error) {
    console.error("Error updating user status:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const adminBroadcastingCustomerById = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { companyId, agents } = req.body;
    const { role: userRole, id: adminId, name: adminName } = req.user;

    console.log("📤 Admin Broadcast Request:", {
      by: adminName,
      role: userRole,
      companyId,
      customerId,
      agents,
    });

    // 🔐 Allow only admin
    if (userRole !== "admin") {
      return handleResponse(
        res,
        403,
        "Access denied. Only admin can broadcast customers."
      );
    }

    // ✅ Validate IDs
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return handleResponse(res, 400, "Invalid Customer ID.");
    }
    if (!companyId) {
      return handleResponse(res, 400, "Company ID is required.");
    }

    // ✅ Fetch the customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return handleResponse(res, 404, "Customer not found.");
    }

    // ✅ Determine target agents
    let targetAgents = [];

    if (agents === "all") {
      // Broadcast to all active agents of that company
      const [mainAgents, associateAgents] = await Promise.all([
        User.find({
          company: companyId,
          role: "agent",
          status: "active",
        }).select("_id"),
        AssociateUser.find({
          company: companyId,
          role: "agent",
          status: "active",
        }).select("_id"),
      ]);

      targetAgents = [...mainAgents, ...associateAgents].map((a) =>
        a._id.toString()
      );

      if (!targetAgents.length)
        return handleResponse(
          res,
          404,
          "No active agents found for this company."
        );
    } else if (mongoose.Types.ObjectId.isValid(agents)) {
      // Single agent case
      const [userAgent, associateAgent] = await Promise.all([
        User.findOne({
          _id: agents,
          company: companyId,
          role: "agent",
          status: "active",
        }),
        AssociateUser.findOne({
          _id: agents,
          company: companyId,
          role: "agent",
          status: "active",
        }),
      ]);

      const validAgent = userAgent || associateAgent;
      if (!validAgent)
        return handleResponse(
          res,
          400,
          "Invalid agent ID or agent not part of this company."
        );

      targetAgents = [validAgent._id.toString()];
    } else {
      return handleResponse(
        res,
        400,
        'Please provide "all" or a valid agent ID under the "agents" key.'
      );
    }

    // ✅ Update the customer
    customer.is_broadcasted = true;
    customer.broadcasted_to = [
      ...new Set([...(customer.broadcasted_to || []), ...targetAgents]),
    ];
    customer.updatedAt = new Date();
    await customer.save();

    // ✅ Socket notifications (optional)
    if (req.io) {
      targetAgents.forEach((agentId) => {
        req.io.to(agentId).emit("customer_broadcasted", {
          message: "📢 A new customer has been broadcasted to you by admin.",
          customerId: customer._id,
          by: adminName,
        });
      });
    }

    console.log(
      `✅ Admin broadcasted customer ${customerId} to ${targetAgents.length} agent(s).`
    );

    return handleResponse(res, 200, "Customer broadcasted successfully.", {
      customerId: customer._id,
      totalAgents: targetAgents.length,
      agentsBroadcastedTo: targetAgents,
    });
  } catch (error) {
    console.error("❌ Error in adminBroadcastingCustomerById:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getAllAgentsByCompanyId = async (req, res) => {
  try {
    const { companyId } = req.params;

    console.log("📋 Fetching agents for company:", companyId);

    // ✅ Validate companyId
    if (!companyId) {
      return handleResponse(res, 400, "Company ID is required");
    }

    // (Optional) Validate ObjectId if your company IDs are ObjectIds
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return handleResponse(res, 400, "Invalid Company ID");
    }

    // ✅ Fetch agents from both User and AssociateUser
    const [mainAgents, associateAgents] = await Promise.all([
      User.find({ company: companyId, role: "agent", status: "active" })
        .select(
          "_id full_name email phone_number location company company_name role status"
        )
        .lean(),
      AssociateUser.find({
        company: companyId,
        role: "agent",
        status: "active",
      })
        .select(
          "_id full_name email phone_number location company company_name role status createdBy"
        )
        .lean(),
    ]);

    // ✅ Combine both
    const allAgents = [...mainAgents, ...associateAgents];

    if (!allAgents.length) {
      return handleResponse(res, 200, "Company has No Agents.");
    }

    console.log(`✅ Found ${allAgents.length} agents for company ${companyId}`);

    return handleResponse(res, 200, "Agents fetched successfully", {
      results: allAgents,
    });
  } catch (error) {
    console.error("❌ Error fetching agents by company ID:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const updateAdminById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (userRole !== "admin") {
      return handleResponse(
        res,
        403,
        "Access denied. Only admins can update their own details."
      );
    }

    // Validate request body
    const { error, value } = updateAdminValidator.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      const messages = error.details.map((err) =>
        err.message.replace(/["\\]/g, "")
      );
      return handleResponse(res, 400, messages.join(", "));
    }

    // Hash password if it exists
    if (value.password) {
      value.password = await bcrypt.hash(value.password, 10);
      delete value.confirm_password; // remove confirm_password
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(userId, value, {
      new: true,
    });

    return handleResponse(res, 200, "Admin details updated successfully",
      updatedAdmin ? updatedAdmin.toObject() : null
    );
  } catch (err) {
    console.error("Error updating admin details:", err);
    return handleResponse(res, 500, "Server Error or something went wrong.");
  }
};

export const admin = {
  registerAdmin,
  loginAdmin,
  me,
  updateUserStatusById,
  adminBroadcastingCustomerById,
  getAllAgentsByCompanyId,
  updateAdminById,
};
