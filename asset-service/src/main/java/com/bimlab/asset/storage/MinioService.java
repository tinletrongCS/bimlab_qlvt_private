package com.bimlab.asset.storage;

import io.minio.*;
import io.minio.http.Method;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class MinioService {

    @Value("${minio.endpoint}")
    private String endpoint;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Value("${minio.bucket:qlvt-assets}")
    private String bucket;

    private MinioClient minioClient;

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "webp", "bmp",
            "pdf", "doc", "docx", "xls", "xlsx"
    );

    @PostConstruct
    public void init() {
        validateCredentials();
        try {
            this.minioClient = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();

            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket: {}", bucket);
            }
        } catch (Exception e) {
            throw new IllegalStateException("MinIO initialization failed", e);
        }
    }

    private void validateCredentials() {
        if (accessKey == null || accessKey.isBlank() || secretKey == null || secretKey.isBlank()) {
            throw new IllegalStateException("MINIO_ACCESS_KEY and MINIO_SECRET_KEY are required");
        }
        if ("minioadmin".equals(accessKey) || "minioadmin".equals(secretKey)) {
            throw new IllegalStateException("Default MinIO credentials are not allowed");
        }
    }

    public String upload(MultipartFile file, String folder) {
        if (minioClient == null) {
            throw new RuntimeException("MinIO is not available");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Loại file không được phép: " + contentType);
        }
        String ext = extensionOf(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException("Định dạng file không được phép: " + ext);
        }
        validateMagicBytes(file, ext);
        try {
            String safeFolder = (folder == null || folder.isBlank()) ? "misc" : sanitizeFolder(folder);
            String objectKey = safeFolder + "/" + UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
            try (InputStream is = file.getInputStream()) {
                minioClient.putObject(PutObjectArgs.builder()
                        .bucket(bucket)
                        .object(objectKey)
                        .stream(is, file.getSize(), -1)
                        .contentType(file.getContentType())
                        .build());
            }
            log.info("Uploaded file to MinIO: {}", objectKey);
            return objectKey;
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload file to MinIO: " + e.getMessage(), e);
        }
    }

    public String getPresignedUrl(String objectKey) {
        if (minioClient == null || objectKey == null || objectKey.isBlank()) {
            return null;
        }
        try {
            return minioClient.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                    .method(Method.GET)
                    .bucket(bucket)
                    .object(objectKey)
                    .expiry(1, TimeUnit.HOURS)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to generate presigned URL for {}: {}", objectKey, e.getMessage());
            return null;
        }
    }

    public InputStream getObjectStream(String objectKey) {
        if (minioClient == null || objectKey == null || objectKey.isBlank()) return null;
        try {
            return minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to get object stream for {}: {}", objectKey, e.getMessage());
            return null;
        }
    }

    public String getContentType(String objectKey) {
        if (minioClient == null || objectKey == null || objectKey.isBlank()) return "application/octet-stream";
        try {
            var stat = minioClient.statObject(StatObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .build());
            return stat.contentType();
        } catch (Exception e) {
            return "application/octet-stream";
        }
    }

    public void delete(String objectKey) {
        if (minioClient == null || objectKey == null || objectKey.isBlank()) return;
        try {
            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .build());
        } catch (Exception e) {
            log.warn("Failed to delete MinIO object {}: {}", objectKey, e.getMessage());
        }
    }

    // Package-private for testing
    static String sanitizeFilename(String filename) {
        if (filename == null) return "unknown";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    static String sanitizeFolder(String folder) {
        return folder.replaceAll("[^a-zA-Z0-9/_-]", "_").replaceAll("/{2,}", "/");
    }

    static String extensionOf(String filename) {
        String safe = sanitizeFilename(filename).toLowerCase(Locale.ROOT);
        int dot = safe.lastIndexOf('.');
        if (dot < 0 || dot == safe.length() - 1) return "";
        return safe.substring(dot + 1);
    }

    private void validateMagicBytes(MultipartFile file, String ext) {
        try (InputStream is = file.getInputStream()) {
            byte[] head = is.readNBytes(16);
            boolean valid = switch (ext) {
                case "jpg", "jpeg" -> startsWith(head, 0xFF, 0xD8, 0xFF);
                case "png" -> startsWith(head, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A);
                case "gif" -> startsWithAscii(head, "GIF87a") || startsWithAscii(head, "GIF89a");
                case "webp" -> startsWithAscii(head, "RIFF") && head.length >= 12 && asciiAt(head, 8, "WEBP");
                case "bmp" -> startsWithAscii(head, "BM");
                case "pdf" -> startsWithAscii(head, "%PDF-");
                case "doc", "xls" -> startsWith(head, 0xD0, 0xCF, 0x11, 0xE0);
                case "docx", "xlsx" -> startsWithAscii(head, "PK");
                default -> false;
            };
            if (!valid) {
                throw new IllegalArgumentException("Nội dung file không khớp định dạng: " + ext);
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Không đọc được nội dung file", e);
        }
    }

    private boolean startsWith(byte[] bytes, int... expected) {
        if (bytes.length < expected.length) return false;
        for (int i = 0; i < expected.length; i++) {
            if ((bytes[i] & 0xFF) != expected[i]) return false;
        }
        return true;
    }

    private boolean startsWithAscii(byte[] bytes, String expected) {
        return asciiAt(bytes, 0, expected);
    }

    private boolean asciiAt(byte[] bytes, int offset, String expected) {
        if (bytes.length < offset + expected.length()) return false;
        for (int i = 0; i < expected.length(); i++) {
            if (bytes[offset + i] != (byte) expected.charAt(i)) return false;
        }
        return true;
    }
}
