//app/controllers/associateUsers.js
import { nanoid } from "nanoid";
import User from "../../models/users/user.js";
import AssociateLink from "../../models/associateLink.js";
import Customer from "../../models/customers.js";
import AssociateUser from "../../models/users/associateUsers.js";
import bcrypt from "bcryptjs";
import { handleResponse } from "../../utils/helper.js";
import { createAssociateValidator } from "../../validators/users/associateUsers.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const createAssociateUser = async (req, res) => {
  try {
    const mainUser = req.user;

    const { error } = createAssociateValidator.validate(req.body, {
      abortEarly: false,
    });
    if (error) {
      const messages = error.details.map((err) =>
        err.message.replace(/["\\]/g, "")
      );
      return handleResponse(res, 400, messages.join(", "));
    }

    const { full_name, email, phone_number, location, role, password } =
      req.body;

    const existingUser = await AssociateUser.findOne({
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

    const newAssociate = await AssociateUser.create({
      full_name,
      email,
      phone_number,
      location,
      role,
      password: hashedPassword,
      company: mainUser.company,
      company_name: mainUser.company_name,
      createdBy: {
        id: mainUser.id,
        name: mainUser.name,
      },
    });

    const responseData = {
      id: newAssociate._id,
      full_name: newAssociate.full_name,
      email: newAssociate.email,
      company: newAssociate.company_name,
      createdBy: newAssociate.createdBy,
      status: newAssociate.status,
    };

    return handleResponse(
      res,
      201,
      `Associate ${role} created successfully`,
      responseData
    );
  } catch (error) {
    console.error("Error creating associate user:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const loginAssociateUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return handleResponse(res, 400, "Email and password are required");
    }

    const associate = await AssociateUser.findOne({ email }).select(
      "+password"
    );
    if (!associate) {
      return handleResponse(res, 404, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, associate.password);
    if (!isPasswordValid) {
      return handleResponse(res, 401, "Invalid email or password");
    }

    if (associate.status === "inactive") {
      return handleResponse(
        res,
        403,
        "Your account is inactive. Please contact admin"
      );
    }

    const token = jwt.sign(
      {
        id: associate._id,
        role: associate.role,
        email: associate.email,
        company: associate.company,
        company_name: associate.company_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRATION }
    );

    const responseData = {
      id: associate._id,
      full_name: associate.full_name,
      email: associate.email,
      role: associate.role,
      company: associate.company_name,
      token,
    };

    return handleResponse(res, 200, "Login successful", responseData);
  } catch (error) {
    console.error("Error logging in associate user:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getAllAssociatedUsers = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10, includeCustomers = false } = req.query;
    const skip = (page - 1) * limit;

    // 🧠 Build base query
    let query = {};
    if (user.role !== "admin") query = { "createdBy.id": user.id };

    const projection = { password: 0, __v: 0, updatedAt: 0 };

    const totalAssociates = await AssociateUser.countDocuments(query);
    let associates = await AssociateUser.find(query, projection)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    if (!associates.length) {
      let msg = "There are no associated users found.";
      if (user.role === "agent")
        msg = "You don’t have any associated Agents yet.";
      if (user.role === "channel_partner")
        msg = "You don’t have any associated Channel Partners yet.";
      return handleResponse(res, 200, msg);
    }

    // 🧩 For each associate, attach customer list (with status history if includeCustomers=true)
    const associatesWithCustomers = await Promise.all(
      associates.map(async (associate) => {
        const customerQuery = { "createdBy.id": associate._id };

        // Select base fields + status_history (included only when includeCustomers=true)
        const customers = await Customer.find(customerQuery)
          .select(
            "full_name phone_number email project status createdAt status_history"
          )
          .sort({ createdAt: -1 })
          .lean();

        const customersWithNames = await Promise.all(
          customers.map(async (customer) => {
            if (
              includeCustomers === "true" &&
              customer.status_history?.length
            ) {
              const updatedHistory = await Promise.all(
                customer.status_history.map(async (status) => {
                  if (status.id) {
                    // Fetch user details by id
                    const statusUser = await User.findById(status.id)
                      .select("full_name role")
                      .lean();
                    return {
                      ...status,
                      name: statusUser ? statusUser.full_name : "Unknown",
                    };
                  }
                  return status;
                })
              );
              customer.status_history = updatedHistory;
            }
            return customer;
          })
        );

        return {
          ...associate,
          total_customers: customers.length,
          // customers: includeCustomers === "true" ? customers : undefined,
          customers:
            includeCustomers === "true" ? customersWithNames : undefined,
        };
      })
    );

    // ✅ Final response
    return handleResponse(res, 200, "Associates fetched successfully", {
      results: associatesWithCustomers,
      totalItems: totalAssociates,
      currentPage: Number(page),
      totalPages: Math.ceil(totalAssociates / limit),
    });
  } catch (error) {
    console.error("Error fetching associates:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const generateAssociateLink = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) return handleResponse(res, 403, "Unauthorized");

    if (!["channel_partner", "agent"].includes(user.role))
      return handleResponse(
        res,
        403,
        "Only CP or Agent can generate associate links"
      );

    const code = nanoid(10);
    await AssociateLink.create({ code, created_by: user.id });

    const registrationLink = `${process.env.FRONTEND_URL}/associate-user/register/${code}`;
    return handleResponse(res, 200, "Associate link generated successfully", {
      link: registrationLink,
    });
  } catch (error) {
    console.error("Error generating associate link:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const createFromAssociateLink = async (req, res) => {
  try {
    const { code } = req.params;
    const link = await AssociateLink.findOne({ code });
    if (!link)
      return handleResponse(res, 400, "Invalid or expired registration link");

    const creator = await User.findById(link.created_by);
    if (!creator) return handleResponse(res, 404, "Creator not found");

    const { full_name, email, phone_number, location, password } = req.body;
    if (!full_name || !email || !phone_number || !password)
      return handleResponse(res, 400, "Missing required fields");

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAssociate = await AssociateUser.create({
      full_name,
      email,
      phone_number,
      location,
      company: creator.company,
      company_name: creator.company_name,
      role: creator.role, // same as creator type (agent or CP)
      password: hashedPassword,
      createdBy: {
        id: creator._id,
        name: creator.full_name,
      },
    });

    await AssociateLink.deleteOne({ code });
    return handleResponse(
      res,
      201,
      "Associate created successfully",
      newAssociate.toObject()
    );
  } catch (error) {
    console.error("Error creating associate:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getAssociatedCPDetailsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return handleResponse(res, 404, `Invalid user ID.`);
    }

    const associatedCPs = await AssociateUser.find({
      "createdBy.id": userId,
      role: "channel_partner",
    }).select("-password -createdBy");

    if (!associatedCPs || associatedCPs.length === 0) {
      return handleResponse(res, 404, `No associated channel partners found.`);
    }

    return handleResponse(res, 200, `Associate CP Details Fetched Successfully`, { results: associatedCPs }
    );
  } catch (error) {
    console.error("Error fetching associated CPs:", error);
    return handleResponse(res, 500, `Internal Server Erroror Soemthing Went Wrong.` );
  }
};

export const associateUsers = {
  createAssociateUser,
  loginAssociateUser,
  getAllAssociatedUsers,
  generateAssociateLink,
  createFromAssociateLink,
  getAssociatedCPDetailsByUserId,
};
