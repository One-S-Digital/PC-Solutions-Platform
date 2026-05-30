-- Allow admin-created staffing requests to exist without a foundation organisation
ALTER TABLE "staffing_requests" ALTER COLUMN "foundationId" DROP NOT NULL;
