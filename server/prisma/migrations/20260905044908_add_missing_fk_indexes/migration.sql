-- CreateIndex
CREATE INDEX "Availability_userId_idx" ON "Availability"("userId");

-- CreateIndex
CREATE INDEX "CustomFormField_serviceTypeId_idx" ON "CustomFormField"("serviceTypeId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "ServiceType_userId_idx" ON "ServiceType"("userId");

-- CreateIndex
CREATE INDEX "ServiceTypeAvailabilityRule_serviceTypeId_idx" ON "ServiceTypeAvailabilityRule"("serviceTypeId");
