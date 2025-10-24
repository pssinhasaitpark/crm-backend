// app/utils/helper.js
export const handleResponse = (res, statusCode, message, data = {}) => {
  const isSuccess = statusCode >= 200 && statusCode < 300;

  return res.status(statusCode).json({
    success: isSuccess,       
    error: !isSuccess,       
    message,
    ...data,                
  });
};