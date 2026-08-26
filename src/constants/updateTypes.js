/**
 * Progress update types
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.5
 */
const UPDATE_TYPES = {
  HEALTH_CHECK: 'health_check',
  GROWTH_STAGE: 'growth_stage',
  VACCINATION: 'vaccination',
  HARVEST: 'harvest',
  INCIDENT: 'incident',
};

const UPDATE_TYPES_LIST = Object.values(UPDATE_TYPES);

module.exports = {
  UPDATE_TYPES,
  UPDATE_TYPES_LIST,
};
