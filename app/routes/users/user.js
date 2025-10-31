import express from "express";
import { user } from "../../controllers/users/user.js";
import { verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.post("/register", user.registerUser);

router.post("/login", user.loginUser);

router.get("/me", verifyToken,user.me);

router.get("/admin/all", verifyToken, user.getAllUsers);

export default router;
 