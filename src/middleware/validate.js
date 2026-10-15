const ApiError = require("../utils/apiError");

/**
 * Validate request against Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Request property to validate ('body' or 'query')
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return next(new ApiError(400, messages.join(". ")));
    }

    req[source] = value;
    next();
  };
}

module.exports = {
  validate,
};