/**
 * KYC constants for investor profile management
 * @see .kiro/specs/investor-kyc-profile/requirements.md
 */

const ALLOWED_KYC_FIELDS = [
  "fullName",
  "idDocumentNumber",
  "phone",
  "paymentDetails",
];

const FORBIDDEN_KYC_FIELDS = [
  "role",
  "passwordHash",
  "kycStatus",
  "email",
  "isActive",
];

const ID_DOCUMENT_MAX_LENGTH = 50;
const FULL_NAME_MAX_LENGTH = 100;
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

module.exports = {
  ALLOWED_KYC_FIELDS,
  FORBIDDEN_KYC_FIELDS,
  ID_DOCUMENT_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  E164_REGEX,
};
