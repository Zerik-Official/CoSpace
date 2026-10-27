-- CreateTable
CREATE TABLE "SpaceImage" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpaceImage_createdAt_idx" ON "SpaceImage"("createdAt");
