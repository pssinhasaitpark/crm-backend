//app/controllers/projects.js
import Project from "../models/projects.js";
import projectValidation from "../validators/projects.js";
import { uploadFilesToCloudinary } from "../middlewares/multer.js";
import { handleResponse } from "../utils/helper.js";

const createProjects = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return handleResponse(res, 403, "Forbidden: Admins only");
    }

    const { error } = projectValidation.validate(req.body);
    if (error) {
      const rawMessage = error.details[0].message;
      const cleanedMessage = rawMessage.replace(/\"/g, "");
      return handleResponse(res, 400, cleanedMessage);
    }

    if (!req.files.images || !req.files.brouchers) {
      return handleResponse(res, 400, "Images and brochure are required");
    }

    const uploaded = await uploadFilesToCloudinary(req.files);

    const newProject = new Project({
      project_title: req.body.project_title,
      description: req.body.description,
      location: req.body.location,
      min_price: req.body.min_price,
      max_price: req.body.max_price,
      images: uploaded.images,
      brouchers: uploaded.brouchers[0],
      created_by: req.user.id,
      created_by_role: req.user.user_role,
    });

    await newProject.save();

    const responseProject = newProject.toObject();
    responseProject.created_by = req.user.id;
    responseProject.created_by_role = req.user.user_role;

    return handleResponse(res, 201, "Project created Successfully", responseProject);

  } catch (err) {
    console.error("Error creating project:", err);
    return handleResponse(res, 500, "Server Error", { error: err.message });
  }
};

const getAllProjects = async (req, res) => {
  try {
    const allowedRoles = ["admin", "channel_partner", "agent"];
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return handleResponse(res, 403, "Access denied. Admins, agents, and channel partners only.");
    }

    const { q = "", page = 1, perPage = 100 } = req.query;

    const matchStage = {};

    if (q) {
      const regex = new RegExp(q, "i");
      matchStage.$or = [
        { project_title: regex },
        { description: regex },
        { location: regex },
        { min_price: regex },
        { max_price: regex },
      ];
    }

    const skip = (page - 1) * perPage;

    const projectAggregation = await Project.aggregate([
      { $match: matchStage },

      // Optional lookup and unwind for creator info, if needed
      // {
      //   $lookup: {
      //     from: "users",
      //     localField: "created_by",
      //     foreignField: "_id",
      //     as: "creator",
      //   },
      // },
      {
        $unwind: {
          path: "$creator",
          preserveNullAndEmptyArrays: true,
        },
      },

      { $sort: { createdAt: -1 } },

      {
        $facet: {
          results: [{ $skip: skip }, { $limit: Number(perPage) }],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const results = projectAggregation[0].results;
    const totalItems = projectAggregation[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / perPage);

    return handleResponse(res, 200, "Projects fetched successfully", {
      results,
      totalItems,
      currentPage: Number(page),
      totalPages,
      totalItemsOnCurrentPage: results.length,
    });
  } catch (err) {
    console.error("Error fetching projects:", err);
    return handleResponse(res, 500, "Server Error", { error: err.message });
  }
};

export const projects = {
  createProjects,
  getAllProjects
};