//app/routes/customers.js
import express from "express";
import { customers } from "../controllers/customers.js";
import { verifyToken } from "../middlewares/jwtAuth.js"

const router = express.Router();

router.post("/create", verifyToken, customers.createCustomer);

router.get("/all", verifyToken, customers.getAllCustomers);

router.get("/:id", verifyToken, customers.getCustomersById);

export default router;