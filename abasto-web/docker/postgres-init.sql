-- Runs once, when the volume is first created.
CREATE DATABASE abasto_test OWNER abasto;
-- Tests need no durability; waiting on WAL fsync made them time out.
ALTER DATABASE abasto_test SET synchronous_commit = off;
