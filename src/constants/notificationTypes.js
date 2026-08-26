/**
 * Notification types
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.8
 */
const NOTIFICATION_TYPES = {
  INVESTMENT_CONFIRMED: 'investment_confirmed',
  DISBURSEMENT_MADE: 'disbursement_made',
  PROGRESS_UPDATE: 'progress_update',
  CYCLE_COMPLETED: 'cycle_completed',
};

const NOTIFICATION_TYPES_LIST = Object.values(NOTIFICATION_TYPES);

/**
 * Notification channels
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.8
 */
const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
};

const NOTIFICATION_CHANNELS_LIST = Object.values(NOTIFICATION_CHANNELS);

/**
 * Notification status values
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.8
 */
const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
};

const NOTIFICATION_STATUS_LIST = Object.values(NOTIFICATION_STATUS);

module.exports = {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPES_LIST,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CHANNELS_LIST,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUS_LIST,
};
