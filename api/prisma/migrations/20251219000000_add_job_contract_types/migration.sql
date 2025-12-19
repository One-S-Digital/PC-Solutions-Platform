-- Add new values to JobContractType enum for better alignment with candidate availability
-- New values: REPLACEMENT, TEMPORARY, FREELANCE

-- Add REPLACEMENT value to JobContractType enum
ALTER TYPE "JobContractType" ADD VALUE IF NOT EXISTS 'REPLACEMENT';

-- Add TEMPORARY value to JobContractType enum
ALTER TYPE "JobContractType" ADD VALUE IF NOT EXISTS 'TEMPORARY';

-- Add FREELANCE value to JobContractType enum
ALTER TYPE "JobContractType" ADD VALUE IF NOT EXISTS 'FREELANCE';
