//app/validators/customers.js
import Joi from "joi";
import dayjs from "dayjs";

export const followUpValidators = Joi.object({
  task: Joi.string().required().messages({
    "any.required": "Task is required",
    "string.empty": "Task cannot be empty",
  }),

  notes: Joi.string().allow("").optional(),

  follow_up_date: Joi.string()
    .required()
    .custom((value, helpers) => {
      // ✅ Check format strictly
      const date = dayjs(value, "DD/MM/YYYY", true);
      if (!date.isValid()) {
        return helpers.message("Follow Up Date must be in DD/MM/YYYY format");
      }

      // ✅ Prevent past dates
      const today = dayjs().startOf("day");
      if (date.isBefore(today)) {
        return helpers.message("Follow Up Date cannot be in the past");
      }

      return value; // pass validation
    })
    .messages({
      "any.required": "follow_up_date is required",
      "string.empty": "follow_up_date cannot be empty",
    }),
});

export const notesValidators = Joi.object({
  message: Joi.string().required().messages({
    "string.empty": "Note message is required",
  }),
});

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
    company: Joi.string().hex().length(24).optional(),

}); 