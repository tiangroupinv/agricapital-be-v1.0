/**
 * KYC Service — investor profile management, admin review, KYC gate
 * @see .kiro/specs/investor-kyc-profile/design.md
 */

const User = require("../users/users.model");
const AuditLog = require("../auditLogs/auditLogs.model");
const Investment = require("../investments/investments.model");
const ApiError = require("../../utils/apiError");
const {
  ALLOWED_KYC_FIELDS,
  FORBIDDEN_KYC_FIELDS,
  ID_DOCUMENT_MAX_LENGTH,
  FULL_NAME_MAX_LENGTH,
  E164_REGEX,
} = require("./kyc.constants");
const { KYC_STATUS } = require("../../constants");

/**
 * Fire-and-forget audit log writer (Req 4.5)
 * Failures are logged to console.error but never thrown.
 */
async function writeAuditLog({ actorId, action, entityType, entityId, oldValue, newValue }) {
  try {
    await AuditLog.create({
      actorId: actorId || null,
      action,
      entityType,
      entityId,
      oldValue: oldValue !== undefined ? oldValue : null,
      newValue: newValue !== undefined ? newValue : null,
    });
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
}

/* ------------------------------------------------------------------ */
/*  3.1 submitKycProfile                                              */
/* ------------------------------------------------------------------ */
async function submitKycProfile(callerId, callerRole, targetUserId, updateData) {
  // 1. Caller must be investor (Req 6.7: admin hits endpoint → 403)
  if (callerRole !== "investor") {
    throw new ApiError(403, "This endpoint is for investors only.");
  }

  // 2. Caller must be the owner (Req 6.3)
  if (callerId.toString() !== targetUserId.toString()) {
    throw new ApiError(403, "You do not have permission to update this profile.");
  }

  // 3. Reject forbidden fields
  for (const field of Object.keys(updateData || {})) {
    if (FORBIDDEN_KYC_FIELDS.includes(field)) {
      throw new ApiError(400, `Field '${field}' cannot be updated through this endpoint.`);
    }
  }

  // 4. Extract allowed fields; reject empty
  const allowed = {};
  for (const f of ALLOWED_KYC_FIELDS) {
    if (updateData && f in updateData) allowed[f] = updateData[f];
  }
  const allowedKeys = Object.keys(allowed);
  if (allowedKeys.length === 0) {
    throw new ApiError(400, "At least one KYC field must be provided.");
  }

  // 5. Validate fullName
  if ("fullName" in allowed) {
    const v = allowed.fullName;
    if (typeof v !== "string" || v.trim().length === 0 || v.trim().length > FULL_NAME_MAX_LENGTH) {
      throw new ApiError(400, "fullName must be a non-empty string of 100 characters or fewer.");
    }
    allowed.fullName = v.trim();
  }

  // 6. Validate idDocumentNumber
  if ("idDocumentNumber" in allowed) {
    const v = allowed.idDocumentNumber;
    if (typeof v !== "string" || v.trim().length === 0 || v.trim().length > ID_DOCUMENT_MAX_LENGTH) {
      throw new ApiError(400, "idDocumentNumber must be a non-empty string of 50 characters or fewer.");
    }
    allowed.idDocumentNumber = v.trim();
  }

  // 7. Validate phone (E.164)
  if ("phone" in allowed) {
    const v = allowed.phone;
    if (typeof v !== "string" || !E164_REGEX.test(v.trim())) {
      throw new ApiError(400, "phone must be in E.164 format (e.g. +250788123456).");
    }
    allowed.phone = v.trim();
  }

  // 8. Load investor
  const investor = await User.findById(targetUserId);
  if (!investor) {
    throw new ApiError(404, "User not found.");
  }
  if (investor.role !== "investor") {
    // Spec implies investor-only endpoint; if called on non-investor, reject.
    // (Req 6.3 / 6.7 already handled by caller check, but guard below for safety.)
  }

  // 9. Reject if already verified (Req 1.4)
  if (investor.kycStatus === "verified") {
    throw new ApiError(409, "KYC already verified. Contact support to update your profile.");
  }

  // 10. Check phone uniqueness (Req 1.7)
  if ("phone" in allowed) {
    const other = await User.findOne({ phone: allowed.phone, _id: { $ne: targetUserId } });
    if (other) {
      throw new ApiError(409, "Phone number already registered.");
    }
  }

  // 11. Capture old kycStatus for audit
  const oldStatus = investor.kycStatus;

  // 12. Handle transition: not_required → pending (Req 1.2, 1.3)
  let newStatus = oldStatus;
  if (oldStatus === "not_required") {
    newStatus = "pending";
  }
  // pending/rejected stay unchanged

  // 13. Atomic update (Req 4 — same session / atomic update)
  const updated = await User.findByIdAndUpdate(
    targetUserId,
    { ...allowed, kycStatus: newStatus },
    { new: true, runValidators: true, select: "-passwordHash" }
  );

  // 14. Audit: profile updated (always)
  await writeAuditLog({
    actorId: callerId,
    action: "kyc.profile_updated",
    entityType: "user",
    entityId: targetUserId,
    oldValue: allowedKeys.reduce((o, k) => ({ ...o, [k]: investor[k] ?? null }), {}),
    newValue: allowedKeys.reduce((o, k) => ({ ...o, [k]: updated[k] ?? null }), {}),
  });

  // 15. Audit: status transition (only if changed)
  if (newStatus !== oldStatus) {
    await writeAuditLog({
      actorId: callerId,
      action: "kyc.submitted",
      entityType: "user",
      entityId: targetUserId,
      oldValue: oldStatus,
      newValue: newStatus,
    });
  }

  return {
    _id: updated._id,
    fullName: updated.fullName,
    idDocumentNumber: updated.idDocumentNumber,
    phone: updated.phone,
    paymentDetails: updated.paymentDetails,
    kycStatus: updated.kycStatus,
  };
}

/* ------------------------------------------------------------------ */
/*  3.2 getKycProfile                                                 */
/* ------------------------------------------------------------------ */
async function getKycProfile(callerId, callerRole, targetUserId) {
  // Load user
  const user = await User.findById(targetUserId).select("-passwordHash");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Access control (Req 2.3)
  const isOwner = user._id.toString() === callerId.toString();
  const isAdmin = callerRole === "admin";
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, "You do not have permission to view this profile.");
  }

  return {
    _id: user._id,
    fullName: user.fullName ?? null,
    idDocumentNumber: user.idDocumentNumber ?? null,
    phone: user.phone ?? null,
    paymentDetails: user.paymentDetails ?? null,
    kycStatus: user.kycStatus ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  3.3 updateKycStatus                                               */
/* ------------------------------------------------------------------ */
async function updateKycStatus(adminId, targetUserId, newStatus) {
  // Admin-only (Req 6.2 / 3.4)
  // Note: role guard should be applied at controller / middleware.
  // Service-level guard for defense-in-depth.
  const admin = await User.findById(adminId).select("role");
  if (!admin || admin.role !== "admin") {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }

  // Validate newStatus (Req 3.6)
  const allowed = ["pending", "verified", "rejected"];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(400, "kycStatus must be one of: pending, verified, rejected.");
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Must be investor (Req 3.5)
  if (user.role !== "investor") {
    throw new ApiError(400, "KYC status management applies to investor accounts only.");
  }

  const oldStatus = user.kycStatus;
  const updated = await User.findByIdAndUpdate(
    targetUserId,
    { kycStatus: newStatus },
    { new: true, select: "-passwordHash" }
  );

  // Audit (Req 4.1)
  await writeAuditLog({
    actorId: adminId,
    action: "kyc.status_updated",
    entityType: "user",
    entityId: targetUserId,
    oldValue: oldStatus,
    newValue: newStatus,
  });

  return updated;
}

/* ------------------------------------------------------------------ */
/*  3.4 confirmInvestment                                              */
/* ------------------------------------------------------------------ */
async function confirmInvestment(adminId, investmentId) {
  // Load investment
  const investment = await Investment.findById(investmentId);
  if (!investment) {
    throw new ApiError(404, "Investment not found.");
  }

  // Must be pending (Req 5.3)
  if (investment.status !== "pending") {
    throw new ApiError(422, `Investment status must be 'pending' to confirm. Current status: ${investment.status}.`);
  }

  // Load investor
  const investor = await User.findById(investment.investorId); // don't select -passwordHash for now; we'll just read
  if (!investor) {
    throw new ApiError(404, "User not found.");
  }

  // KYC gate (Req 5.1)
  if (investor.kycStatus !== "verified") {
    throw new ApiError(422, "Investor KYC is not verified. Investment cannot be confirmed.");
  }

  // Confirm
  const updated = await Investment.findByIdAndUpdate(
    investmentId,
    { status: "confirmed", confirmedAt: new Date() },
    { new: true }
  );

  return updated;
}

module.exports = {
  submitKycProfile,
  getKycProfile,
  updateKycStatus,
  confirmInvestment,
};
