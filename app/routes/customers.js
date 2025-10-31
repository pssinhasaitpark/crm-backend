//app/routes/customers.js
import express from "express";
import { customers } from "../controllers/customers.js";
import { verifyToken } from "../middlewares/jwtAuth.js"

const router = express.Router();

router.get("/history/:id", verifyToken, customers.getCustomerStatusHistory);

router.get("/broadcasted", verifyToken, customers.getAllBroadcastedCustomers);

router.get("/generate-customer-link", verifyToken, customers.generateCustomerLink);

router.post("/create", verifyToken, customers.createCustomer);

router.get("/all", verifyToken, customers.getAllCustomers);

router.get("/stats", verifyToken, customers.getCustomerStats);
    
router.get("/:id", verifyToken, customers.getCustomersById);

router.post("/register/:code", customers.createCustomerFromLink);

router.post("/accept/:customerId", verifyToken, customers.acceptCustomer);

router.post("/decline/:customerId", verifyToken, customers.declineCustomer);

router.patch("/status/:id", verifyToken, customers.updateCustomerStatus);

router.post("/follow-up/:customerId", verifyToken, customers.addFollowUp);

router.get("/follow-ups/:customerId", verifyToken, customers.getCustomerFollowUps);

router.post("/:customerId/note", verifyToken, customers.addNotes);

router.get("/:customerId/notes", verifyToken, customers.getCustomerNotes);

router.get("/admin/:userId", verifyToken, customers.getCustomerDetailsByUserId);

export default router;