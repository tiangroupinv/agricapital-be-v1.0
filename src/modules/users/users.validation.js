const Joi = require("joi");

const createFarmerSchema = Joi.object({
  fullName: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .required()
    .messages({
      "string.empty": "fullName cannot be empty",
      "string.max": "fullName cannot exceed 200 characters",
      "any.required": "fullName is required",
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "email must be a valid email format",
      "any.required": "email is required",
    }),

  phone: Joi.string()
    .pattern(/^\+\d{12,15}$/)
    .required()
    .messages({
      "string.pattern.base": "phone must be in format +XXXXXXXXXXXXX (12-15 digits with country code)",
      "any.required": "phone is required",
    }),

  password: Joi.string()
    .min(8)
    .required()
    .messages({
      "string.min": "password must be at least 8 characters",
      "any.required": "password is required",
    }),

  idDocumentNumber: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      "string.empty": "idDocumentNumber cannot be empty",
      "any.required": "idDocumentNumber is required",
    }),

  farmerProfile: Joi.object({
    location: Joi.string()
      .trim()
      .min(1)
      .max(200)
      .required()
      .messages({
        "string.empty": "location cannot be empty",
        "string.max": "location cannot exceed 200 characters",
        "any.required": "location is required",
      }),

    farmType: Joi.string()
      .valid("crop", "livestock")
      .required()
      .messages({
        "any.only": 'farmType must be either "crop" or "livestock"',
        "any.required": "farmType is required",
      }),

    cooperativeName: Joi.string().trim().optional(),
  }).required(),
});

const updateFarmerSchema = Joi.object({
  fullName: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .optional(),

  phone: Joi.string()
    .pattern(/^\+\d{12,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "phone must be in format +XXXXXXXXXXXXX",
    }),

  idDocumentNumber: Joi.string()
    .trim()
    .min(1)
    .optional(),

  paymentDetails: Joi.object({
    momoNumber: Joi.string().optional(),
    bankAccount: Joi.string().optional(),
  }).optional(),

  farmerProfile: Joi.object({
    location: Joi.string()
      .trim()
      .min(1)
      .max(200)
      .optional(),

    farmType: Joi.string()
      .valid("crop", "livestock")
      .optional(),

    cooperativeName: Joi.string().trim().optional(),
  }).optional(),

  role: Joi.any().forbidden().messages({
    "any.unknown": "role cannot be updated through this endpoint",
  }),
});

const listFarmersQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
});

module.exports = {
  createFarmerSchema,
  updateFarmerSchema,
  listFarmersQuerySchema,
};