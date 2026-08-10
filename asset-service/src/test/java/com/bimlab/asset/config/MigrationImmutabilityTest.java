package com.bimlab.asset.config;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MigrationImmutabilityTest {

    private static final Map<String, String> RELEASED_MIGRATIONS = Map.ofEntries(
            Map.entry("V1__baseline.sql", "209aaf2cbd0e3675ddaa0ea4e3ef4d06619c5b5b1467921de3594755453a460e"),
            Map.entry("V2__consumer_event_offsets.sql", "045f93b44e42974c90f40a5e918d48976c323a74c918f7ec6042afa12ec7cfd0"),
            Map.entry("V3__qlvt_asset_schema_refactor.sql", "8e348599144e56983c165e158d7cee2503ca546a3f4e0404555c7f37759c3155"),
            Map.entry("V4__create_booking_session.sql", "93617faa58f2196ed3f4d26b1064eaea04ab49fafe6576b4cf1d5fb956325cc3"),
            Map.entry("V5__add_booking_overlap_constraint.sql", "a6001c3ed96321fc29a709d8371de98a9d83651e5379c5353ead01d36c528aed"),
            Map.entry("V6__create_audit_logs.sql", "3424d4f050d930e2fe1787eac45595b4beb0414d5f796978f20318de1d3c2314"),
            Map.entry("V7__expand_asset_transfer_workflow.sql", "9d64369ac71dfcfc53b90a39bbf0fe2fdd62dedfc40acdaab34e6c13c0e46d38"),
            Map.entry("V8__create_audit_log_definitions.sql", "5643b5ed74f57d5e2ff39ee027007d1bf1e1f93beb5a60732a65fd4c334d24b9"),
            Map.entry("V9__backfill_transfer_approver_full_name.sql", "5524b507548dfb3c634e4dfe0e6797c0566cfa7422d2b833ed4ff753cb2508ce")
    );

    @Test
    void releasedMigrationsMustRemainImmutable() throws Exception {
        Path directory = Path.of(Objects.requireNonNull(
                getClass().getResource("/db/migration"),
                "Migration directory is missing"
        ).toURI());

        TreeSet<String> migrationFiles;
        try (var files = Files.list(directory)) {
            migrationFiles = files
                    .map(path -> path.getFileName().toString())
                    .filter(name -> name.endsWith(".sql"))
                    .collect(java.util.stream.Collectors.toCollection(TreeSet::new));
        }
        assertEquals(new TreeSet<>(RELEASED_MIGRATIONS.keySet()), migrationFiles,
                "Update the released migration checksum list when adding a new migration");

        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        for (var migration : RELEASED_MIGRATIONS.entrySet()) {
            String sql = Files.readString(directory.resolve(migration.getKey()), StandardCharsets.UTF_8)
                    .replace("\r\n", "\n");
            String actual = HexFormat.of().formatHex(digest.digest(sql.getBytes(StandardCharsets.UTF_8)));
            assertEquals(migration.getValue(), actual,
                    migration.getKey() + " was already released; add a new migration instead of editing it");
        }
    }
}
