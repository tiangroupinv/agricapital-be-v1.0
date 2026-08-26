/**
 * Insurance incident types
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2 (insurance.claims)
 */
const INCIDENT_TYPES = {
  DISEASE: 'disease',
  WEATHER: 'weather',
  OTHER: 'other',
};

const INCIDENT_TYPES_LIST = Object.values(INCIDENT_TYPES);

module.exports = {
  INCIDENT_TYPES,
  INCIDENT_TYPES_LIST,
};
