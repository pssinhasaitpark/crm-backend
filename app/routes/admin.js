import express from "express";
import { admin } from "../controllers/admin.js";

const router = express.Router();

router.post("/register", admin.registerAdmin);

router.post("/login", admin.loginAdmin);

export default router;
