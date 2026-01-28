/**
 * KMS Service Initialization
 * Lazy loads the KeyManagementService or falls back to LocalKMSService
 */

let kmsInstance = null;

function getKMSService() {
  if (!kmsInstance) {
    const provider = (
      process.env.KMS_PROVIDER ||
      process.env.PRIMARY_KMS_PROVIDER ||
      "local"
    ).toLowerCase();

    // Use Local KMS for development or when cloud KMS is not configured
    if (provider === "local" || !process.env.PRIMARY_KMS_PROVIDER) {
      const LocalKMSService = require("../crypto/local-kms-service");
      try {
        kmsInstance = new LocalKMSService({
          masterKey: process.env.LOCAL_MASTER_KEY
            ? Buffer.from(process.env.LOCAL_MASTER_KEY, "base64")
            : undefined,
          keyId: process.env.LOCAL_KEY_ID || "local-master-key-v1",
        });
      } catch (error) {
        throw error;
      }
    } else {
      // Cloud KMS (AWS/GCP)
      const KeyManagementService = require("../crypto/key-management-service");
      try {
        kmsInstance = new KeyManagementService({
          primaryProvider: provider,
          fallbackProvider: process.env.FALLBACK_KMS_PROVIDER || null,
          aws:
            provider === "aws"
              ? {
                  region: process.env.AWS_REGION || "us-east-1",
                  keyId: process.env.AWS_KMS_KEY_ID,
                }
              : undefined,
          gcp:
            provider === "gcp"
              ? {
                  projectId: process.env.GCP_PROJECT_ID,
                  locationId: process.env.GCP_LOCATION || "global",
                  keyRingId: process.env.GCP_KEY_RING_ID,
                  keyId: process.env.GCP_KEY_ID,
                }
              : undefined,
        });
      } catch (error) {
        // Fallback to local KMS
        const LocalKMSService = require("../crypto/local-kms-service");
        kmsInstance = new LocalKMSService();
      }
    }
  }
  return kmsInstance;
}

module.exports = {
  getKMSService,
};
