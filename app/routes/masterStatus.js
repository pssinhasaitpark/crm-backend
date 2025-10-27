//app/routes.masterStatus.js

import express from 'express';
import { masterStatus } from '../controllers/masterStatus.js';
import { verifyToken } from '../middlewares/jwtAuth.js';

const router = express.Router();

router.post("/", verifyToken, masterStatus.createMasterStatus);

router.get("/", masterStatus.getAllMasterStatus);

router.get("/:id", masterStatus.getMasterStatusById);

export default router;