//app/routes/company.js
import express from "express";
import { company } from "../controllers/company.js";
import { verifyAdmin, verifyToken} from "../middlewares/jwtAuth.js"

const router = express.Router();

router.post("/create", verifyToken, company.createCompany);

router.get("/", company.getAllCompanies);

router.get("/:id", company.getCompanyById);

export default router;