# Test Encryption with Sample Data

## Files Created:
1. `sample_data.csv` - General PII & Financial Data (10 records)
2. `medical_records_sample.csv` - Medical Records (10 records)

## How to Test Encryption:

### Step 1: Navigate to Records Page
- Login to CipherVault
- Click "Upload Records" or "View Records" from dashboard

### Step 2: Use the Create Record Form
1. Click "+ Create Encrypted Record" button
2. Select record type (PII, Financial, Medical, etc.)
3. Copy data from one of the CSV files above
4. Enter a strong password (e.g., `MySecretPass123!`)
5. Add a summary (e.g., "Employee PII Data")
6. Click "Encrypt & Create Record"

### Step 3: Verify Encryption
- The data will be encrypted client-side using AES-256-GCM
- Password is used with PBKDF2 (100,000 iterations) to derive encryption key
- Record appears in list with masked data

### Step 4: Test Decryption
1. Click "Reveal" button on the encrypted record
2. Enter the same password you used to encrypt
3. Data should decrypt and display in plaintext

### Step 5: Check Audit Logs
- Navigate to "Audit Logs" page
- You should see:
  - CREATE_RECORD action
  - REVEAL_RECORD action (if you revealed)

## Sample Data Included:

### sample_data.csv (PII/Financial):
- 10 employee records
- SSN, Credit Cards, Addresses
- Phone numbers, Email addresses
- Account numbers, Salary info

### medical_records_sample.csv (Medical):
- 10 patient records
- Medical Record Numbers
- Diagnoses, Medications
- Doctor names, Insurance IDs
- Blood types, Emergency contacts

## Password Recommendations for Testing:
- `TestPassword123!`
- `SecureKey2026@`
- `MyEncryptionPass#456`

## Expected Behavior:
✅ Data encrypted before leaving browser
✅ Server never sees plaintext or password
✅ Masked preview shows pattern (e.g., `****-****-****-1234`)
✅ Reveal requires correct password
✅ Client-side decryption using Web Crypto API
✅ All actions logged in audit trail

## Security Notes:
- Password is NEVER sent to server
- Encryption happens in browser using Web Crypto API
- Salt is randomly generated per record
- Each record has unique encryption
- Server only stores encrypted data + salt

## Quick Test Commands:

### Test 1: Single Field Encryption
```
Record Type: PII
Data: {"ssn": "123-45-6789", "name": "John Smith"}
Password: TestPassword123!
```

### Test 2: Medical Record
```
Record Type: Medical
Data: Copy a row from medical_records_sample.csv
Password: MedicalSecure2026!
```

### Test 3: Financial Data
```
Record Type: Financial
Data: Copy a row from sample_data.csv (credit card + account)
Password: FinancialKey#789
```

---

**Note:** Remember your passwords! They cannot be recovered if forgotten.
The system uses zero-knowledge encryption - passwords are never stored.
