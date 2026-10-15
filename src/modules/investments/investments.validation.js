const Joi = require("joi");
const { PAYMENT_METHODS_LIST } = require("../../constants");

const createInvestmentSchema = Joi.object({
  cycleId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      "string.hex": "cycleId must be a valid ObjectId",
      "string.length": "cycleId must be a valid ObjectId",
      "any.required": "cycleId is required",
    }),

  amount: Joi.number()
    .positive()
    .required()
    .messages({
      "number.positive": "amount must be greater than zero",
      "any.required": "amount is required",
    }),

  paymentMethod: Joi.string()
    .valid(...PAYMENT_METHODS_LIST)
    .required()
    .messages({
      "any.only": `paymentMethod must be one of: ${PAYMENT_METHODS_LIST.join(", ")}`,
      "any.required": "paymentMethod is required",
    }),

  transactionReference: Joi.string()
    .trim()
    .min(1)
    .required()
    .messages({
      "string.empty": "transactionReference cannot be empty",
      "any.required": "transactionReference is required",
    }),
});

module.exports = {
  createInvestmentSchema,
};