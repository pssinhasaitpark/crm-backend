//app/routes/projects.js
import express from "express";
import { projects } from "../controllers/projects.js";
import { upload } from "../middlewares/multer.js";
import { verifyToken } from "../middlewares/jwtAuth.js";

const router = express.Router();

// Only admins can add projects
router.post("/admin/create", verifyToken, upload, projects.createProjects);

router.get("/", verifyToken, projects.getAllProjects);

export default router;
