-- Add review fields to Submission model

ALTER TABLE "Submission" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Submission" ADD COLUMN "overrideScore" DECIMAL(5,2);
ALTER TABLE "Submission" ADD COLUMN "reviewNotes" TEXT;
ALTER TABLE "Submission" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Submission" ADD COLUMN "flaggedForReview" BOOLEAN NOT NULL DEFAULT false;
