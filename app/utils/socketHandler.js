// app/utils/socketHandler.js
//Also append Force Log Out.
import User from "../models/users/user.js";
import AssociateUser from "../models/users/associateUsers.js";
import Customer from "../models/customers.js";

// 🔄 Global map to store connected users: userId -> socketId
export const connectedUsers = new Map();
export const connectedAdmins = new Map(); // adminId -> socketId

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    let connectedUserId = null;
    let connectedCompanyId = null;

    // ✅ Admin joins
    socket.on("join-admin", async ({ adminId }) => {
      if (!adminId) return;
      connectedAdmins.set(adminId.toString(), socket.id);
      socket.join(`admin-${adminId}`);
      console.log(`👑 Admin connected: ${adminId} (socket: ${socket.id})`);
    });

    // ✅ Agent or Channel Partner joins
    socket.on("join-user", async ({ userId }) => {
      if (!userId) return;
      connectedUserId = userId;

      // Step 1️⃣ — Find user in main or associate collection
      let user = await User.findById(userId) || await AssociateUser.findById(userId);
      if (!user) return;

      // Step 2️⃣ — Check status immediately
      if (user.status !== "active") {
        socket.emit("force-logout", {
          title: "Account Inactive",
          message:
            "🔴 Your account has been set to Inactive by the Admin. Please contact the Admin to reactivate it.",
          type: "warning",
        });
        return socket.disconnect(true); // disconnect immediately
      }

      // Step 3️⃣ — Store socket globally
      connectedUsers.set(userId.toString(), socket.id);

      // Step 4️⃣ — Join rooms
      socket.join(userId);
      if (user.company) {
        socket.join(user.company.toString());
        connectedCompanyId = user.company.toString();
      }

      console.log(
        `✅ ${user.role} (${user.full_name}) joined rooms: [${userId}] [${connectedCompanyId}]`
      );
    });

    // ✅ Agent accepts a customer
    socket.on("accept-customer", async ({ userId, customerId }) => {
      try {
        const customer = await Customer.findById(customerId).populate("acceptedBy");
        if (!customer) return socket.emit("error", { message: "Customer not found" });

        if (customer.acceptedBy) {
          return socket.emit("customer-already-accepted", {
            message: `Customer already accepted by ${customer.acceptedBy.full_name} agent of your company.`,
            customerId,
          });
        }

        // Mark accepted
        customer.acceptedBy = userId;
        customer.status = "Accepted";
        await customer.save();

        const acceptingAgent =
          (await User.findById(userId)) || (await AssociateUser.findById(userId));

        // Notify the agent who accepted
        socket.emit("customer-accepted-success", {
          message: "✅ Customer accepted successfully.",
          customerId,
        });

        // Notify other agents in same company
        if (connectedCompanyId) {
          socket.to(connectedCompanyId).emit("customer-already-accepted", {
            message: `Customer already accepted by ${acceptingAgent.full_name} agent of your company.`,
            customerId,
          });
        }
      } catch (err) {
        console.error("Error in accept-customer:", err);
        socket.emit("error", {
          message: "Server error while accepting customer.",
        });
      }
    });

    // ✅ Handle disconnect
    socket.on("disconnect", () => {
      if (connectedUserId) connectedUsers.delete(connectedUserId.toString());
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};

/*
Correct but without Force Logout 
// app/utils/socketHandler.js
import User from "../models/users/user.js";
import AssociateUser from "../models/users/associateUsers.js";
import Customer from "../models/customers.js";

// 🔄 Global map to store connected users: userId -> socketId
export const connectedUsers = new Map();
export const connectedAdmins = new Map(); // adminId -> socketId

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    let connectedUserId = null;
    let connectedCompanyId = null;

    // ✅ Admin joins
    socket.on("join-admin", async ({ adminId }) => {
      if (!adminId) return;
      connectedAdmins.set(adminId.toString(), socket.id);
      socket.join(`admin-${adminId}`);
      console.log(`👑 Admin connected: ${adminId} (socket: ${socket.id})`);
    });

    // ✅ Agent or Channel Partner joins
    socket.on("join-user", async ({ userId }) => {
      if (!userId) return;
      connectedUserId = userId;

      // Check both User and AssociateUser
      let user = await User.findById(userId);
      if (!user) {
        user = await AssociateUser.findById(userId);
      }
      if (!user) return;

      // Store socket connection globally
      connectedUsers.set(userId.toString(), socket.id);

      // Join their own ID room + company room
      socket.join(userId);
      if (user.company) {
        socket.join(user.company.toString());
        connectedCompanyId = user.company.toString();
      }

      console.log(
        `✅ ${user.role} (${user.full_name}) joined rooms: [${userId}] [${connectedCompanyId}]`
      );
    });

    // ✅ Agent accepts a customer
    socket.on("accept-customer", async ({ userId, customerId }) => {
      try {
        const customer = await Customer.findById(customerId).populate(
          "acceptedBy"
        );
        if (!customer) {
          return socket.emit("error", { message: "Customer not found" });
        }

        // If already accepted
        if (customer.acceptedBy) {
          return socket.emit("customer-already-accepted", {
            message: `Customer already accepted by ${customer.acceptedBy.full_name} agent of your company.`,
            customerId,
          });
        }

        // Mark accepted
        customer.acceptedBy = userId;
        customer.status = "Accepted";
        await customer.save();

        const acceptingAgent =
          (await User.findById(userId)) ||
          (await AssociateUser.findById(userId));

        // Notify the agent who accepted
        socket.emit("customer-accepted-success", {
          message: "✅ Customer accepted successfully.",
          customerId,
        });

        // Notify all other agents in same company
        if (connectedCompanyId) {
          socket.to(connectedCompanyId).emit("customer-already-accepted", {
            message: `Customer already accepted by ${acceptingAgent.full_name} agent of your company.`,
            customerId,
          });
        }
      } catch (err) {
        console.error("Error in accept-customer:", err);
        socket.emit("error", {
          message: "Server error while accepting customer.",
        });
      }
    });

    // ✅ Handle disconnect
    socket.on("disconnect", () => {
      if (connectedUserId) {
        connectedUsers.delete(connectedUserId.toString());
      }
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};
*/
