// app/controllers/customers.js
import { nanoid } from "nanoid";
import CustomerLink from "../models/customerLink.js";
import Customer from "../models/customers.js";
import User from "../models/users/user.js";
import Customers from "../models/customers.js";
import Project from "../models/projects.js";
import mongoose from "mongoose";
import { handleResponse } from "../utils/helper.js";
import { customerValidators } from "../validators/customers.js";
import MasterStatus from "../models/masterStatus.js";

const createCustomer = async (req, res) => {
  try {
    const user = req.user; // logged-in user

    if (!["agent", "channel_partner", "admin"].includes(user.role)) {
      return handleResponse(
        res,
        403,
        "Access Denied. Only Agents, Channel Partners, or Admins can create customers."
      );
    }

    const { error } = customerValidators.validate(req.body, {
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
      phone_number,
      email,
      personal_phone_number,
      project,
      company,
    } = req.body;

    // ✅ Duplicate checks
    const existingPhone = await Customer.findOne({ phone_number });
    if (existingPhone)
      return handleResponse(res, 409, "Phone number already registered.");

    const existingEmail = await Customer.findOne({ email });
    if (existingEmail)
      return handleResponse(res, 409, "Email already registered.");

    // ✅ Validate Project
    if (!mongoose.Types.ObjectId.isValid(project))
      return handleResponse(res, 400, "Invalid Project ID format.");

    const projectDoc = await Project.findById(project);
    if (!projectDoc) return handleResponse(res, 404, "Project not found.");

    // ✅ Determine assigned company
    let assignedCompany;
    if (user.role === "channel_partner" || user.role === "admin") {
      if (!company) return handleResponse(res, 400, "Company ID is required.");
      if (!mongoose.Types.ObjectId.isValid(company))
        return handleResponse(res, 400, "Invalid Company ID format.");
      assignedCompany = company;
    } else {
      assignedCompany = user.company;
    }

    // ✅ Fetch all active agents under the selected company
    const agents = await User.find({
      company: assignedCompany,
      role: "agent",
      status: "active",
    }).select("_id full_name email");

    // ✅ Create the customer
    const newCustomer = await Customer.create({
      full_name,
      phone_number,
      email,
      personal_phone_number,
      project,
      company: assignedCompany,
      status: "New", // ✅ Always start as "New"
      isAccepted: false, // ✅ Not accepted yet
      createdBy: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      acceptedBy: null,
      is_broadcasted: true,
      broadcasted_to: agents.map((a) => a._id),
    });

    const responseData = newCustomer.toObject();
    delete responseData.createdBy;

    // ✅ Log broadcast info for debugging
    console.log("\n============================");
    console.log(`📢 Broadcasting new customer to Company [${assignedCompany}]`);
    console.log(`👤 Created by: ${user.name} (${user.role})`);
    console.log(`👥 Agents receiving broadcast (${agents.length}):`);
    agents.forEach((agent) => {
      console.log(`   - ${agent.full_name} (${agent._id})`);
    });
    console.log("============================\n");

    // ✅ Socket Broadcast to all agents of that company
    req.io.to(assignedCompany.toString()).emit("customer-created", {
      customer: responseData,
      message: `📢 New customer created by ${user.full_name}`,
    });

    return handleResponse(
      res,
      201,
      "Customer created successfully",
      responseData
    );
  } catch (error) {
    console.error("❌ Error Creating Customer:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    console.log(
      "\n📋 Fetching customers for:",
      user.role,
      "-",
      user.full_name || user.name || user._id
    );

    // 👑 ADMIN — get everything
    if (user.role === "admin") {
      query = {};
    }

    // 🧑‍💼 CHANNEL PARTNER — get customers they created (regardless of accepted or not)
    else if (user.role === "channel_partner") {
      query = {
        $or: [
          { "createdBy.id": user._id?.toString() },
          { "createdBy.id": user.id?.toString() },
        ],
      };
    }

    // 🧍 AGENT — get customers they accepted
    else if (user.role === "agent") {
      query = {
        acceptedBy: user._id?.toString() || user.id?.toString(),
        isAccepted: true,
      };
    }

    // 🚫 INVALID ROLE
    else {
      console.log("🚫 Unauthorized role:", user.role);
      return handleResponse(res, 403, "Access Denied.");
    }

    console.log("🔍 Query Used:", JSON.stringify(query, null, 2));

    const customers = await Customers.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (!customers.length) {
      console.log("📭 No customers found for this user.");
      return handleResponse(res, 200, "No customers found.", { results: [] });
    }

    console.log(`✅ Found ${customers.length} customers for ${user.role}`);

    // Optional: Show accepted ones separately in logs
    const accepted = customers.filter((c) => c.isAccepted);
    console.log(`📦 Accepted Customers: ${accepted.length}`);

    return handleResponse(res, 200, "Customers fetched successfully", {
      results: customers,
    });
  } catch (error) {
    console.error("❌ Error Fetching Customers:", error);
    return handleResponse(res, 500, "Internal Server Error.");
  }
};

const getCustomersById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid customer ID format.");
    }

    const customer = await Customers.findById(id)
      .populate("project", "project_title location")
      .lean();

    if (!customer) {
      return handleResponse(res, 404, "Customer not found.");
    }

    if (user.role !== "admin") {
      if (customer.createdBy?.id.toString() !== user.id.toString()) {
        return handleResponse(
          res,
          403,
          "Access denied. You can only view your own customers."
        );
      }
    }

    if (["agent", "channel_partner"].includes(user.role)) {
      delete customer.createdBy;
    }

    return handleResponse(res, 200, "Customer fetched successfully", customer);
  } catch (error) {
    console.error(`Error Getting Customers`, error);
    return handleResponse(res, 500, `Internal Server Error.`);
  }
};

const generateCustomerLink = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "channel_partner") {
      return handleResponse(
        res,
        403,
        "Only Channel Partners can generate customer links"
      );
    }

    const code = nanoid(10);

    await CustomerLink.create({
      code,
      createdBy: {
        id: user._id || user.id,
        name: user.full_name || user.name || "Unknown",
        role: user.role,
      },
    });

    const registrationLink = `${process.env.FRONTEND_URL}/register/customer/${code}`;

    return handleResponse(res, 200, "Customer link generated successfully", {
      link: registrationLink,
    });
  } catch (error) {
    console.error("Error generating customer link:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const createCustomerFromLink = async (req, res) => {
  try {
    const { code } = req.params;

    // 1️⃣ Validate link
    const link = await CustomerLink.findOne({ code });
    if (!link)
      return handleResponse(res, 400, "Invalid or expired customer link");

    // 2️⃣ Find the creator (Channel Partner / Agent)
    const creator = await User.findById(link.createdBy.id);
    if (!creator) return handleResponse(res, 404, "Creator not found");

    // 3️⃣ Validate customer fields
    const { full_name, email, phone_number, personal_phone_number, project } =
      req.body;
    if (
      !full_name ||
      !email ||
      !phone_number ||
      !personal_phone_number ||
      !project
    )
      return handleResponse(res, 400, "Missing required fields");

    // 4️⃣ Create new customer
    const customer = await Customer.create({
      full_name,
      email,
      phone_number,
      personal_phone_number,
      project,
      createdBy: {
        id: creator._id,
        name: creator.full_name,
        role: creator.role,
      },
      company: creator.company, // Important for room targeting
    });

    // 5️⃣ Delete link (one-time use)
    await CustomerLink.deleteOne({ code });

    // 6️⃣ Emit socket event to all agents of same company
    if (req.io && creator.company) {
      const companyId = creator.company.toString();

      console.log("============================");
      console.log(`📢 Broadcasting new customer to Company [${companyId}]`);
      console.log(`👤 Created by: ${creator.full_name} (${creator.role})`);

      // Optional debug — list all agents in company
      const socketsInRoom = req.io.sockets.adapter.rooms.get(companyId);
      console.log(
        "👥 Agents receiving broadcast:",
        socketsInRoom ? socketsInRoom.size : 0
      );

      // Emit to all connected agents in that company
      req.io.to(companyId).emit("customer-created", {
        message: "New customer created",
        customer,
        createdBy: {
          id: creator._id,
          name: creator.full_name,
          role: creator.role,
        },
      });
      console.log("============================");
    }

    // 7️⃣ Respond to frontend
    return handleResponse(
      res,
      201,
      "Customer created successfully",
      customer.toObject()
    );
  } catch (error) {
    console.error("Error creating customer:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getCustomerStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return handleResponse(res, 404, "User not found.");

    const { status } = req.query;
    console.log(`📊 Fetching data for: ${user.full_name} (${user.role}), status: ${status || "ALL"}`);

    // === CASE 1: If ?status=XYZ → Return filtered customer list ===
    if (status) {
      let query = {};

      if (user.role === "admin") {
        query = { status };
      } else if (user.role === "channel_partner") {
        query = { "createdBy.id": user._id, status };
      } else if (user.role === "agent") {
        query = {
          $and: [
            { $or: [{ acceptedBy: user._id }, { broadcasted_to: user._id }] },
            { status },
          ],
        };
      } else {
        return handleResponse(res, 403, "Access Denied");
      }

      const customers = await Customer.find(query)
        .sort({ createdAt: -1 })
        .lean();

      if (!customers.length) {
        return handleResponse(res, 200, "No customers found for this status", {
          results: [],
          total: 0,
        });
      }

      // 🧹 Clean response and inject "New" in history if missing
      const cleaned = customers.map((cust) => {
        const {
          _id,
          full_name,
          phone_number,
          email,
          project,
          personal_phone_number,
          company,
          status,
          createdAt,
          updatedAt,
          __v,
          status_history = [],
        } = cust;

        let history = [...status_history];

        // ✅ Add "New" status if not present already
        const hasNew = history.some((s) => s.status === "New");
        if (!hasNew) {
          history.unshift({
            id: cust.acceptedBy || cust.createdBy?.id || user._id,
            role: cust.createdBy?.role || "agent",
            status: "New",
            updated_at: cust.createdAt,
            _id: new mongoose.Types.ObjectId(),
          });
        }

        return {
          _id,
          full_name,
          phone_number,
          email,
          project,
          personal_phone_number,
          company,
          status,
          status_history: history,
          createdAt,
          updatedAt,
          __v,
        };
      });

      return handleResponse(res, 200, "Customers fetched successfully", {
        results: cleaned,
        total: cleaned.length,
      });
    }

    // === CASE 2: No ?status param → Return dashboard stats ===
    const masterStatuses = await MasterStatus.find({ deleted: false });
    const statusMap = masterStatuses.reduce((acc, s) => ({ ...acc, [s.name]: 0 }), {});

    let stats = {};

    if (user.role === "channel_partner") {
      const totalCustomers = await Customer.countDocuments({ "createdBy.id": user._id });
      const statusCounts = await Customer.aggregate([
        { $match: { "createdBy.id": user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      statusCounts.forEach(({ _id, count }) => (statusMap[_id || "New"] = count));
      stats = { total: totalCustomers, statusCounts: statusMap };
    } else if (user.role === "agent") {
      const totalCustomers = await Customer.countDocuments({
        acceptedBy: user._id,
        isAccepted: true,
      });
      const statusCounts = await Customer.aggregate([
        { $match: { acceptedBy: user._id, isAccepted: true } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      statusCounts.forEach(({ _id, count }) => (statusMap[_id || "New"] = count));
      stats = { total: totalCustomers, statusCounts: statusMap };
    } else {
      return handleResponse(res, 403, "Access Denied");
    }

    return handleResponse(res, 200, "Customer stats fetched successfully", stats);
  } catch (error) {
    console.error("❌ Error fetching stats/list:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const acceptCustomer = async (req, res) => {
  try {
    console.log("\n🎯 Customer Acceptance Flow Started");

    const io = req.io;
    const agentId = req.user?.id;
    const { customerId } = req.params;

    console.log(`🧍 Agent attempting to accept: ${agentId}`);
    console.log(`🧾 Customer ID: ${customerId}`);

    // 1️⃣ Find Customer
    const customer = await Customer.findById(customerId).populate(
      "createdBy.id"
    );
    if (!customer) return handleResponse(res, 404, "Customer not found");

    console.log(`📇 Customer Found: ${customer.full_name}`);
    console.log(`🏢 Customer Company: ${customer.company || "None"}`);

    // 2️⃣ Find Agent
    const agent = await User.findById(agentId);
    if (!agent) return handleResponse(res, 404, "Agent not found");

    console.log(`👤 Agent Found: ${agent.full_name}`);
    console.log(`🏢 Agent Company: ${agent.company || "None"}`);

    // 3️⃣ Ensure both have company
    if (!agent.company || !customer.company) {
      console.log("🚫 Either agent or customer lacks company association");
      return handleResponse(
        res,
        400,
        "Either agent or customer lacks company association"
      );
    }

    // 4️⃣ Ensure company matches
    const agentCompanyId = agent.company.toString();
    const customerCompanyId = customer.company.toString();

    if (agentCompanyId !== customerCompanyId) {
      console.log(
        `🚫 Company mismatch: Agent(${agentCompanyId}) ≠ Customer(${customerCompanyId})`
      );
      return handleResponse(
        res,
        403,
        "You are not authorized to accept this customer"
      );
    }

    // 5️⃣ Check already accepted
    if (customer.isAccepted) {
      console.log(`⚠️ Customer already accepted by ${customer.acceptedBy}`);
      return handleResponse(res, 400, "Customer already accepted");
    }

    // 6️⃣ Accept Customer
    customer.isAccepted = true;
    customer.acceptedBy = agent._id;
    customer.acceptedBy_name = agent.full_name;
    customer.acceptedAt = new Date();

    // 🧩 Keep business status = "New"
    if (!customer.status) customer.status = "New";

    await customer.save();

    console.log(
      `✅ Customer '${customer.full_name}' accepted by ${agent.full_name}`
    );

    // 7️⃣ Notify current agent
    io.to(agent._id.toString()).emit("customer-accepted-success", {
      message: "Customer accepted successfully.",
      customerId,
    });

    // 8️⃣ Notify other agents in the same company
    io.to(agentCompanyId).emit("customer-already-accepted", {
      message: `Customer already accepted by ${agent.full_name} of your company.`,
      customerId,
    });

    // 9️⃣ Notify creator (CP/Admin)
    if (customer.createdBy?.id) {
      io.to(customer.createdBy.id.toString()).emit("customer-accepted-notify", {
        message: `Customer ${customer.full_name} accepted by ${agent.full_name}`,
        customerId,
      });
    }

    console.log("✅ Accept customer flow completed successfully\n");

    return handleResponse(
      res,
      200,
      "Customer accepted successfully",
      customer.toObject()
    );
  } catch (error) {
    console.error("❌ Error accepting customer:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const declineCustomer = async (req, res) => {
  try {
    console.log("\n🚫 Decline Customer Flow Started");

    const io = req.io;
    const { customerId } = req.params;
    const agentId = req.user.id;

    const agent = await User.findById(agentId).populate("company", "name");
    if (!agent || agent.role !== "agent") {
      return handleResponse(res, 403, "Only agents can decline customers");
    }

    const customer = await Customer.findById(customerId).populate(
      "company",
      "name"
    );
    if (!customer) return handleResponse(res, 404, "Customer not found");

    if (customer.isAccepted) {
      return handleResponse(res, 400, "Customer already accepted");
    }

    // ✅ Decline without changing main status
    customer.isAccepted = false;
    customer.declinedBy = agent._id;
    customer.declinedAt = new Date();
    await customer.save();

    // 🔊 Notify declining agent
    io.to(agent._id.toString()).emit("customer-declined-success", {
      customerId,
      message: "❌ You have declined this customer.",
    });

    // 🔊 Notify admins
    io.to("admins").emit("customer-declined", {
      customerId,
      declinedBy: {
        id: agent._id,
        name: agent.full_name,
        company: agent.company.name,
      },
      message: `Customer declined by ${agent.full_name}`,
    });

    // 🔊 Notify creator
    if (customer.createdBy?.id) {
      io.to(customer.createdBy.id.toString()).emit(
        "customer-declined-notify-creator",
        {
          customerId,
          message: `Customer you created has been declined by ${agent.full_name} (agent of ${agent.company.name})`,
        }
      );
    }

    console.log(`✅ Customer ${customer.full_name} declined successfully\n`);

    return handleResponse(res, 200, "Customer declined successfully", {
      customerId: customer._id,
      declinedBy: agent.full_name,
      company: agent.company.name,
    });
  } catch (err) {
    console.error("❌ Error declining customer:", err);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getAllBroadcastedCustomers = async (req, res) => {
  try {
    const { q = "", status, page = 1, limit = 10 } = req.query;
    const user = req.user;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log(`\n📡 Fetching broadcasted customers for: ${user.full_name} (${user.role})`);

    // 🔍 Match only broadcasted customers
    let matchStage = {
      $and: [
        {
          $or: [
            { is_broadcasted: true },
            { broadcasted_to: { $exists: true, $not: { $size: 0 } } },
          ],
        },
      ],
    };

    // 🧩 Role-based filters
    if (user.role === "channel_partner") {
      matchStage.$and.push({ "createdBy.id": user.id?.toString() });
    } else if (user.role === "agent") {
      const userId = new mongoose.Types.ObjectId(String(user.id));
      matchStage.$and.push({
        $or: [
          { broadcasted_to: { $in: [userId] } },
          { acceptedBy: userId }
        ]
      });
    } else if (user.role === "admin") {
      // Admin can see all
    } else {
      return handleResponse(res, 403, "Access Denied.");
    }

    // 🔍 Optional search
    if (q) {
      const regex = new RegExp(q, "i");
      matchStage.$and.push({
        $or: [
          { full_name: regex },
          { email: regex },
          { phone_number: regex },
          { personal_phone_number: regex },
        ],
      });
    }

    // 🔍 Optional status filter
    if (status) {
      matchStage.$and.push({ status });
    }

    console.log("🧠 Mongo Match:", JSON.stringify(matchStage, null, 2));

    // 🧮 Aggregation
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "project_info",
        },
      },
      {
        $addFields: {
          project_name: {
            $cond: [
              { $gt: [{ $size: "$project_info" }, 0] },
              { $arrayElemAt: ["$project_info.project_title", 0] },
              null,
            ],
          },
        },
      },
      {
        $project: {
          project_info: 0,
          __v: 0,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const countPipeline = [{ $match: matchStage }, { $count: "totalItems" }];

    const [customers, countResult] = await Promise.all([
      Customer.aggregate(pipeline),
      Customer.aggregate(countPipeline),
    ]);

    const totalItems = countResult[0]?.totalItems || 0;

    console.log(`✅ Broadcasted Customers Found: ${customers.length}`);

    return handleResponse(res, 200, "Broadcasted customers fetched successfully", {
      results: customers,
      totalItems,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalItems / limit),
    });
  } catch (error) {
    console.error("❌ Error fetching broadcasted customers:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const updateCustomerStatus = async (req, res) => {
  const io = req.io;
  try {
    const { id } = req.params;
    const { status: masterStatusId } = req.body;
    const { id: userId, role: userRole, full_name: userName } = req.user;

    console.log("📥 Incoming request to update customer status:", {
      customerId: id,
      masterStatusId,
      userId,
      userRole,
      userName,
    });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid Customer ID");
    }

    if (!mongoose.Types.ObjectId.isValid(masterStatusId)) {
      return handleResponse(res, 400, "Invalid Status ID");
    }

    const customer = await Customer.findById(id);
    if (!customer) {
      return handleResponse(res, 404, "Customer not found");
    }

    // 🔐 Role-based access check
    let hasAccess = false;

    if (userRole === "channel_partner") {
      hasAccess = customer.createdBy?.id?.toString() === userId.toString();
    }

    if (userRole === "agent") {
      const isAccepted = customer.acceptedBy?.toString() === userId.toString();
      const isBroadcasted =
        customer.is_broadcasted &&
        Array.isArray(customer.broadcasted_to) &&
        customer.broadcasted_to
          .map((id) => id.toString())
          .includes(userId.toString());
      hasAccess = isAccepted || isBroadcasted;
    }

    if (!hasAccess) {
      return handleResponse(
        res,
        403,
        "Access denied: You are not authorized to update this customer's status."
      );
    }

    // ✅ Validate Master Status
    const masterStatus = await MasterStatus.findOne({
      _id: masterStatusId,
      deleted: false,
    });

    if (!masterStatus) {
      return handleResponse(res, 400, "Invalid Status ID");
    }

    console.log("🔄 Updating customer status to:", masterStatus.name);

    // === Update and Track Status History ===
    const newStatusEntry = {
      id: userId,
      name: userName,
      role: userRole,
      status: masterStatus.name,
      updated_at: new Date(),
    };

    if (!Array.isArray(customer.status_history)) {
      customer.status_history = [];
    }

    customer.status = masterStatus.name;
    customer.status_history.push(newStatusEntry);
    customer.updatedAt = new Date();

    await customer.save();

    console.log("✅ Customer status updated successfully:", {
      id: customer._id,
      status: customer.status,
    });

    // === Real-Time Socket Notifications ===
    // Notify the user who created the customer (if CP)
    if (customer.createdBy?.id) {
      io.to(customer.createdBy.id.toString()).emit("customer_status_updated", {
        customerId: customer._id,
        newStatus: masterStatus.name,
        updatedBy: userName,
        updatedRole: userRole,
        message: `Customer status changed to ${masterStatus.name} by ${userName}`,
      });
    }

    // Notify the accepted agent (if exists)
    if (customer.acceptedBy) {
      io.to(customer.acceptedBy.toString()).emit("customer_status_updated", {
        customerId: customer._id,
        newStatus: masterStatus.name,
        updatedBy: userName,
        updatedRole: userRole,
      });
    }

    return handleResponse(res, 200, "Customer status updated successfully", {
      customer,
    });
  } catch (error) {
    console.error("❌ Error updating customer status:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getCustomerStatusHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid Customer ID");
    }

    const customer = await Customer.findById(id, "status status_history createdAt createdBy").lean();
    if (!customer) return handleResponse(res, 404, "Customer not found");

    let history = Array.isArray(customer.status_history) ? [...customer.status_history] : [];

    // 🔹 Add initial "New" entry if missing
    const hasNewStatus = history.some((entry) => entry.status === "New");
    if (!hasNewStatus) {
      history.unshift({
        id: customer.createdBy?.id || null,
        role: customer.createdBy?.role || "channel_partner",
        status: "New",
        updated_at: customer.createdAt || new Date(),
        _id: new mongoose.Types.ObjectId(),
      });
    }

    // 🔹 Fetch user names for all distinct IDs in history
    const userIds = history
      .map((entry) => entry.id)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(id));

    const users = await User.find({ _id: { $in: userIds } }, "full_name").lean();
    const userMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user.full_name;
      return acc;
    }, {});

    // 🔹 Merge user names into history entries
    history = history.map((entry) => ({
      ...entry,
      name: userMap[entry.id?.toString()] || entry.name || "Unknown User",
    }));

    // 🔹 Sort by updated_at ascending
    history.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

    return handleResponse(res, 200, "Customer history fetched successfully", {
      results: history,
    });
  } catch (error) {
    console.error("❌ Error fetching customer history:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

export const customers = {
  createCustomer,
  getAllCustomers,
  getCustomersById,
  generateCustomerLink,
  createCustomerFromLink,
  getCustomerStats,
  acceptCustomer,
  declineCustomer,
  getAllBroadcastedCustomers,
  updateCustomerStatus,
  getCustomerStatusHistory
};
