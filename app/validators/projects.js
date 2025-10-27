//app/validators/projects.js
import Joi from "joi";

const projectValidation = Joi.object({
  project_title: Joi.string().required(),
  description: Joi.string().required(),
  location: Joi.string().required(),
  // price_range: Joi.string().required(), // e.g. "₹40 L - ₹1.2 Cr"
  min_price: Joi.string()
    .pattern(/^\d+$/)
    .required()
    .messages({
      "string.pattern.base": "min_price must be a valid number",
    }),
  max_price: Joi.string()
    .pattern(/^\d+$/)
    .required()
    .custom((value, helpers) => {
      const { min_price } = helpers.state.ancestors[0];
      if (parseInt(value) < parseInt(min_price)) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .messages({
      "any.invalid": "max_price cannot be less than min_price",
      "string.pattern.base": "max_price must be a valid number",
    }),
});

export default projectValidation;
