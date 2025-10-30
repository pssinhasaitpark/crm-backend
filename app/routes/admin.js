import express from "express";
import { admin } from "../controllers/admin.js";
import { verifyToken } from "../middlewares/jwtAuth.js";

const router = express.Router();

router.post("/register", admin.registerAdmin);

router.post("/login", admin.loginAdmin);

router.get("/me", verifyToken, admin.me);

router.patch("/status/:id", verifyToken, admin.updateUserStatusById);

router.patch("/broadcast/:customerId", verifyToken, admin.adminBroadcastingCustomerById);

router.get("/all/agents/:companyId", verifyToken, admin.getAllAgentsByCompanyId);

export default router;
