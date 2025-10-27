import Joi from "joi";

export const createUserValidator = Joi.object({
  full_name: Joi.string().required().messages({
    "any.required": "Full name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  phone_number: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be 10 digits",
      "any.required": "Phone number is required",
    }),
  // personal_phone_number: Joi.string()
  //   .pattern(/^[0-9]{10}$/)
  //   .required()
  //   .messages({
  //     "string.pattern.base": "Personal phone number must be 10 digits",
  //     "any.required": "Personal phone number is required",
  //   }),
  location: Joi.string().required().messages({
    "any.required": "Location is required",
  }),
  company: Joi.string().required().messages({
    "any.required": "Company is required",
  }),
  role: Joi.string()
    .valid("agent", "channel_partner")
    .required()
    .messages({
      "any.required": "User role is required",
      "any.only": "User role must be one of agent or channel_partner",
    }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

export const loginValidator = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Invalid email format",
      "any.required": "Email is required",
    }),

  password: Joi.string()
    .min(6)
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters long",
      "any.required": "Password is required",
    }),
});

export const createAssociateValidator = Joi.object({
  full_name: Joi.string().required().messages({
    "any.required": "Full name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  phone_number: Joi.string().required().messages({
      "string.pattern.base": "Phone number must be 10 digits",
      "any.required": "Phone number is required",
    }),
  location: Joi.string().required().messages({
    "any.required": "Location is required",
  }),
  role: Joi.string()
    .valid("agent", "channel_partner")
    .required()
    .messages({
      "any.required": "User role is required",
      "any.only": "User role must be one of agent or channel_partner",
    }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

