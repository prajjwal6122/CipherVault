# Technical Stack Document

## Overview
This document outlines the proposed technology stack for implementing the Secure Client-Side Encryption & Controlled Data Reveal Platform, optimized for security, scalability, and maintainability.

## Client-Side Encryption Tool
- **Language**: Node.js (TypeScript)
- **Crypto Library**: Native `crypto` module / Web Crypto API
- **Encryption**: AES-256-GCM
- **Key Derivation**: PBKDF2 or Argon2
- **Packaging Options**:
  - CLI Tool (Node.js)
  - Desktop App (Electron)

## Data Transfer
- **Protocol**: SFTP
- **Authentication**: SSH key-based authentication
- **Integrity**: Checksum validation post-upload

## Backend Services
- **Runtime**: Node.js
- **Framework**: NestJS
- **API Style**: REST
- **Authentication**: JWT + RBAC
- **Encryption Key Management**:
  - Cloud KMS (AWS KMS / GCP KMS)

## Storage Layer
- **Primary Database**: PostgreSQL
- **Encrypted Payload Storage**:
  - JSONB / BYTEA columns
  - Object Storage (AWS S3 / GCS) for large files

## Dashboard (Frontend)
- **Framework**: React
- **State Management**: React Query
- **Crypto**: Web Crypto API (client-side decryption)
- **UI Security**:
  - Auto-mask on blur / timeout
  - No plaintext persistence

## Observability & Security
- **Logging**: Structured logs + audit trails
- **Monitoring**: Prometheus / Cloud Monitoring
- **Rate Limiting**: API Gateway / Middleware
- **Secrets Management**: Vault / Cloud Secret Manager

## CI/CD & Infrastructure
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Deployment**: Kubernetes / Managed App Services
- **IaC**: Terraform

