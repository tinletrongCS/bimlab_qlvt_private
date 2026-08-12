-- V5__add_booking_overlap_constraint.sql

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE asset.asset_booking_sessions
ADD CONSTRAINT ex_asset_booking_no_time_overlap
EXCLUDE USING gist (
    asset_id WITH =,
    tsrange(start_time, end_time, '[)') WITH &&
)
WHERE (
    status IN ('CONFIRMED', 'IN_USE')
);