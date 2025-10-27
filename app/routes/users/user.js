import express from "express";
import { user } from "../../controllers/users/user.js";
import { verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.post("/register", user.registerUser);

router.post("/login", user.loginUser);

export default router;
