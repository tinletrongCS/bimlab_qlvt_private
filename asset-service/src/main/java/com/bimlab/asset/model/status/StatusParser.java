package com.bimlab.asset.model.status;

public final class StatusParser {
    private StatusParser() {}

    public static <E extends Enum<E>> E parse(Class<E> type, String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Trạng thái không được để trống");
        }
        try {
            return Enum.valueOf(type, raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ: " + raw);
        }
    }

    public static <E extends Enum<E>> E parseOrNull(Class<E> type, String raw) {
        if (raw == null || raw.isBlank()) return null;
        return parse(type, raw);
    }
}
