/**
 * User roles
 * @see docs/AgriCapital_DB_Design_and_Workflow.md §3.1
 */
const ROLES = {
  INVESTOR: 'investor',
  FARMER: 'farmer',
  FIELD_AGENT: 'field_agent',
  ADMIN: 'admin',
};

const ROLES_LIST = Object.values(ROLES);

module.exports = {
  ROLES,
  ROLES_LIST,
};
