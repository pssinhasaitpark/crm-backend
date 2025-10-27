//app/controllers/masterStatus.js
import MasterStatus from "../models/masterStatus.js";
import { masterStatusValidators } from "../validators/masterStatus.js";
import { handleResponse } from "../utils/helper.js";
import mongoose from "mongoose";

const createMasterStatus = async (req, res) => {
    try {
        const isAdmin = req.user && req.user.role === "admin";
        if (!isAdmin) {
            return handleResponse(res, 403, `Access, Denied, Only Admins can create Master Status`);
        }

        const { error } = masterStatusValidators.validate(req.body, { abortEarly: false });
        if (error) {
            const firstError = error.details[0].message.replace(/"/g, "");
            return handleResponse(res, 400, firstError);
        }

        const existingMasterStatus = await MasterStatus.findOne({ name: req.body.name });
        if (existingMasterStatus) {
            return handleResponse(res, 409, "Name already registered");
        }

        const newMasterStatus = new MasterStatus({
            name: req.body.name,
            description: req.body.description,
        });

        await newMasterStatus.save();

        return handleResponse(res, 201, "Master Status created successfully", newMasterStatus.toObject());

    } catch (error) {
        console.error("Error creating lead:", error);
        return handleResponse(res, 500, "Internal Server Error");
    }
}

const getAllMasterStatus = async (req, res) => {
    try {
        const masterStatuses = await MasterStatus.find({ deleted: false }).select("name description deleted");

        return handleResponse(res, 200, "Master Statuses Fetched Successfully", { results: masterStatuses });
    } catch (error) {
        console.error("Error fetching master statuses:", error);
        return handleResponse(res, 500, "Internal Server Error");
    }
};

const getMasterStatusById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return handleResponse(res, 400, "Invalid Master Status ID");
        }

        const masterStatus = await MasterStatus.findOne({ _id: id, deleted: false }).select("name description deleted");

        if (!masterStatus) {
            return handleResponse(res, 404, "Master Status not found");
        }

        return handleResponse(res, 200, "Master Status fetched successfully", masterStatus.toObject());
    } catch (error) {
        console.error("Error fetching master status by ID:", error);
        return handleResponse(res, 500, "Internal Server Error");
    }
};

export const masterStatus = {
    createMasterStatus,
    getAllMasterStatus,
    getMasterStatusById
};