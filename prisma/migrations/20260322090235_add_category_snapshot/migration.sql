-- CreateTable
CREATE TABLE "CategorySnapshot" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "offset" INTEGER NOT NULL DEFAULT 0,
    "recipes" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategorySnapshot_category_idx" ON "CategorySnapshot"("category");

-- CreateIndex
CREATE INDEX "CategorySnapshot_expiresAt_idx" ON "CategorySnapshot"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CategorySnapshot_category_offset_key" ON "CategorySnapshot"("category", "offset");
