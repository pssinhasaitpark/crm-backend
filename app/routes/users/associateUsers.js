import express from "express";
import { associateUsers } from "../../controllers/users/associateUsers.js";
import { verifyToken } from "../../middlewares/jwtAuth.js";

const router = express.Router();

router.post("/create", verifyToken, associateUsers.createAssociateUser);

router.post("/login", associateUsers.loginAssociateUser);

router.get("/all", verifyToken, associateUsers.getAllAssociatedUsers);

export default router;
