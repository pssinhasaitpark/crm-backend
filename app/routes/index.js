//app/routes/index.js
import adminRoutes from "./admin.js";
import companyRoutes from "./company.js";
import masterStatusRoutes from "./masterStatus.js";
import projectRoutes from "./projects.js";
import customerRoutes from "./customers.js";
import userRoutes from "./users/user.js";
import associateUsersRoutes from "./users/associateUsers.js";

const setupRoutes = (app) => {
    app.use("/api/v1/admin", adminRoutes);
    app.use("/api/v1/company", companyRoutes);
    app.use("/api/v1/master-status", masterStatusRoutes);
    app.use("/api/v1/projects", projectRoutes);
    app.use("/api/v1/customers", customerRoutes)
    app.use("/api/v1/user", userRoutes);
    app.use("/api/v1/associate-user", associateUsersRoutes)
};

export default setupRoutes;