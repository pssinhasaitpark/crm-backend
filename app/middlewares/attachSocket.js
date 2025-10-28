// app/middlewares/attachSocket.js
export const attachSocket = (io) => (req, res, next) => {
  req.io = io;
  next();
};
