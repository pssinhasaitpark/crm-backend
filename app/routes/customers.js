//app/routes/customers.js
import express from "express";
import { customers } from "../controllers/customers.js";
import { verifyToken } from "../middlewares/jwtAuth.js"

const router = express.Router();


router.get("/generate-customer-link", verifyToken, customers.generateCustomerLink);

router.post("/create", verifyToken, customers.createCustomer);

router.get("/all", verifyToken, customers.getAllCustomers);

router.get("/stats", verifyToken, customers.getCustomerStats);

router.get("/:id", verifyToken, customers.getCustomersById);

router.post("/register/customer/:code", customers.createCustomerFromLink);


export default router;