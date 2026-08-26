/**
 * Cycle types (crop or livestock)
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.2
 */
const CYCLE_TYPES = {
  CROP: 'crop',
  LIVESTOCK: 'livestock',
};

const CYCLE_TYPES_LIST = Object.values(CYCLE_TYPES);

module.exports = {
  CYCLE_TYPES,
  CYCLE_TYPES_LIST,
};
