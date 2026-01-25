/**
 * Data Masking Utilities
 * Masks sensitive data in records (PAN, SSN, Phone, Email, etc.)
 */

/**
 * Mask PAN (Primary Account Number)
 * Format: XXXX-XXXX-XXXX-1234
 */
export const maskPAN = (pan) => {
  if (!pan || typeof pan !== "string") return "XXXX-XXXX-XXXX-XXXX";
  const cleaned = pan.replace(/\D/g, "");
  if (cleaned.length < 4) return "XXXX-XXXX-XXXX-XXXX";
  const lastFour = cleaned.slice(-4);
  return `XXXX-XXXX-XXXX-${lastFour}`;
};

/**
 * Mask SSN (Social Security Number)
 * Format: XXX-XX-1234
 */
export const maskSSN = (ssn) => {
  if (!ssn || typeof ssn !== "string") return "XXX-XX-XXXX";
  const cleaned = ssn.replace(/\D/g, "");
  if (cleaned.length < 4) return "XXX-XX-XXXX";
  const lastFour = cleaned.slice(-4);
  return `XXX-XX-${lastFour}`;
};

/**
 * Mask Phone Number
 * Format: (XXX) XXX-1234
 */
export const maskPhoneNumber = (phone) => {
  if (!phone || typeof phone !== "string") return "(XXX) XXX-XXXX";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return "(XXX) XXX-XXXX";
  const lastFour = cleaned.slice(-4);
  return `(XXX) XXX-${lastFour}`;
};

/**
 * Mask Email Address
 * Format: a****@example.com
 */
export const maskEmail = (email) => {
  if (!email || typeof email !== "string") return "*@*.com";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "*@*.com";

  const firstChar = localPart.charAt(0);
  const maskedLocal = firstChar + "*".repeat(localPart.length - 1);
  return `${maskedLocal}@${domain}`;
};

/**
 * Mask Credit Card Number
 * Format: XXXX-XXXX-XXXX-1234
 */
export const maskCreditCard = (cardNumber) => {
  if (!cardNumber || typeof cardNumber !== "string")
    return "XXXX-XXXX-XXXX-XXXX";
  const cleaned = cardNumber.replace(/\D/g, "");
  if (cleaned.length < 4) return "XXXX-XXXX-XXXX-XXXX";
  const lastFour = cleaned.slice(-4);
  return `XXXX-XXXX-XXXX-${lastFour}`;
};

/**
 * Mask Name (Show first letter)
 * Format: J****
 */
export const maskName = (name) => {
  if (!name || typeof name !== "string") return "*****";
  if (name.length === 0) return "*****";
  return name.charAt(0) + "*".repeat(Math.max(4, name.length - 1));
};

/**
 * Mask Generic String (Show first and last characters)
 * Format: a****g
 */
export const maskString = (str, minLength = 4) => {
  if (!str || typeof str !== "string") return "*".repeat(minLength);
  if (str.length <= 2) return "*".repeat(minLength);
  const firstChar = str.charAt(0);
  const lastChar = str.charAt(str.length - 1);
  const middleLength = Math.max(minLength - 2, str.length - 2);
  return firstChar + "*".repeat(middleLength) + lastChar;
};

/**
 * Detect field type and apply appropriate masking
 * @param {string} fieldName - Field name (e.g., 'cardNumber', 'ssn', 'email')
 * @param {string} value - Field value to mask
 * @returns {string} Masked value
 */
export const maskByFieldName = (fieldName, value) => {
  if (!fieldName || !value) return "****";

  const lowerName = fieldName.toLowerCase();

  // PAN / Credit Card Numbers
  if (lowerName.includes("card") || lowerName.includes("pan")) {
    return maskCreditCard(value);
  }

  // SSN
  if (lowerName.includes("ssn")) {
    return maskSSN(value);
  }

  // Phone
  if (
    lowerName.includes("phone") ||
    lowerName.includes("mobile") ||
    lowerName.includes("telephone")
  ) {
    return maskPhoneNumber(value);
  }

  // Email
  if (lowerName.includes("email")) {
    return maskEmail(value);
  }

  // Name
  if (
    lowerName.includes("name") ||
    lowerName.includes("fname") ||
    lowerName.includes("lname")
  ) {
    return maskName(value);
  }

  // Default: mask as generic string
  return maskString(value);
};

/**
 * Mask an entire record object
 * Returns a new object with all string values masked
 * @param {object} record - Record object to mask
 * @param {array} fieldsToKeepUnmasked - Fields that should not be masked (e.g., 'id', 'createdAt')
 * @returns {object} Masked record
 */
export const maskRecord = (record, fieldsToKeepUnmasked = []) => {
  if (!record || typeof record !== "object") return {};

  const masked = {};
  const keepUnmasked = new Set(fieldsToKeepUnmasked);

  for (const [key, value] of Object.entries(record)) {
    if (keepUnmasked.has(key)) {
      // Don't mask these fields
      masked[key] = value;
    } else if (typeof value === "string") {
      // Mask string values
      masked[key] = maskByFieldName(key, value);
    } else if (value === null || value === undefined) {
      masked[key] = value;
    } else if (typeof value === "object") {
      // For nested objects, recursively mask
      masked[key] = maskRecord(value, fieldsToKeepUnmasked);
    } else {
      // For numbers, booleans, etc., keep as-is
      masked[key] = value;
    }
  }

  return masked;
};

/**
 * Check if a field is sensitive and should be masked
 * @param {string} fieldName - Field name to check
 * @returns {boolean} True if field should be masked
 */
export const isSensitiveField = (fieldName) => {
  if (!fieldName) return false;

  const sensitivePatterns = [
    "card",
    "pan",
    "ssn",
    "phone",
    "mobile",
    "email",
    "password",
    "pin",
    "secret",
    "token",
    "key",
    "address",
    "zipcode",
    "postal",
    "dob",
    "date_of_birth",
    "account",
    "bank",
    "routing",
    "license",
    "passport",
  ];

  const lowerName = fieldName.toLowerCase();
  return sensitivePatterns.some((pattern) => lowerName.includes(pattern));
};

/**
 * Format masked data for display
 * Adds visual indicator that data is masked
 * @param {string} maskedValue - The masked value
 * @returns {object} Object with masked value and indicator
 */
export const formatMaskedData = (maskedValue) => {
  return {
    displayValue: maskedValue,
    isMasked: true,
    unmaskedLength: null,
  };
};

/**
 * Get list of fields in a record that are sensitive
 * @param {object} record - Record object
 * @returns {array} Array of sensitive field names
 */
export const getSensitiveFields = (record) => {
  if (!record || typeof record !== "object") return [];

  return Object.keys(record).filter((fieldName) => isSensitiveField(fieldName));
};
