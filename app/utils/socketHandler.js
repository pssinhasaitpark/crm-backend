// app/utils/socketHandler.js
import User from "../models/users/user.js";
import Customer from "../models/customers.js";

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 New client connected:", socket.id);

    let connectedUserId = null;
    let connectedCompanyId = null;

    // ✅ Agent or Channel Partner joins
    socket.on("join-user", async ({ userId }) => {
      if (!userId) return;
      connectedUserId = userId;

      const user = await User.findById(userId);
      if (!user) return;

      // Join their own ID room + company room
      socket.join(userId);
      if (user.company) {
        socket.join(user.company.toString());
        connectedCompanyId = user.company.toString();
      }

      console.log(`✅ ${user.role} (${user.full_name}) joined rooms: [${userId}] [${connectedCompanyId}]`);
    });

    // ✅ Agent accepts a customer
    socket.on("accept-customer", async ({ userId, customerId }) => {
      try {
        const customer = await Customer.findById(customerId).populate("acceptedBy");
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

        const acceptingAgent = await User.findById(userId);

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
        socket.emit("error", { message: "Server error while accepting customer." });
      }
    });

    // ✅ Handle disconnect
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
};
