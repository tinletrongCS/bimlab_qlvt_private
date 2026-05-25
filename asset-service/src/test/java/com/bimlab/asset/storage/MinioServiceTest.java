package com.bimlab.asset.storage;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Q7: unit tests for MinioService static sanitizers / extension parsing.
 * Magic-byte and putObject flows require a real MinIO and are deferred to Q8 integration tests.
 */
class MinioServiceTest {

    @Test
    void sanitizeFilename_replacesUnsafeChars() {
        assertEquals("my_file.pdf", MinioService.sanitizeFilename("my file.pdf"));
        assertEquals("a__b.pdf", MinioService.sanitizeFilename("a$%b.pdf"));
        assertEquals("safe-name_1.txt", MinioService.sanitizeFilename("safe-name_1.txt"));
    }

    @Test
    void sanitizeFilename_nullReturnsUnknown() {
        assertEquals("unknown", MinioService.sanitizeFilename(null));
    }

    @Test
    void sanitizeFolder_collapsesSlashes() {
        assertEquals("a/b", MinioService.sanitizeFolder("a//b"));
        assertEquals("contracts", MinioService.sanitizeFolder("contracts"));
        assertEquals("a/b_c", MinioService.sanitizeFolder("a/b$c"));
    }

    @Test
    void extensionOf_returnsLowercaseExt() {
        assertEquals("pdf", MinioService.extensionOf("Doc.PDF"));
        assertEquals("docx", MinioService.extensionOf("a.b.docx"));
        assertEquals("", MinioService.extensionOf("noext"));
        assertEquals("", MinioService.extensionOf("trailing."));
    }
}
