# Sample Data Templates for CipherVault

## Overview

This directory contains sample data templates for uploading confidential records to the CipherVault platform.

## File Naming Convention

**Required Format**: `Client_confidential_data.csv` or `Client_confidential_data.xlsx`

## CSV Template Structure

### Required Columns

The following columns are required for healthcare data:

| Column Name           | Type    | Description                  | Example                   |
| --------------------- | ------- | ---------------------------- | ------------------------- |
| `patientName`         | String  | Full name of the patient     | John Doe                  |
| `age`                 | Integer | Age in years                 | 45                        |
| `diagnosis`           | String  | Primary diagnosis            | Hypertension              |
| `bloodType`           | String  | Blood type                   | O+                        |
| `ssn`                 | String  | Social Security Number (PII) | 123-45-6789               |
| `medicalRecordNumber` | String  | Unique MRN                   | MRN-2024-001              |
| `insuranceId`         | String  | Insurance policy number      | INS-987654321             |
| `address`             | String  | Full address                 | 123 Main St, New York, NY |
| `phone`               | String  | Contact phone                | 555-0101                  |
| `email`               | String  | Email address                | john.doe@email.com        |
| `status`              | String  | Patient status               | Active/Discharged/Pending |
| `admissionDate`       | Date    | Date of admission            | 2024-01-15                |
| `medications`         | String  | Current medications          | Lisinopril 10mg           |
| `allergies`           | String  | Known allergies              | Penicillin                |
| `vitalSigns`          | String  | Latest vital signs           | BP: 140/90, HR: 75        |

## Usage Instructions

### 1. Download Template

Copy `Client_confidential_data.csv` to your local machine

### 2. Fill in Data

- Keep the header row exactly as provided
- Fill in patient data row by row
- Ensure sensitive fields (SSN, address, phone) are accurate
- Do not modify column names

### 3. Upload to CipherVault

Use one of the following methods:

#### Method A: CLI Tool

```bash
# Encrypt and upload
cipher-vault upload Client_confidential_data.csv \
  --password "your-encryption-password" \
  --output-dir ./encrypted

# Verify upload
cipher-vault list-records
```

#### Method B: Web Dashboard

1. Login to dashboard at `http://localhost:3001`
2. Navigate to "Upload Records"
3. Select `Client_confidential_data.csv`
4. Enter encryption password
5. Click "Upload & Encrypt"

### 4. Verify Encryption

After upload, records should appear masked in the dashboard:

- Patient names visible
- Sensitive fields (SSN, address) shown as `●●●●●●`
- Status and non-sensitive metadata visible

## Data Security Notes

### What Gets Encrypted

The following fields are automatically encrypted at field-level:

- `ssn` (Social Security Number)
- `address` (Physical address)
- `phone` (Phone number)
- `email` (Email address)
- `insuranceId` (Insurance policy number)
- `vitalSigns` (Medical measurements)
- `medications` (Medication list)
- `allergies` (Allergy information)

### What Remains Visible (Masked)

- `patientName` (for identification)
- `age` (demographics)
- `status` (operational data)
- `admissionDate` (timeline)
- `medicalRecordNumber` (identifier)

## Example Data Sets

### Sample 1: Small Practice (5-10 patients)

Use the included `Client_confidential_data.csv` with 8 patients

### Sample 2: Medium Practice (50+ patients)

Generate more rows following the same format

### Sample 3: Large Dataset (1000+ patients)

Contact support for bulk data generation tools

## File Format Support

### CSV Format (Recommended)

- UTF-8 encoding
- Comma-separated values
- Headers in first row
- No empty rows

### Excel Format (.xlsx)

- Use first sheet only
- Headers in row 1
- No formulas or macros
- Save as `.xlsx` not `.xls`

## Validation Rules

Before upload, ensure:

- [ ] File named `Client_confidential_data.csv` or `.xlsx`
- [ ] All required columns present
- [ ] No empty required fields
- [ ] SSN format: XXX-XX-XXXX
- [ ] Email format: valid@domain.com
- [ ] Date format: YYYY-MM-DD
- [ ] File size < 50MB

## Troubleshooting

### Error: "Invalid file name"

- Ensure file is named exactly `Client_confidential_data.csv`
- Check file extension (.csv or .xlsx only)

### Error: "Missing required columns"

- Verify all 15 columns are present
- Check for typos in column names
- Ensure headers match exactly (case-sensitive)

### Error: "Invalid data format"

- Check SSN format (XXX-XX-XXXX)
- Verify dates are YYYY-MM-DD
- Ensure no special characters in names

## Support

For questions or issues:

- Check documentation: `/docs`
- File issue: GitHub Issues
- Contact: support@ciphervault.com

## License

Sample data is for demonstration purposes only. Do not use real patient data.
