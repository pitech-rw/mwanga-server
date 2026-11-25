-- One-time cleanup: align stored currency with platform default (USD).
-- Run against your database if legacy rows still show non-USD in reports or ledger checks.

UPDATE "Wallet" SET currency = 'USD' WHERE currency IS DISTINCT FROM 'USD';
UPDATE "CompanyAccount" SET currency = 'USD' WHERE currency IS DISTINCT FROM 'USD';
UPDATE "RevenueAccount" SET currency = 'USD' WHERE currency IS DISTINCT FROM 'USD';