const express = require("express");
const router = express.Router();

const { protect, authorize } = require("../../middleware/auth");
const { ROLES } = require("../../constants");
const investmentsController = require("./investments.controller");
const { createInvestmentSchema } = require("./investments.validation");
const { validate } = require("../../middleware/validate");

/**
 * @swagger
 * /api/investments:
 *   post:
 *     summary: Initiate a new investment
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cycleId
 *               - amount
 *               - paymentMethod
 *               - transactionReference
 *             properties:
 *               cycleId:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 description: Cycle ObjectId
 *                 example: "6789abcdef0123456789abcd"
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 description: Investment amount in RWF
 *                 example: 500000
 *               paymentMethod:
 *                 type: string
 *                 enum: [momo, airtel_money, bank_transfer]
 *                 description: Payment method
 *                 example: "momo"
 *               transactionReference:
 *                 type: string
 *                 description: Transaction reference from payment provider
 *                 example: "MTN-123456789"
 *     responses:
 *       201:
 *         description: Investment created with pending status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Investment'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
router.post(
  "/",
  protect,
  authorize(ROLES.INVESTOR),
  validate(createInvestmentSchema),
  investmentsController.createInvestment
);

/**
 * @swagger
 * /api/investments/{id}/confirm:
 *   post:
 *     summary: Confirm an investment (pending -> confirmed)
 *     tags: [Investments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Investment ObjectId
 *     responses:
 *       200:
 *         description: Investment confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Investment'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
router.post("/:id/confirm", protect, authorize(ROLES.INVESTOR, ROLES.ADMIN), investmentsController.confirmInvestment);

module.exports = router;
