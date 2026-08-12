package com.bimlab.asset.service;

import com.bimlab.asset.dto.response.AssetQrIssueResponse;
import com.bimlab.asset.dto.response.AssetQrPublicResponse;
import com.bimlab.asset.entity.AssetCategory;
import com.bimlab.asset.entity.AssetItem;
import com.bimlab.asset.entity.AssetQrCode;
import com.bimlab.asset.entity.AssetTransfer;
import com.bimlab.asset.entity.AssetTransferHeader;
import com.bimlab.asset.entity.AuditLog;
import com.bimlab.asset.entity.Vendor;
import com.bimlab.asset.entity.status.AssetClass;
import com.bimlab.asset.entity.status.AssetStatus;
import com.bimlab.asset.entity.status.QrCodeStatus;
import com.bimlab.asset.repository.AssetItemRepository;
import com.bimlab.asset.repository.AssetQrCodeRepository;
import com.bimlab.asset.repository.AssetTransferRepository;
import com.bimlab.asset.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssetQrServiceTest {
    @Mock
    AssetItemRepository assets;
    @Mock
    AssetQrCodeRepository qrCodes;
    @Mock
    AssetTransferRepository transfers;
    @Mock
    AuditLogRepository auditLogs;
    @Mock
    AssetReferenceLookup references;
    @InjectMocks
    AssetQrService service;

    @BeforeEach
    void setPublicPageUrl() {
        ReflectionTestUtils.setField(service, "publicPageUrl", "https://qr.bimlab.com/asset.html");
    }

    @Test
    void issueReusesActiveQrAndRepairsItsPublicUrl() {
        AssetItem asset = asset();
        AssetQrCode qrCode = AssetQrCode.builder()
                .asset(asset)
                .qrToken("token-1")
                .qrPayload("old-url")
                .status(QrCodeStatus.ACTIVE)
                .build();
        when(assets.findById(7L)).thenReturn(Optional.of(asset));
        when(qrCodes.findByAssetIdOrderByCreatedAtDesc(7L)).thenReturn(List.of(qrCode));

        AssetQrIssueResponse response = service.issue(7L);

        assertThat(response.assetCode()).isEqualTo("TS-007");
        assertThat(response.publicUrl()).isEqualTo("https://qr.bimlab.com/asset.html?token=token-1");
        assertThat(qrCode.getQrPayload()).isEqualTo(response.publicUrl());
        verify(qrCodes).save(qrCode);
    }

    @Test
    void issueCreatesQrWhenNoActiveCodeExists() {
        AssetItem asset = asset();
        ReflectionTestUtils.setField(service, "publicPageUrl", "https://qr.bimlab.com/asset.html?lang=vi");
        when(assets.findById(7L)).thenReturn(Optional.of(asset));
        when(qrCodes.findByAssetIdOrderByCreatedAtDesc(7L)).thenReturn(List.of());
        when(qrCodes.save(any(AssetQrCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AssetQrIssueResponse response = service.issue(7L);

        ArgumentCaptor<AssetQrCode> captor = ArgumentCaptor.forClass(AssetQrCode.class);
        verify(qrCodes).save(captor.capture());
        assertThat(captor.getValue().getAsset()).isSameAs(asset);
        assertThat(captor.getValue().getStatus()).isEqualTo(QrCodeStatus.ACTIVE);
        assertThat(response.publicUrl()).contains("?lang=vi&token=");
    }

    @Test
    void issueNeverEmitsLoopbackUrl() {
        AssetItem asset = asset();
        ReflectionTestUtils.setField(service, "publicPageUrl", "http://localhost:3002/asset-qr.html");
        when(assets.findById(7L)).thenReturn(Optional.of(asset));
        when(qrCodes.findByAssetIdOrderByCreatedAtDesc(7L)).thenReturn(List.of());
        when(qrCodes.save(any(AssetQrCode.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(service.issue(7L).publicUrl())
                .startsWith("https://qlvt.bimlab.com.vn/asset-qr.html?token=");
    }

    @Test
    void issueRejectsUnknownAsset() {
        when(assets.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.issue(99L))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Không tìm thấy tài sản");
    }

    @Test
    void publicAssetReturnsCurrentDetailsAndOnlyCompletedApprovedHistory() {
        AssetItem asset = asset();
        AssetQrCode qrCode = AssetQrCode.builder()
                .asset(asset)
                .qrToken("public-token")
                .status(QrCodeStatus.ACTIVE)
                .build();
        AssetTransferHeader approvedHeader = AssetTransferHeader.builder()
                .transferCode("PBG-001")
                .status("APPROVED")
                .build();
        AssetTransferHeader rejectedHeader = AssetTransferHeader.builder()
                .transferCode("PBG-002")
                .status("REJECTED")
                .build();
        AssetTransfer approved = transfer(approvedHeader, "COMPLETED");
        AssetTransfer rejected = transfer(rejectedHeader, "COMPLETED");
        AssetTransfer pending = transfer(approvedHeader, "PENDING");
        AssetTransfer legacy = transfer(null, "COMPLETED");
        when(qrCodes.findByQrToken("public-token")).thenReturn(Optional.of(qrCode));
        when(transfers.findByAssetIdOrderByTransferDateDesc(7L))
                .thenReturn(List.of(approved, rejected, pending, legacy));
        when(references.employeeName(11L)).thenReturn("Nguyễn Văn A");
        when(references.departmentName(12L)).thenReturn("Phòng Kỹ thuật");
        when(references.siteName(13L)).thenReturn("BIMLab");

        AssetQrPublicResponse response = service.getPublicAsset("public-token");

        assertThat(response.assetCode()).isEqualTo("TS-007");
        assertThat(response.categoryName()).isEqualTo("Máy tính");
        assertThat(response.categoryCode()).isEqualTo("LAPTOP");
        assertThat(response.vendorName()).isEqualTo("Dell");
        assertThat(response.assignedEmployeeName()).isEqualTo("Nguyễn Văn A");
        assertThat(response.departmentName()).isEqualTo("Phòng Kỹ thuật");
        assertThat(response.siteName()).isEqualTo("BIMLab");
        assertThat(response.transferHistory()).hasSize(2);
        assertThat(response.transferHistory().get(0).transferCode()).isEqualTo("PBG-001");
        assertThat(response.transferHistory().get(1).status()).isEqualTo("COMPLETED");
    }

    @Test
    void publicAssetRejectsInactiveQr() {
        when(qrCodes.findByQrToken("inactive")).thenReturn(Optional.of(
                AssetQrCode.builder().status(QrCodeStatus.REVOKED).build()
        ));

        assertThatThrownBy(() -> service.getPublicAsset("inactive"))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Không tìm thấy mã QR");
    }

    @Test
    void transferHistoryKeepsNewestApprovedFirstAndCreationLast() {
        AssetItem asset = asset();
        AuditLog approved = AuditLog.builder()
                .action("TRANSFER_APPROVED")
                .actorEmployeeId(null)
                .actorUsername("approver")
                .summary("Duyệt bàn giao tài sản trong phiếu PBG-001")
                .occurredAt(LocalDateTime.of(2026, 7, 15, 10, 30))
                .beforeData(Map.of("siteId", 1))
                .afterData(Map.of("siteId", 2))
                .changedFields(Map.of("siteId", Map.of("before", 1, "after", 2)))
                .build();
        when(qrCodes.findByQrToken("public-token")).thenReturn(Optional.of(
                AssetQrCode.builder()
                        .asset(asset)
                        .qrToken("public-token")
                        .status(QrCodeStatus.ACTIVE)
                        .build()
        ));
        when(auditLogs
                .findByEntityTypeAndEntityIdAndActionAndChangedFieldsIsNotNullOrderByOccurredAtDesc(
                        "ASSET", 7L, "TRANSFER_APPROVED"
                ))
                .thenReturn(List.of(approved));
        when(references.siteName(1L)).thenReturn("BIMLab");
        when(references.siteName(2L)).thenReturn("PCC");
        when(references.employeeName(null, "approver")).thenReturn("Người duyệt");

        var history = service.getTransferHistory("public-token");

        assertThat(history).extracting(event -> event.action())
                .containsExactly("TRANSFER_APPROVED", "ASSET_CREATED");
        assertThat(history.get(0).beforeData()).containsEntry("siteName", "BIMLab");
        assertThat(history.get(0).afterData()).containsEntry("siteName", "PCC");
        assertThat(history.get(0).approvedByName()).isEqualTo("Người duyệt");
        assertThat(history.get(0).approvedByUsername()).isEqualTo("approver");
        var creation = history.get(history.size() - 1);
        assertThat(creation.title()).isEqualTo("Khởi tạo hồ sơ tài sản");
        assertThat(creation.occurredAt()).isEqualTo(asset.getCreatedAt());
    }

    private AssetItem asset() {
        return AssetItem.builder()
                .id(7L)
                .assetCode("TS-007")
                .name("Laptop Dell")
                .serialNumber("SN-007")
                .assetCategory(AssetCategory.builder().code("LAPTOP").name("Máy tính").build())
                .category("Danh mục cũ")
                .assetClass(AssetClass.FIXED_ASSET)
                .technicalDescription("Core i7")
                .assignedEmployeeId(11L)
                .departmentId(12L)
                .siteId(13L)
                .projectId(14L)
                .useDate(LocalDate.of(2026, 7, 15))
                .purchaseDate(LocalDate.of(2026, 1, 2))
                .warrantyUntil(LocalDate.of(2028, 1, 2))
                .vendor(Vendor.builder().name("Dell").build())
                .originalCost(BigDecimal.valueOf(25_000_000))
                .source("Mua mới")
                .status(AssetStatus.ASSIGNED)
                .createdAt(LocalDateTime.of(2026, 1, 2, 8, 30))
                .updatedAt(LocalDateTime.of(2026, 7, 20, 9, 30))
                .build();
    }

    private AssetTransfer transfer(AssetTransferHeader header, String lineStatus) {
        return AssetTransfer.builder()
                .transferHeader(header)
                .asset(asset())
                .transferType("ASSIGN")
                .lineStatus(lineStatus)
                .transferDate(LocalDate.of(2026, 7, 15))
                .fromEmployeeId(1L)
                .toEmployeeId(11L)
                .fromDepartmentId(2L)
                .toDepartmentId(12L)
                .fromSiteId(3L)
                .toSiteId(13L)
                .conditionBefore("Tốt")
                .conditionAfter("Tốt")
                .build();
    }
}
