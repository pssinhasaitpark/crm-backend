// app/controllers/customers.js
import Customers from "../models/customers.js";
import Project from "../models/projects.js";
import mongoose from "mongoose";
import { handleResponse } from "../utils/helper.js";
import { customerValidators } from "../validators/customers.js";

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

export const customers = {
    createCustomer,
    getAllCustomers,
    getCustomersById
};
