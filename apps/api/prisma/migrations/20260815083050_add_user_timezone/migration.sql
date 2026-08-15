-- AlterTable
ALTER TABLE "public"."Memory" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';
