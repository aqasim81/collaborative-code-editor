-- Secret invite links (#36, ADR 0003). Existing rooms get a token in the same format as
-- lib/invite.ts: 32 bytes, base64url without padding (43 characters). The bytes come from two v4
-- UUIDs (gen_random_uuid() is built in since Postgres 13; 244 random bits).

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "inviteToken" TEXT;

-- Backfill
UPDATE "Room" SET "inviteToken" = translate(
  rtrim(encode(decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex'), 'base64'), '='),
  '+/',
  '-_'
);

ALTER TABLE "Room" ALTER COLUMN "inviteToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Room_inviteToken_key" ON "Room"("inviteToken");
