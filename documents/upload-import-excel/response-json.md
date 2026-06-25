{
  "uploadId": "IMPORT-20260625-0001",
  "uploadStatus": "HAS_ERROR",
  "totalRows": 5,
  "validRows": 3,
  "errorRows": 2,
  "warningRows": 1,
  "rows": [
    {
      "rowNumber": 2,
      "status": "VALID",
      "assetName": "Màn hình Dell 24 inch",
      "categoryCode": "MONITOR",
      "generatedAssetCodePreview": "MONITOR-00001",
      "errors": [],
      "warnings": []
    },
    {
      "rowNumber": 3,
      "status": "INVALID",
      "assetName": "Màn hình Dell 24 inch",
      "categoryCode": "SCREEN_ABC",
      "generatedAssetCodePreview": null,
      "errors": [
        {
          "field": "categoryCode",
          "code": "CATEGORY_NOT_FOUND",
          "message": "Danh mục tài sản SCREEN_ABC chưa được định nghĩa trong hệ thống."
        }
      ],
      "warnings": []
    },
    {
      "rowNumber": 4,
      "status": "INVALID",
      "assetName": "Máy in HP",
      "categoryCode": "PRINTER",
      "generatedAssetCodePreview": null,
      "errors": [
        {
          "field": "originalCost",
          "code": "NEGATIVE_VALUE",
          "message": "Nguyên giá không được nhỏ hơn 0."
        }
      ],
      "warnings": []
    }
  ]
}