import Joi from "joi";

export const registerAdminValidator = Joi.object({
  name: Joi.string().required().messages({
    "any.required": "Name is required",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
  confirm_password: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Password & Confirm password does not match, Please Check it",
      "any.required": "Confirm password is required",
    }),
});

export const loginAdminValidator = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

export const updateAdminValidator = Joi.object({
  name: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional().messages({
    "string.min": "Password must be at least 6 characters long",
  }),
  confirm_password: Joi.string()
    .when("password", {
      is: Joi.exist(),
      then: Joi.required().valid(Joi.ref("password")).messages({
        "any.only": "Password & Confirm password do not match",
        "any.required": "Confirm password is required when updating password",
      }),
      otherwise: Joi.optional(),
    }),
});