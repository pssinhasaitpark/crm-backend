//app/controllers/associateUsers.js
import bcrypt from "bcryptjs";
import AssociateUser from "../../models/users/associateUsers.js";
import { handleResponse } from "../../utils/helper.js";
import { createAssociateValidator } from "../../validators/users/associateUsers.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const createAssociateUser = async (req, res) => {
  try {
    const mainUser = req.user;

    const { error } = createAssociateValidator.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((err) => err.message.replace(/["\\]/g, ""));
      return handleResponse(res, 400, messages.join(", "));
    }

    const { full_name, email, phone_number, location, role, password } = req.body;

    const existingUser = await AssociateUser.findOne({ $or: [{ email }, { phone_number }] });
    if (existingUser) {
      return handleResponse(res, 409, "Email or phone number already registered.");
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

    return handleResponse(res, 201, `Associate ${role} created successfully`, responseData);
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

    const associate = await AssociateUser.findOne({ email }).select("+password");
    if (!associate) {
      return handleResponse(res, 404, "Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, associate.password);
    if (!isPasswordValid) {
      return handleResponse(res, 401, "Invalid email or password");
    }

    if (associate.status === "inactive") {
      return handleResponse(res, 403, "Your account is inactive. Please contact admin");
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
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};

    if (user.role === "admin") {
      query = {};
    } else {
      query = { "createdBy.id": user.id };
    }

    const projection = { password: 0, __v: 0, updatedAt: 0, };

    const totalAssociates = await AssociateUser.countDocuments(query);

    let associates = await AssociateUser.find(query, projection)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    if (user.role !== "admin") {
      associates = associates.map((a) => {
        const obj = a.toObject();
        delete obj.createdBy;
        return obj;
      });
    }

    if (associates.length === 0) {
      let noDataMessage = "There are no associated users found.";
      if (user.role === "agent")
        noDataMessage = "You don’t have any associated Agents yet.";
      if (user.role === "channel_partner")
        noDataMessage = "You don’t have any associated Channel Partners yet.";

      return handleResponse(res, 200, noDataMessage);
    }

    return handleResponse(res, 200, `Associates fetched successfully`, {
      results: associates,
      totalItems: totalAssociates,
      currentPage: Number(page),
      totalPages: Math.ceil(totalAssociates / limit),
    });

  } catch (error) {
    console.error("Error fetching associates:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

const getAllAssociatedUserss = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let matchStage = {};

    if (user.role !== "admin") {
      matchStage = { "createdBy.id": new mongoose.Types.ObjectId(String(user.id)) };
    }

    const projection = {
      password: 0,
      __v: 0,
      updatedAt: 0,
    };

    const pipeline = [
      { $match: matchStage },
      { $project: projection },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          results: [
            { $skip: Number(skip) },
            { $limit: Number(limit) },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const data = await AssociateUser.aggregate(pipeline);

    const associates = data[0]?.results || [];
    const totalAssociates = data[0]?.totalCount[0]?.count || 0;

    let formattedAssociates = associates;
    if (user.role !== "admin") {
      formattedAssociates = associates.map((item) => {
        const obj = { ...item };
        delete obj.createdBy;
        return obj;
      });
    }

    if (formattedAssociates.length === 0) {
      let noDataMessage = "There are no associated users found.";
      if (user.role === "agent") noDataMessage = "You don’t have any associated Agents yet.";
      if (user.role === "channel_partner") noDataMessage = "You don’t have any associated Channel Partners yet.";

      return handleResponse(res, 200, noDataMessage);
    }

    return handleResponse(res, 200, "Associates fetched successfully", {
      results: formattedAssociates,
      totalItems: totalAssociates,
      currentPage: Number(page),
      totalPages: Math.ceil(totalAssociates / limit),
    });
  } catch (error) {
    console.error("Error fetching associates:", error);
    return handleResponse(res, 500, "Internal Server Error");
  }
};

export const associateUsers = {
  createAssociateUser,
  loginAssociateUser,
  getAllAssociatedUsers
};