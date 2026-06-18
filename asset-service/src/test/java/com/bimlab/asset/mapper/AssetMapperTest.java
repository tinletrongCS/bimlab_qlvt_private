package com.bimlab.asset.mapper;

import com.bimlab.asset.model.AssetCatalogItem;
import com.bimlab.asset.model.AssetCategory;
import com.bimlab.asset.model.AssetItem;
import com.bimlab.asset.model.Vendor;
import com.bimlab.asset.model.status.AssetClass;
import com.bimlab.asset.model.status.AssetStatus;
import com.bimlab.asset.model.status.CatalogType;
import com.bimlab.asset.model.status.FixedAssetType;
import com.bimlab.asset.model.status.VendorStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AssetMapperTest {

    private final AssetMapper mapper = new AssetMapper();

    @Test
    void toResponse_mapsRelationsAsStableApiDtos() {
        AssetCategory parentCategory = AssetCategory.builder()
                .id(10L)
                .code("FIXED_ASSET")
                .build();
        AssetCategory category = AssetCategory.builder()
                .id(11L)
                .code("TANGIBLE")
                .name("Tài sản hữu hình")
                .parent(parentCategory)
                .assetClass(AssetClass.FIXED_ASSET)
                .active(true)
                .build();
        AssetCatalogItem catalogItem = AssetCatalogItem.builder()
                .id(20L)
                .itemCode("LAPTOP")
                .name("Laptop")
                .catalogType(CatalogType.ASSET)
                .category(category)
                .build();
        Vendor vendor = Vendor.builder()
                .id(30L)
                .name("Vendor")
                .status(VendorStatus.ACTIVE)
                .build();
        AssetItem parentAsset = AssetItem.builder()
                .id(40L)
                .assetCode("PARENT-01")
                .name("Parent")
                .build();
        AssetItem asset = AssetItem.builder()
                .id(1L)
                .assetCode("ASSET-01")
                .name("Workstation")
                .assetCategory(category)
                .catalogItem(catalogItem)
                .parentAsset(parentAsset)
                .vendor(vendor)
                .assetClass(AssetClass.FIXED_ASSET)
                .fixedAssetType(FixedAssetType.TANGIBLE)
                .status(AssetStatus.IN_STOCK)
                .build();

        var response = mapper.toResponse(asset);

        assertEquals("ASSET-01", response.assetCode());
        assertEquals(11L, response.assetCategory().id());
        assertEquals(10L, response.assetCategory().parentId());
        assertEquals(20L, response.catalogItem().id());
        assertEquals(30L, response.vendor().id());
        assertEquals(40L, response.parentAsset().id());
        assertEquals("FIXED_ASSET", response.assetClass());
        assertEquals("IN_STOCK", response.status());
    }

    @Test
    void toResponse_keepsOptionalRelationsNull() {
        AssetItem asset = AssetItem.builder()
                .id(1L)
                .assetCode("ASSET-01")
                .name("Standalone")
                .status(AssetStatus.IN_STOCK)
                .build();

        var response = mapper.toResponse(asset);

        assertNull(response.assetCategory());
        assertNull(response.catalogItem());
        assertNull(response.parentAsset());
        assertNull(response.vendor());
    }
}
