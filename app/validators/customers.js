//app/validators/customers.js
import Joi from "joi";

export const customerValidators = Joi.object({
    full_name: Joi.string().required().messages({
        "any.required": "Name is required",
    }),
    phone_number: Joi.string()
        .pattern(/^[6-9][0-9]{9}$/)
        .required()
        .messages({
            "string.pattern.base": "Please enter a valid phone number and must be exactly 10 digits long",
            "any.required": "Phone number is required",
        }),
    email: Joi.string().email().required().lowercase().trim().messages({
        "string.email": "Invalid email format",
        "any.required": "Email is required",
    }),
    project: Joi.string()
        .hex().length(24).required().messages({
            "string.hex": "Project ID must be a valid ObjectId",
            "any.required": "Project is required",
        }),
    personal_phone_number: Joi.string()
        .pattern(/^[6-9][0-9]{9}$/).required().messages({
            "string.pattern.base": "Please enter a valid phone number and must be exactly 10 digits long",
            "any.required": "Personal phone number is required",
        }),
}); 