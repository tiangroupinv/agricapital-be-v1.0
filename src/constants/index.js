/**
 * Constants barrel export
 * Centralized enums and values matching the database design doc
 * @see docs/AgriCapital_DB_Design_and_Workflow.md
 */

const { ROLES, ROLES_LIST } = require('./roles');
const { CYCLE_STATUS, CYCLE_STATUS_LIST, CYCLE_TRANSITIONS } = require('./cycleStatus');
const { KYC_STATUS, KYC_STATUS_LIST } = require('./kycStatus');
const { PAYMENT_METHODS, PAYMENT_METHODS_LIST } = require('./paymentMethods');
const { INVESTMENT_STATUS, INVESTMENT_STATUS_LIST } = require('./investmentStatus');
const { DISBURSEMENT_STATUS, DISBURSEMENT_STATUS_LIST } = require('./disbursementStatus');
const { PAYOUT_STATUS, PAYOUT_STATUS_LIST } = require('./payoutStatus');
const { NOTIFICATION_TYPES, NOTIFICATION_TYPES_LIST, NOTIFICATION_CHANNELS, NOTIFICATION_CHANNELS_LIST, NOTIFICATION_STATUS, NOTIFICATION_STATUS_LIST } = require('./notificationTypes');
const { CYCLE_TYPES, CYCLE_TYPES_LIST } = require('./cycleTypes');
const { CYCLE_PURPOSES, CYCLE_PURPOSES_LIST } = require('./cyclePurposes');
const { BUYER_TYPES, BUYER_TYPES_LIST } = require('./buyerTypes');
const { INCIDENT_TYPES, INCIDENT_TYPES_LIST } = require('./incidentTypes');
const { CLAIM_STATUS, CLAIM_STATUS_LIST } = require('./claimStatus');
const { UPDATE_TYPES, UPDATE_TYPES_LIST } = require('./updateTypes');
const { FARM_TYPES, FARM_TYPES_LIST } = require('./farmTypes');

module.exports = {
  // User roles
  ROLES,
  ROLES_LIST,

  // Cycle
  CYCLE_STATUS,
  CYCLE_STATUS_LIST,
  CYCLE_TRANSITIONS,
  CYCLE_TYPES,
  CYCLE_TYPES_LIST,
  CYCLE_PURPOSES,
  CYCLE_PURPOSES_LIST,

  // User KYC
  KYC_STATUS,
  KYC_STATUS_LIST,

  // Payment
  PAYMENT_METHODS,
  PAYMENT_METHODS_LIST,

  // Investment
  INVESTMENT_STATUS,
  INVESTMENT_STATUS_LIST,

  // Disbursement
  DISBURSEMENT_STATUS,
  DISBURSEMENT_STATUS_LIST,

  // Payout
  PAYOUT_STATUS,
  PAYOUT_STATUS_LIST,

  // Notification
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPES_LIST,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNELS_LIST,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUS_LIST,

  // Off-taker
  BUYER_TYPES,
  BUYER_TYPES_LIST,

  // Insurance
  INCIDENT_TYPES,
  INCIDENT_TYPES_LIST,
  CLAIM_STATUS,
  CLAIM_STATUS_LIST,

  // Progress updates
  UPDATE_TYPES,
  UPDATE_TYPES_LIST,

  // Farmer profile
  FARM_TYPES,
  FARM_TYPES_LIST,
};
