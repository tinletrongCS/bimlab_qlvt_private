package com.bimlab.asset.storage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import io.minio.GetObjectResponse;
import io.minio.MinioClient;
import io.minio.StatObjectResponse;
import java.nio.charset.StandardCharsets;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

class MinioServiceTest {
    private MinioService service;
    private MinioClient client;

    @BeforeEach
    void setUp() {
        service = new MinioService();
        client = mock(MinioClient.class);
        ReflectionTestUtils.setField(service, "minioClient", client);
        ReflectionTestUtils.setField(service, "bucket", "assets");
    }

    @Test
    void sanitizeHelpersHandleUnsafeAndMissingNames() {
        assertEquals("my_file.pdf", MinioService.sanitizeFilename("my file.pdf"));
        assertEquals("a__b.pdf", MinioService.sanitizeFilename("a$%b.pdf"));
        assertEquals("unknown", MinioService.sanitizeFilename(null));
        assertEquals("a/b_c", MinioService.sanitizeFolder("a//b$c"));
        assertEquals("pdf", MinioService.extensionOf("Doc.PDF"));
        assertEquals("", MinioService.extensionOf("noext"));
        assertEquals("", MinioService.extensionOf("trailing."));
    }

    @Test
    void initRejectsMissingDefaultAndBrokenConfiguration() {
        ReflectionTestUtils.setField(service, "minioClient", null);
        ReflectionTestUtils.setField(service, "accessKey", " ");
        ReflectionTestUtils.setField(service, "secretKey", "secret");
        assertThrows(IllegalStateException.class, service::init);

        ReflectionTestUtils.setField(service, "accessKey", "minioadmin");
        assertThrows(IllegalStateException.class, service::init);

        ReflectionTestUtils.setField(service, "accessKey", "access");
        ReflectionTestUtils.setField(service, "secretKey", "secret");
        ReflectionTestUtils.setField(service, "endpoint", "not-a-url");
        assertThrows(IllegalStateException.class, service::init);
    }

    @ParameterizedTest
    @MethodSource("validFiles")
    void uploadAcceptsAllowedMagicBytes(String name, String contentType, byte[] bytes) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", name, contentType, bytes);

        String key = service.upload(file, "contracts//2026");

        assertTrue(key.startsWith("contracts/2026/"));
        assertTrue(key.endsWith("_" + name));
        verify(client).putObject(any());
    }

    static Stream<Arguments> validFiles() {
        return Stream.of(
                Arguments.of("a.jpg", "image/jpeg", new byte[] {(byte) 0xff, (byte) 0xd8, (byte) 0xff}),
                Arguments.of("a.png", "image/png", new byte[] {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}),
                Arguments.of("a.gif", "image/gif", "GIF89a".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("a.webp", "image/webp", "RIFF0000WEBP".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("a.bmp", "image/bmp", "BM".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("a.pdf", "application/pdf", "%PDF-".getBytes(StandardCharsets.US_ASCII)),
                Arguments.of("a.doc", "application/msword", new byte[] {(byte) 0xd0, (byte) 0xcf, 0x11, (byte) 0xe0}),
                Arguments.of("a.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "PK".getBytes(StandardCharsets.US_ASCII)));
    }

    @Test
    void uploadRejectsUnavailableDisallowedAndSpoofedFiles() {
        ReflectionTestUtils.setField(service, "minioClient", null);
        MockMultipartFile pdf = new MockMultipartFile("file", "a.pdf", "application/pdf", "%PDF-".getBytes());
        assertThrows(RuntimeException.class, () -> service.upload(pdf, null));

        ReflectionTestUtils.setField(service, "minioClient", client);
        assertThrows(IllegalArgumentException.class, () -> service.upload(
                new MockMultipartFile("file", "a.exe", "application/octet-stream", new byte[] {1}), null));
        assertThrows(IllegalArgumentException.class, () -> service.upload(
                new MockMultipartFile("file", "a.exe", "application/pdf", "%PDF-".getBytes()), null));
        assertThrows(IllegalArgumentException.class, () -> service.upload(
                new MockMultipartFile("file", "a.pdf", "application/pdf", "fake".getBytes()), null));
    }

    @Test
    void uploadWrapsStorageFailure() throws Exception {
        doThrow(new RuntimeException("down")).when(client).putObject(any());
        MockMultipartFile file = new MockMultipartFile("file", "a.pdf", "application/pdf", "%PDF-".getBytes());

        RuntimeException error = assertThrows(RuntimeException.class, () -> service.upload(file, " "));

        assertTrue(error.getMessage().contains("Failed to upload file"));
    }

    @Test
    void objectOperationsReturnValuesAndFailClosed() throws Exception {
        GetObjectResponse stream = mock(GetObjectResponse.class);
        StatObjectResponse stat = mock(StatObjectResponse.class);
        when(client.getPresignedObjectUrl(any())).thenReturn("https://example.test/file");
        when(client.getObject(any())).thenReturn(stream);
        when(client.statObject(any())).thenReturn(stat);
        when(stat.contentType()).thenReturn("application/pdf");

        assertEquals("https://example.test/file", service.getPresignedUrl("x.pdf"));
        assertSame(stream, service.getObjectStream("x.pdf"));
        assertEquals("application/pdf", service.getContentType("x.pdf"));
        service.delete("x.pdf");
        verify(client).removeObject(any());

        when(client.getPresignedObjectUrl(any())).thenThrow(new RuntimeException("down"));
        when(client.getObject(any())).thenThrow(new RuntimeException("down"));
        when(client.statObject(any())).thenThrow(new RuntimeException("down"));
        doThrow(new RuntimeException("down")).when(client).removeObject(any());
        assertNull(service.getPresignedUrl("x.pdf"));
        assertNull(service.getObjectStream("x.pdf"));
        assertEquals("application/octet-stream", service.getContentType("x.pdf"));
        service.delete("x.pdf");
    }

    @Test
    void objectOperationsHandleMissingInputs() {
        assertNull(service.getPresignedUrl(" "));
        assertNull(service.getObjectStream(null));
        assertEquals("application/octet-stream", service.getContentType(""));
        service.delete(null);
    }
}
