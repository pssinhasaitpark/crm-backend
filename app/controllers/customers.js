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

/*
const createCustomer = async (req, res) => {
    try {
        const user = req.user; // ✅ Comes from verifyToken middleware

        // ✅ Only agent or channel_partner can create customers
        if (!["agent", "channel_partner"].includes(user.role)) {
            return handleResponse(res, 403, "Access Denied. Only Agents or Channel Partners can create customers.");
        }

        const { error } = customerValidators.validate(req.body, { abortEarly: false });
        if (error) {
            const messages = error.details.map((err) => err.message.replace(/["\\]/g, ""));
            return handleResponse(res, 400, messages.join(", "));
        }

        const { full_name, phone_number, email, personal_phone_number, project } = req.body;

        // ✅ Check for duplicate email
        const existingCustomer = await Customers.findOne({ email });
        if (existingCustomer) {
            return handleResponse(res, 409, "Email already registered. Please use a different one.");
        }

        // ✅ Validate Project ID
        if (!mongoose.Types.ObjectId.isValid(project)) {
            return handleResponse(res, 400, "Invalid Project ID format.");
        }

        const existingProject = await Project.findById(project);
        if (!existingProject) {
            return handleResponse(res, 404, "Project not found. Please provide a valid project ID.");
        }

        // ✅ Create customer with creator info from token
        const newCustomer = await Customers.create({
            full_name,
            phone_number,
            email,
            personal_phone_number,
            project,
            createdBy: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        });

        return handleResponse(res, 201, "Customer created successfully", newCustomer.toObject());
    } catch (error) {
        console.error("Error Creating Customer:", error);
        return handleResponse(res, 500, "Internal Server Error");
    }
};
*/

const createCustomer = async (req, res) => {
    try {
        const user = req.user;
        if (!["agent", "channel_partner"].includes(user.role)) {
            return handleResponse(res, 403, "Access Denied. Only Agents or Channel Partners can create customers.");
        }
        const { error } = customerValidators.validate(req.body, { abortEarly: false });
        if (error) {
            const messages = error.details.map((err) => err.message.replace(/["\\]/g, ""));
            return handleResponse(res, 400, messages.join(", "));
        }
        const { full_name, phone_number, email, personal_phone_number, project, company } = req.body;

         // ✅ Check for duplicate phone number
        const existingPhoneNumber = await Customers.findOne({ phone_number });
        if (existingPhoneNumber) {
            return handleResponse(res, 409, "Phone number already registered. Please use a different one.");
        }
        // ✅ Check for duplicate email
        const existingCustomer = await Customers.findOne({ email });
        if (existingCustomer) {
            return handleResponse(res, 409, "Email already registered. Please use a different one.");
        }

        // ✅ Validate Project ID
        if (!mongoose.Types.ObjectId.isValid(project)) {
            return handleResponse(res, 400, "Invalid Project ID format.");
        }
        const existingProject = await Project.findById(project);
        if (!existingProject) {
            return handleResponse(res, 404, "Project not found. Please provide a valid project ID.");
        }

        // ✅ Set company based on role
        let assignedCompany;
        if (user.role === "channel_partner") {
            if (!company) {
                return handleResponse(res, 400, "Company ID is required for Channel Partners.");
            }
            if (!mongoose.Types.ObjectId.isValid(company)) {
                return handleResponse(res, 400, "Invalid Company ID format.");
            }
            assignedCompany = company;

            // Fetch all agents for this company
            const agents = await User.find({ company: company, role: "agent" });

            // Collect agent IDs
            const leadAgents = agents.map(agent => agent._id);

            // ✅ Create customer with lead agents assigned
            const newCustomer = await Customers.create({
                full_name,
                phone_number,
                email,
                personal_phone_number,
                project,
                company: assignedCompany,
                status: "New",
                createdBy: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                },
                leadAgents,  // Assigning all agents as leadAgents for this customer
            });

            // ✅ Omit createdBy from response
            const responseData = newCustomer.toObject();
            delete responseData.createdBy;

            return handleResponse(res, 201, "Customer created successfully", responseData);
        } else {
            // For agents, assign the company of the logged-in user
            assignedCompany = user.company;
        }
    } catch (error) {
        console.error("Error Creating Customer:", error);
        return handleResponse(res, 500, "Internal Server Error");
    }
};

/*
const createCustomer = async (req, res) => {
    try {
        const user = req.user;
        if (!["agent", "channel_partner"].includes(user.role)) {
            return handleResponse(res, 403, "Access Denied. Only Agents or Channel Partners can create customers.");
        }
        const { error } = customerValidators.validate(req.body, { abortEarly: false });
        if (error) {
            const messages = error.details.map((err) => err.message.replace(/["\\]/g, ""));
            return handleResponse(res, 400, messages.join(", "));
        }
        const { full_name, phone_number, email, personal_phone_number, project, company } = req.body;
        // ✅ Check for duplicate email
        const existingCustomer = await Customers.findOne({ email });
        if (existingCustomer) {
            return handleResponse(res, 409, "Email already registered. Please use a different one.");
        }
        // ✅ Validate Project ID
        if (!mongoose.Types.ObjectId.isValid(project)) {
            return handleResponse(res, 400, "Invalid Project ID format.");
        }
        const existingProject = await Project.findById(project);
        if (!existingProject) {
            return handleResponse(res, 404, "Project not found. Please provide a valid project ID.");
        }
        // ✅ Set company based on role
        let assignedCompany;
        if (user.role === "channel_partner") {
            if (!company) {
                return handleResponse(res, 400, "Company ID is required for Channel Partners.");
            }
            if (!mongoose.Types.ObjectId.isValid(company)) {
                return handleResponse(res, 400, "Invalid Company ID format.");
            }
            assignedCompany = company;
        } else {
            assignedCompany = user.company; // Agent's own company
        }
        // ✅ Create customer with status as string
        const newCustomer = await Customers.create({
            full_name,
            phone_number,
            email,
            personal_phone_number,
            project,
            company: assignedCompany,
            status: "New", // Directly set status name
            createdBy: {
                id: user.id,
                name: user.name,
                role: user.role,
            },
        });

        // ✅ Omit createdBy from response
        const responseData = newCustomer.toObject();
        delete responseData.createdBy;

        return handleResponse(res, 201, "Customer created successfully", responseData);
    } catch (error) {
        console.error("Error Creating Customer:", error);
        return handleResponse(res, 500, "Internal Server Error");
    }
};
*/
const getAllCustomers = async (req, res) => {
    try {
        const user = req.user;
        let query = {};
        let projection = {};

        if (user.role === "admin") {
            query = {};
            projection = {};
        }
        else if (["agent", "channel_partner"].includes(user.role)) {
            query = { "createdBy.id": user.id };
            projection = { createdBy: 0 };
        } else {
            return handleResponse(res, 403, "Access Denied. Unauthorized role.");
        }

        const customers = await Customers.find(query, projection)
            //   .populate("project", "project_title location")
            .sort({ createdAt: -1 });

        if (!customers.length) {
            return handleResponse(res, 200, "No customers found.");
        }

        return handleResponse(res, 200, "Customers fetched successfully", { results: customers });
    } catch (error) {
        console.error("Error Fetching Customers:", error);
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
                return handleResponse(res, 403, "Access denied. You can only view your own customers.");
            }
        }

        if (["agent", "channel_partner"].includes(user.role)) {
            delete customer.createdBy;
        }

        return handleResponse(res, 200, "Customer fetched successfully", customer);
    } catch (error) {
        console.error(`Error Getting Customers`, error);
        return handleResponse(res, 500, `Internal Server Error.`)
    }
};

const generateCustomerLink = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "channel_partner") {
      return handleResponse(res, 403, "Only Channel Partners can generate customer links");
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

    return handleResponse(res, 200, "Customer link generated successfully", { link: registrationLink });
  } catch (error) {
    console.error("Error generating customer link:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const createCustomerFromLink = async (req, res) => {
  try {
    const { code } = req.params;
    const link = await CustomerLink.findOne({ code });
    if (!link) return handleResponse(res, 400, "Invalid or expired customer link");

    const creator = await User.findById(link.createdBy.id);
    if (!creator) return handleResponse(res, 404, "Creator not found");

    const { full_name, email, phone_number, personal_phone_number, project } = req.body;
    if (!full_name || !email || !phone_number || !personal_phone_number || !project)
      return handleResponse(res, 400, "Missing required fields");

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
    });

    await CustomerLink.deleteOne({ code });
    return handleResponse(res, 201, "Customer created successfully", customer.toObject());
  } catch (error) {
    console.error("Error creating customer:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getCustomerStatss = async (req, res) => {
  try {
    // Fetch full user from DB using req.user.id
    const user = await User.findById(req.user.id);
    if (!user) {
      return handleResponse(res, 404, "User not found.");
    }

    console.log("User:", user);  // Debugging: Log user details

    let stats;

    if (user.role === "channel_partner") {
      // For CP: Count all customers created by them
      const totalCustomers = await Customer.countDocuments({ "createdBy.id": user._id });
      console.log("Total Customers for CP:", totalCustomers);  // Log total customers for CP
      
      const statusCounts = await Customer.aggregate([
        { $match: { "createdBy.id": user._id } },
        { 
          $group: { 
            _id: "$status", 
            count: { $sum: 1 }
          }
        }
      ]);

      console.log("Status Counts for CP:", statusCounts);  // Log status counts for CP

      stats = {
        total: totalCustomers,
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
      };
    } else if (user.role === "agent") {
      // For Agent: Count all customers associated with their company OR as a lead agent
      const totalCustomers = await Customer.countDocuments({
        $or: [
          { company: user.company },  // Customers under the agent's company
          { leadAgents: user._id }    // Customers where the agent is a lead agent
        ]
      });
      console.log("Total Customers for Agent's Company/Lead:", totalCustomers);  // Log total customers for agent's company or leads

      // Count status for customers within the same company OR where the agent is a lead agent
      const statusCounts = await Customer.aggregate([
        { $match: {
          $or: [
            { company: user.company },
            { leadAgents: user._id }
          ]
        }},
        { 
          $project: {
            status: { $ifNull: ["$status", "No Status"] },  // Handle missing or null status
          }
        },
        { 
          $group: { 
            _id: "$status", 
            count: { $sum: 1 } 
          }
        },
        { 
          $sort: { _id: 1 }  // Sort statuses for better clarity
        }
      ]);

      console.log("Status Counts for Agent's Company/Leads:", statusCounts);  // Log status counts for agent

      stats = {
        total: totalCustomers,
        statusCounts: statusCounts.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
      };
    } else {
      return handleResponse(res, 403, "Access denied. Only Agents and Channel Partners can access this endpoint.");
    }

    console.log("Final Stats:", stats);  // Log final stats before returning response

    return handleResponse(res, 200, "Customer/Lead stats fetched successfully", stats);
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getCustomerStats = async (req, res) => {
  try {
    // Fetch full user from DB using req.user.id
    const user = await User.findById(req.user.id);
    if (!user) {
      return handleResponse(res, 404, "User not found.");
    }

    console.log("User:", user);  // Debugging: Log user details

    // Fetch all master statuses
    const masterStatuses = await MasterStatus.find({ deleted: false });

    // Create a map of master status names for quick lookup
    const statusMap = masterStatuses.reduce((acc, status) => {
      acc[status.name] = 0; // Initialize all statuses with count 0
      return acc;
    }, {});

    let stats;

    if (user.role === "channel_partner") {
      // For CP: Count all customers created by them
      const totalCustomers = await Customer.countDocuments({ "createdBy.id": user._id });
      console.log("Total Customers for CP:", totalCustomers);  // Log total customers for CP
      
      const statusCounts = await Customer.aggregate([
        { $match: { "createdBy.id": user._id } },
        { 
          $group: { 
            _id: "$status", 
            count: { $sum: 1 }
          }
        }
      ]);

      // Update statusMap with actual counts from the aggregation
      statusCounts.forEach(({ _id, count }) => {
        statusMap[_id] = count; // Replace 0 with actual count for that status
      });

      console.log("Status Counts for CP:", statusCounts);  // Log status counts for CP

      stats = {
        total: totalCustomers,
        statusCounts: statusMap,  // Use the updated statusMap with counts
      };
    } else if (user.role === "agent") {
      // For Agent: Count all customers associated with their company OR as a lead agent
      const totalCustomers = await Customer.countDocuments({
        $or: [
          { company: user.company },  // Customers under the agent's company
          { leadAgents: user._id }    // Customers where the agent is a lead agent
        ]
      });
      console.log("Total Customers for Agent's Company/Lead:", totalCustomers);  // Log total customers for agent's company or leads

      // Count status for customers within the same company OR where the agent is a lead agent
      const statusCounts = await Customer.aggregate([
        { $match: {
          $or: [
            { company: user.company },
            { leadAgents: user._id }
          ]
        }},
        { 
          $project: {
            status: { $ifNull: ["$status", "No Status"] },  // Handle missing or null status
          }
        },
        { 
          $group: { 
            _id: "$status", 
            count: { $sum: 1 } 
          }
        },
        { 
          $sort: { _id: 1 }  // Sort statuses for better clarity
        }
      ]);

      // Update statusMap with actual counts from the aggregation
      statusCounts.forEach(({ _id, count }) => {
        statusMap[_id] = count; // Replace 0 with actual count for that status
      });

      console.log("Status Counts for Agent's Company/Leads:", statusCounts);  // Log status counts for agent

      stats = {
        total: totalCustomers,
        statusCounts: statusMap,  // Use the updated statusMap with counts
      };
    } else {
      return handleResponse(res, 403, "Access denied. Only Agents and Channel Partners can access this endpoint.");
    }

    console.log("Final Stats:", stats);  // Log final stats before returning response

    return handleResponse(res, 200, "Customer/Lead stats fetched successfully", stats);
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

export const customers = {
    createCustomer,
    getAllCustomers,
    getCustomersById,
    generateCustomerLink,
    createCustomerFromLink,
    getCustomerStats
};
