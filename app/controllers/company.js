// app/controllers/company.js
import Company from "../models/company.js";
import { handleResponse } from "../utils/helper.js";
import mongoose from "mongoose";

const createCompany = async (req, res) => {                                                      
  try {
    const { companyName } = req.body;
    const userRole = req.user?.role;

    if (userRole !== "admin") {
      return handleResponse(res, 403, "Access denied. Only Admins can create companies/organizations.");
    }

    if (!companyName) {
      return handleResponse(res, 400, "Company Name is required.");
    }

    const existingCompany = await Company.findOne({ companyName, deleted: false });
    if (existingCompany) {
      return handleResponse(res, 409, "Company with this name already exists.");
    }

    const newCompany = new Company({ companyName });
    await newCompany.save();

    return handleResponse(res, 201, "Company created successfully");
  } catch (error) {
    console.error("Error Creating Company:", error);
    return handleResponse(res, 500, "Internal Server Error.");
  }
};

const getAllCompanies = async (req, res) => {
  try {
    const { q = "", page = 1, perPage = 50 } = req.query;

    const matchStage = { deleted: false };
    if (q) {
      const regex = new RegExp(q, "i");
      const isValidObjectId = mongoose.Types.ObjectId.isValid(q);
      matchStage.$or = [{ companyName: regex }];
      if (isValidObjectId) matchStage.$or.push({ _id: new mongoose.Types.ObjectId(String(q)) });
    }

    const skip = (page - 1) * perPage;
    const companies = await Company.find(matchStage)
      .select("-deleted -deletedAt -createdAt -updatedAt -__v")
      .skip(skip)
      .limit(Number(perPage));

    const totalItems = await Company.countDocuments(matchStage);
    const totalPages = Math.ceil(totalItems / perPage);

    return handleResponse(res, 200, "Companies fetched successfully", {
      results: companies,
      totalItems,
      currentPage: Number(page),
      totalPages,
      totalItemsOnCurrentPage: companies.length,
    });
  } catch (error) {
    console.error("Error Getting Companies:", error);
    return handleResponse(res, 500, "Internal Server Error.");
  }
};

const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return handleResponse(res, 400, "Invalid company ID.");
    }

    const company = await Company.findOne({ _id: id, deleted: false }).select("-deleted -deletedAt");
    if (!company) {
      return handleResponse(res, 404, "Company not found.");
    }

    return handleResponse(res, 200, "Company fetched successfully", company.toObject());
  } catch (error) {
    console.error("Error Getting Company by ID:", error);
    return handleResponse(res, 500, "Internal Server Error.");
  }
};



export const company = {
  createCompany,
  getAllCompanies,
  getCompanyById,
};
