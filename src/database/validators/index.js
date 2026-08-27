/**
 * MongoDB Schema Validators - Barrel Export
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §7
 */

const users = require("./users.validator");
const cycles = require("./cycles.validator");
const investments = require("./investments.validator");
const disbursements = require("./disbursements.validator");
const progressUpdates = require("./progressUpdates.validator");
const payouts = require("./payouts.validator");
const auditLogs = require("./auditLogs.validator");
const notifications = require("./notifications.validator");

module.exports = {
  users,
  cycles,
  investments,
  disbursements,
  progressUpdates,
  payouts,
  auditLogs,
  notifications,
};
