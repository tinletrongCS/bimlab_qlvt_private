package com.bimlab.asset.repository;

import com.bimlab.asset.model.AssetCatalogItem;
import com.bimlab.asset.model.AssetCategory;
import com.bimlab.asset.model.AssetDocument;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.AssetQrCode;
import com.bimlab.asset.model.AssetTransfer;
import com.bimlab.asset.model.AssetValueSnapshot;
import com.bimlab.asset.model.Contract;
import com.bimlab.asset.model.MaintenanceRecord;
import com.bimlab.asset.model.PurchaseRequest;
import com.bimlab.asset.model.Subscription;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.model.status.AssetClass;
import com.bimlab.asset.model.status.AssetDocumentType;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.model.status.CatalogType;
import com.bimlab.asset.model.status.ContractStatus;
import com.bimlab.asset.model.status.FixedAssetType;
import com.bimlab.asset.model.status.MaintenanceStatus;
import com.bimlab.asset.model.status.PurchaseRequestStatus;
import com.bimlab.asset.model.status.QrCodeStatus;
import com.bimlab.asset.model.status.SubscriptionStatus;
import com.bimlab.asset.model.status.ValueSnapshotSource;
import com.bimlab.asset.model.status.VendorStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AllRepositoriesDataJpaTest {

    @Autowired AssetItemRepository assets;
    @Autowired AssetCategoryRepository assetCategories;
    @Autowired AssetCatalogItemRepository catalogItems;
    @Autowired AssetValueSnapshotRepository valueSnapshots;
    @Autowired AssetDocumentRepository assetDocuments;
    @Autowired AssetQrCodeRepository qrCodes;
    @Autowired AssetTransferRepository assetTransfers;
    @Autowired ContractRepository contracts;
    @Autowired MaintenanceRecordRepository maintenanceRecords;
    @Autowired PurchaseRequestRepository purchaseRequests;
    @Autowired SubscriptionRepository subscriptions;
    @Autowired VendorRepository vendors;

    private Vendor newVendor(String name) {
        return vendors.save(Vendor.builder().name(name).status(VendorStatus.ACTIVE).build());
    }

    private AssetItem newAsset(String code, AssetStatus status) {
        return assets.save(AssetItem.builder()
                .assetCode(code).name(code).category("IT").status(status)
                .purchaseCost(new BigDecimal("1000")).build());
    }

    @Test
    void assetItemRepository_pageable() {
        newAsset("A-1", AssetStatus.IN_STOCK);
        newAsset("A-2", AssetStatus.ASSIGNED);
        var page = assets.findAll(PageRequest.of(0, 1));
        assertEquals(2, page.getTotalElements());
        assertEquals(1, page.getContent().size());
    }

    @Test
    void improvedSchemaRepositories_persistAssetGraph() {
        AssetCategory category = assetCategories.save(AssetCategory.builder()
                .code("TEST_TANGIBLE")
                .name("Test tangible assets")
                .assetClass(AssetClass.FIXED_ASSET)
                .active(true)
                .build());
        AssetCatalogItem catalogItem = catalogItems.save(AssetCatalogItem.builder()
                .itemCode("CAT-001")
                .name("Laptop catalog item")
                .category(category)
                .catalogType(CatalogType.ASSET)
                .active(true)
                .build());
        AssetItem asset = assets.save(AssetItem.builder()
                .assetCode("GRAPH-001")
                .name("Laptop graph")
                .assetCategory(category)
                .catalogItem(catalogItem)
                .assetClass(AssetClass.FIXED_ASSET)
                .fixedAssetType(FixedAssetType.TANGIBLE)
                .status(AssetStatus.IN_STOCK)
                .purchaseCost(new BigDecimal("2000"))
                .build());

        valueSnapshots.save(AssetValueSnapshot.builder()
                .asset(asset)
                .snapshotDate(LocalDate.of(2026, 6, 18))
                .originalCost(new BigDecimal("2000"))
                .bookValue(new BigDecimal("2000"))
                .source(ValueSnapshotSource.SYSTEM_CALCULATION)
                .build());
        AssetDocument document = assetDocuments.save(AssetDocument.builder()
                .asset(asset)
                .documentType(AssetDocumentType.INVOICE)
                .fileName("invoice.pdf")
                .objectKey("assets/GRAPH-001/invoice.pdf")
                .build());
        qrCodes.save(AssetQrCode.builder()
                .asset(asset)
                .qrPayload("asset:GRAPH-001")
                .qrToken("GRAPH-001")
                .status(QrCodeStatus.ACTIVE)
                .build());

        assertEquals(category.getId(), assets.findByAssetCode("GRAPH-001")
                .orElseThrow().getAssetCategory().getId());
        assertEquals(1, valueSnapshots.findByAssetIdOrderBySnapshotDateDesc(asset.getId()).size());
        assertEquals(document.getId(), assetDocuments.findByObjectKey(
                "assets/GRAPH-001/invoice.pdf").orElseThrow().getId());
        assertEquals(asset.getId(), qrCodes.findByQrToken("GRAPH-001")
                .orElseThrow().getAsset().getId());
    }

    @Test
    void contractRepository_existsByContractNumber() {
        Vendor v = newVendor("V1");
        contracts.save(Contract.builder()
                .contractNumber("HD-001").title("X").vendor(v).status(ContractStatus.DRAFT).build());
        assertTrue(contracts.existsByContractNumber("HD-001"));
        assertEquals(false, contracts.existsByContractNumber("HD-NONEXISTENT"));
    }

    @Test
    void purchaseRequestRepository_persistsEnum() {
        PurchaseRequest pr = purchaseRequests.save(PurchaseRequest.builder()
                .requestType("DEVICE").title("Laptop request")
                .estimatedCost(new BigDecimal("5000"))
                .status(PurchaseRequestStatus.APPROVED).build());
        assertNotNull(pr.getId());
        assertEquals(PurchaseRequestStatus.APPROVED,
                purchaseRequests.findById(pr.getId()).orElseThrow().getStatus());
    }

    @Test
    void subscriptionRepository_pageable() {
        Vendor v = newVendor("V-sub");
        subscriptions.save(Subscription.builder()
                .softwareName("Office").vendor(v).totalSeats(10).usedSeats(5)
                .status(SubscriptionStatus.ACTIVE).build());
        var page = subscriptions.findAll(PageRequest.of(0, 10));
        assertEquals(1, page.getTotalElements());
        assertEquals(SubscriptionStatus.ACTIVE, page.getContent().get(0).getStatus());
    }

    @Test
    void maintenanceRecordRepository_findByAssetIdOrderByMaintenanceDateDesc() {
        AssetItem asset = newAsset("MNT-1", AssetStatus.ASSIGNED);
        maintenanceRecords.save(MaintenanceRecord.builder()
                .asset(asset).maintenanceType("PREVENTIVE")
                .maintenanceDate(LocalDate.of(2026, 1, 1))
                .status(MaintenanceStatus.COMPLETED).build());
        maintenanceRecords.save(MaintenanceRecord.builder()
                .asset(asset).maintenanceType("REPAIR")
                .maintenanceDate(LocalDate.of(2026, 6, 1))
                .status(MaintenanceStatus.COMPLETED).build());
        var list = maintenanceRecords.findByAssetIdOrderByMaintenanceDateDesc(asset.getId());
        assertEquals(2, list.size());
        assertEquals("REPAIR", list.get(0).getMaintenanceType(), "newest first");
    }

    @Test
    void assetTransferRepository_customSort_andByAsset() {
        AssetItem asset = newAsset("TRN-1", AssetStatus.IN_STOCK);
        assetTransfers.save(AssetTransfer.builder()
                .asset(asset).transferType("ASSIGN")
                .transferDate(LocalDate.of(2026, 3, 1)).build());
        assetTransfers.save(AssetTransfer.builder()
                .asset(asset).transferType("REVOKE")
                .transferDate(LocalDate.of(2026, 9, 1)).build());

        var sorted = assetTransfers.findAllSortedByDateDesc();
        assertEquals("REVOKE", sorted.get(0).getTransferType());

        var byAsset = assetTransfers.findByAssetIdOrderByTransferDateDesc(asset.getId());
        assertEquals(2, byAsset.size());
        assertEquals("REVOKE", byAsset.get(0).getTransferType());
    }

    @Test
    void vendorRepository_paginates() {
        newVendor("V1");
        newVendor("V2");
        newVendor("V3");
        var page = vendors.findAll(PageRequest.of(0, 2));
        assertEquals(3, page.getTotalElements());
        assertEquals(2, page.getContent().size());
    }
}
