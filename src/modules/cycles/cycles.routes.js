const express = require("express");
const router = express.Router();
const cyclesController = require("./cycles.controller");
const { protect, authorize } = require("../../middleware/auth");
const { ROLES } = require("../../constants");

// All cycle routes require authentication
router.use(protect);

/**
 * @swagger
 * /api/cycles:
 *   post:
 *     summary: Create a new cycle (draft)
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CycleInput'
 *     responses:
 *       201:
 *         description: Cycle created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Cycle'
 *       400:
 *         description: Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (field_agent or admin only)
 */
router.post(
  "/",
  authorize(ROLES.FIELD_AGENT, ROLES.ADMIN),
  cyclesController.createCycle
);

/**
 * @swagger
 * /api/cycles:
 *   get:
 *     summary: List all cycles with filtering and pagination
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/CycleStatus'
 *         description: Filter by status
 *       - in: query
 *         name: farmerId
 *         schema:
 *           type: string
 *         description: Filter by farmer ID
 *       - in: query
 *         name: fieldAgentId
 *         schema:
 *           type: string
 *         description: Filter by field agent ID
 *       - in: query
 *         name: type
 *         schema:
 *           $ref: '#/components/schemas/CycleType'
 *         description: Filter by cycle type
 *       - in: query
 *         name: purpose
 *         schema:
 *           $ref: '#/components/schemas/CyclePurpose'
 *         description: Filter by purpose
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of cycles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     cycles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Cycle'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Not authenticated
 */
router.get("/", cyclesController.listCycles);

/**
 * @swagger
 * /api/cycles/{id}:
 *   get:
 *     summary: Get cycle by ID
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle ID
 *     responses:
 *       200:
 *         description: Cycle details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Cycle'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Cycle not found
 */
router.get("/:id", cyclesController.getCycle);

/**
 * @swagger
 * /api/cycles/{id}:
 *   patch:
 *     summary: Update a cycle (draft only)
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CycleUpdate'
 *     responses:
 *       200:
 *         description: Cycle updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   $ref: '#/components/schemas/Cycle'
 *       400:
 *         description: Cannot update non-draft cycle
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (owner or admin only)
 *       404:
 *         description: Cycle not found
 */
router.patch("/:id", cyclesController.updateCycle);

/**
 * @swagger
 * /api/cycles/{id}/submit:
 *   post:
 *     summary: Submit cycle for review (draft → under_review)
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle ID
 *     responses:
 *       200:
 *         description: Cycle submitted for review
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cycle submitted for review
 *                 data:
 *                   $ref: '#/components/schemas/Cycle'
 *       400:
 *         description: Cannot submit cycle (missing fields or wrong status)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (assigned field agent only)
 *       404:
 *         description: Cycle not found
 */
router.post("/:id/submit", cyclesController.submitForReview);

/**
 * @swagger
 * /api/cycles/{id}/approve:
 *   post:
 *     summary: Approve cycle (under_review → approved)
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle ID
 *     responses:
 *       200:
 *         description: Cycle approved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cycle approved
 *                 data:
 *                   $ref: '#/components/schemas/Cycle'
 *       400:
 *         description: Cannot approve (missing off-taker agreement or wrong status)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: Cycle not found
 */
router.post("/:id/approve", authorize(ROLES.ADMIN), cyclesController.approveCycle);

/**
 * @swagger
 * /api/cycles/{id}/reject:
 *   post:
 *     summary: Reject cycle (under_review → cancelled)
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Rejection reason
 *                 example: Farmer documentation incomplete
 *     responses:
 *       200:
 *         description: Cycle rejected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cycle rejected
 *                 data:
 *                   $ref: '#/components/schemas/Cycle'
 *       400:
 *         description: Reason is required
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: Cycle not found
 */
router.post("/:id/reject", authorize(ROLES.ADMIN), cyclesController.rejectCycle);

/**
 * @swagger
 * /api/cycles/{id}/publish:
 *   post:
 *     summary: Publish cycle for funding (approved → funding)
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle ID
 *     responses:
 *       200:
 *         description: Cycle published for funding
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cycle published for funding
 *                 data:
 *                   $ref: '#/components/schemas/Cycle'
 *       400:
 *         description: Cannot publish (wrong status)
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: Cycle not found
 */
router.post("/:id/publish", authorize(ROLES.ADMIN), cyclesController.publishForFunding);

/**
 * @swagger
 * /api/cycles/{id}/cancel:
 *   post:
 *     summary: Cancel cycle (any → cancelled)
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *                 example: Farmer withdrew from program
 *     responses:
 *       200:
 *         description: Cycle cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cycle cancelled
 *                 data:
 *                   $ref: '#/components/schemas/Cycle'
 *       400:
 *         description: Reason is required or cannot cancel from current status
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: Cycle not found
 */
router.post("/:id/cancel", authorize(ROLES.ADMIN), cyclesController.cancelCycle);

/**
 * @swagger
 * /api/cycles/{id}/complete:
 *   post:
 *     summary: Complete cycle (in_progress → completed)
 *     tags: [Cycles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cycle ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - finalSaleAmount
 *             properties:
 *               finalSaleAmount:
 *                 type: number
 *                 description: Final sale amount in RWF
 *                 example: 850000
 *     responses:
 *       200:
 *         description: Cycle completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Cycle completed
 *                 data:
 *                   $ref: '#/components/schemas/Cycle'
 *       400:
 *         description: Final sale amount is required
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (admin only)
 *       404:
 *         description: Cycle not found
 */
router.post("/:id/complete", authorize(ROLES.ADMIN), cyclesController.completeCycle);

module.exports = router;
