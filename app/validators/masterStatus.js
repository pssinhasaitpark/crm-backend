//app/validators/masterStatus.js
import Joi from 'joi';

export const masterStatusValidators = Joi.object({
    name: Joi.string().required().messages({
        "string.empty": "Name is Required",
        "any.required": "Name is Required"
    }),
    description: Joi.string().required().messages({
        "string.empty": "Description is Required",
        "any.required": "Description is Required"
    })
})