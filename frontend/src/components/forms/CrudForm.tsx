import { type FormEvent, useEffect, useState } from "react";
import { type ModalPayload, type ModalState, useActions } from "../../contexts/ActionsContext";
import { useAppData } from "../../contexts/AppDataContext";
import { employeeLabel } from "../../lib/format";
import { CrudModal } from "../CrudModal";
import { AssetCategoryTreeSelect } from "./AssetCategoryTreeSelect";
import {
  DepartmentSelect,
  EmployeeSelect,
  empty,
  Field,
  FormLabel,
  num,
  ProjectSelect,
  Select,
  VendorSelect,
  val,
  WorkSiteSelect,
} from "./FormFields";

export function CrudForm() {
  const {
    vendors,
    employees,
    departments,
    workSites,
    projects,
    assets,
    ensureLookups,
    ensureAssets,
    ensureVendors,
  } = useAppData();
  const { modal, closeModal, submitModal, submitting } = useActions();

  useEffect(() => {
    if (!modal) return;
    if (modal.type === "vendor") return;
    if (modal.type === "subscription" || modal.type === "contract") {
      void ensureVendors();
      return;
    }
    if (modal.type === "maintenance" || modal.type === "transfer") {
      void Promise.all([ensureAssets(), ensureVendors()]);
      return;
    }
    void ensureLookups();
  }, [ensureAssets, ensureLookups, ensureVendors, modal]);

  if (!modal) return null;
  return (
    <CrudFormInner
      modal={modal}
      vendors={vendors}
      employees={employees}
      departments={departments}
      workSites={workSites}
      projects={projects}
      assets={assets}
      submitting={submitting}
      onClose={closeModal}
      onSubmit={submitModal}
    />
  );
}

interface CrudFormInnerProps {
  modal: NonNullable<ModalState>;
  vendors: ReturnType<typeof useAppData>["vendors"];
  employees: ReturnType<typeof useAppData>["employees"];
  departments: ReturnType<typeof useAppData>["departments"];
  workSites: ReturnType<typeof useAppData>["workSites"];
  projects: ReturnType<typeof useAppData>["projects"];
  assets: ReturnType<typeof useAppData>["assets"];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ModalPayload) => Promise<void>;
}

function CrudFormInner({
  modal,
  vendors,
  employees,
  departments,
  workSites,
  projects,
  assets,
  submitting,
  onClose,
  onSubmit,
}: CrudFormInnerProps) {
  const [form, setForm] = useState<Record<string, string>>(() => initialForm(modal));
  const setField = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const titlePrefix = modal.mode === "create" ? "Thêm" : "Cập nhật";

  useEffect(() => {
    if (form.siteId) {
      const siteDepts = departments.filter(
        (d) => String((d as any).siteId) === form.siteId || (d as any).siteId === undefined,
      );
      if (form.departmentId && !siteDepts.some((d) => String(d.id) === form.departmentId)) {
        setField("departmentId", "");
      }
    }
  }, [form.siteId, departments]);

  useEffect(() => {
    if (form.departmentId) {
      const deptName = departments.find((d) => String(d.id) === form.departmentId)?.name;
      const deptEmployees = employees.filter((e) => {
        if ((e as any).departmentId) return String((e as any).departmentId) === form.departmentId;
        if (e.departmentName && deptName) return e.departmentName === deptName;
        return true;
      });
      if (
        form.assignedEmployeeId &&
        !deptEmployees.some((e) => String(e.id) === form.assignedEmployeeId)
      ) {
        setField("assignedEmployeeId", "");
      }
    }
  }, [form.departmentId, employees, departments]);

  const filteredDepartments = form.siteId
    ? departments.filter(
        (d) => String((d as any).siteId) === form.siteId || (d as any).siteId === undefined,
      )
    : departments;

  const filteredEmployees = form.departmentId
    ? employees.filter((e) => {
        const deptName = departments.find((d) => String(d.id) === form.departmentId)?.name;
        if ((e as any).departmentId) return String((e as any).departmentId) === form.departmentId;
        if (e.departmentName && deptName) return e.departmentName === deptName;
        return true;
      })
    : employees;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (modal.type === "vendor") {
      void onSubmit({
        name: form.name,
        taxCode: empty(form.taxCode),
        contactName: empty(form.contactName),
        email: empty(form.email),
        phone: empty(form.phone),
        address: empty(form.address),
        status: form.status || "ACTIVE",
      });
    }
    if (modal.type === "asset") {
      void onSubmit({
        assetCode: form.assetCode,
        name: form.name,
        category: form.category,
        serialNumber: empty(form.serialNumber),
        source: empty(form.source),
        vendorId: num(form.vendorId),
        assignedEmployeeId: num(form.assignedEmployeeId),
        departmentId: num(form.departmentId),
        siteId: num(form.siteId),
        projectId: num(form.projectId),
        purchaseCost: num(form.purchaseCost),
        residualValue: num(form.residualValue),
        purchaseDate: empty(form.purchaseDate),
        warrantyUntil: empty(form.warrantyUntil),
        status: form.status || "IN_STOCK",
        depreciationMethod: empty(form.depreciationMethod) || "NONE",
        usefulLifeYears: num(form.usefulLifeYears),
        notes: empty(form.notes),
      });
    }
    if (modal.type === "subscription") {
      void onSubmit({
        softwareName: form.softwareName,
        planName: empty(form.planName),
        vendorId: num(form.vendorId),
        totalSeats: num(form.totalSeats) || 1,
        usedSeats: num(form.usedSeats) || 0,
        cost: num(form.cost),
        billingCycle: empty(form.billingCycle),
        startDate: empty(form.startDate),
        renewalDate: empty(form.renewalDate),
        status: form.status || "ACTIVE",
        notes: empty(form.notes),
      });
    }
    if (modal.type === "request") {
      void onSubmit({
        requestType: form.requestType,
        title: form.title,
        reason: empty(form.reason),
        estimatedCost: num(form.estimatedCost),
        requesterEmployeeId: num(form.requesterEmployeeId),
        departmentId: num(form.departmentId),
        siteId: num(form.siteId),
        projectId: num(form.projectId),
        neededDate: empty(form.neededDate),
        status: form.status || "PENDING",
        notes: empty(form.notes),
      });
    }
    if (modal.type === "contract") {
      void onSubmit({
        contractNumber: form.contractNumber,
        title: form.title,
        vendorId: num(form.vendorId),
        signDate: empty(form.signDate),
        effectiveFrom: empty(form.effectiveFrom),
        effectiveTo: empty(form.effectiveTo),
        contractValue: num(form.contractValue),
        currency: form.currency || "VND",
        paymentTerms: empty(form.paymentTerms),
        status: form.status || "DRAFT",
        attachmentUrl: empty(form.attachmentUrl),
        notes: empty(form.notes),
      });
    }
    if (modal.type === "maintenance") {
      void onSubmit({
        assetId: Number(form.assetId),
        maintenanceType: form.maintenanceType,
        maintenanceDate: form.maintenanceDate,
        cost: num(form.cost),
        vendorId: num(form.vendorId),
        performedBy: empty(form.performedBy),
        description: empty(form.description),
        nextMaintenanceDate: empty(form.nextMaintenanceDate),
        status: form.status || "COMPLETED",
      });
    }
    if (modal.type === "transfer") {
      void onSubmit({
        assetId: Number(form.assetId),
        transferType: form.transferType,
        fromEmployeeId: num(form.fromEmployeeId),
        toEmployeeId: num(form.toEmployeeId),
        fromDepartmentId: num(form.fromDepartmentId),
        toDepartmentId: num(form.toDepartmentId),
        fromSiteId: num(form.fromSiteId),
        toSiteId: num(form.toSiteId),
        transferDate: form.transferDate,
        reason: empty(form.reason),
        performedBy: empty(form.performedBy),
        handoverDocumentUrl: empty(form.handoverDocumentUrl),
        applyToAsset: form.applyToAsset === "true",
      });
    }
  }

  return (
    <CrudModal
      title={`${titlePrefix} ${modalLabel(modal.type)}`}
      subtitle="Nhập thông tin theo nghiệp vụ QLVT"
      submitting={submitting}
      onClose={onClose}
      onSubmit={submit}
      wide={modal.type === "asset"}
    >
      {modal.type === "vendor" && (
        <>
          <Field
            label="Tên nhà cung cấp"
            value={form.name}
            onChange={(value) => setField("name", value)}
            required
          />
          <Field
            label="Mã số thuế"
            value={form.taxCode}
            onChange={(value) => setField("taxCode", value)}
          />
          <Field
            label="Người liên hệ"
            value={form.contactName}
            onChange={(value) => setField("contactName", value)}
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(value) => setField("email", value)}
            type="email"
          />
          <Field
            label="Điện thoại"
            value={form.phone}
            onChange={(value) => setField("phone", value)}
          />
          <Field
            label="Địa chỉ"
            value={form.address}
            onChange={(value) => setField("address", value)}
          />
          <Select
            label="Trạng thái"
            value={form.status}
            onChange={(value) => setField("status", value)}
            options={[
              ["ACTIVE", "Đang hoạt động"],
              ["INACTIVE", "Ngưng hoạt động"],
            ]}
          />
        </>
      )}
      {modal.type === "asset" && (
        <div className="crud-modal-two-col">
          <div className="crud-modal-col-left">
            <Field
              label="Mã tài sản"
              value={form.assetCode}
              onChange={(value) => setField("assetCode", value)}
              disabled={modal.mode === "create"}
              placeholder={modal.mode === "create" ? "Hệ thống tự sinh" : ""}
              required={modal.mode !== "create"}
            />
            <Field
              label="Tên tài sản"
              value={form.name}
              onChange={(value) => setField("name", value)}
              required
            />
            <Field
              label="Serial"
              value={form.serialNumber}
              onChange={(value) => setField("serialNumber", value)}
            />
            <VendorSelect
              vendors={vendors}
              value={form.vendorId}
              onChange={(value) => setField("vendorId", value)}
            />
            <WorkSiteSelect
              workSites={workSites}
              value={form.siteId}
              onChange={(value) => setField("siteId", value)}
            />
            <DepartmentSelect
              departments={filteredDepartments}
              value={form.departmentId}
              onChange={(value) => setField("departmentId", value)}
            />
            <EmployeeSelect
              employees={filteredEmployees}
              value={form.assignedEmployeeId}
              onChange={(value) => {
                setField("assignedEmployeeId", value);
                setField("status", value ? "ASSIGNED" : "IN_STOCK");
              }}
            />
            <ProjectSelect
              projects={projects}
              value={form.projectId}
              onChange={(value) => setField("projectId", value)}
            />
            <Field
              label="Giá mua"
              value={form.purchaseCost}
              onChange={(value) => setField("purchaseCost", value)}
              type="currency"
            />
            <Field
              label="Giá trị còn lại"
              value={form.residualValue}
              onChange={(value) => setField("residualValue", value)}
              type="currency"
            />
            <Field
              label="Ngày mua"
              value={form.purchaseDate}
              onChange={(value) => setField("purchaseDate", value)}
              type="date"
            />
            <Field
              label="Bảo hành đến"
              value={form.warrantyUntil}
              onChange={(value) => setField("warrantyUntil", value)}
              type="date"
            />
            <Select
              label="Phương pháp khấu hao"
              value={form.depreciationMethod}
              onChange={(value) => setField("depreciationMethod", value)}
              options={[
                ["NONE", "Không khấu hao"],
                ["STRAIGHT_LINE", "Tuyến tính"],
                ["DECLINING_BALANCE", "Số dư giảm dần"],
              ]}
            />
            <Field
              label="Thời gian sử dụng (năm)"
              value={form.usefulLifeYears}
              onChange={(value) => setField("usefulLifeYears", value)}
              type="number"
            />
            <Select
              label="Trạng thái"
              value={form.status}
              onChange={(value) => setField("status", value)}
              options={[
                ["IN_STOCK", "Trong kho"],
                ["ASSIGNED", "Đã cấp phát"],
                ["MAINTENANCE", "Bảo trì"],
                ["DISPOSED", "Đã thanh lý"],
              ]}
            />
            <div style={{ gridColumn: "1 / -1" }}>
              <label>
                <FormLabel>Ghi chú</FormLabel>
                <textarea
                  className="crud-notes-textarea"
                  value={form.notes || ""}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={4}
                />
              </label>
            </div>
          </div>
          <div className="crud-modal-col-right">
            <AssetCategoryTreeSelect
              label="Danh mục tài sản"
              value={form.category}
              onChange={(name, code) => {
                setField("category", name);
                if (code) setField("categoryCode", code);
              }}
              categoryCode={form.categoryCode}
              onCodeChange={(code) => setField("categoryCode", code)}
              required
            />
          </div>
        </div>
      )}
      {modal.type === "subscription" && (
        <>
          <Field
            label="Tên phần mềm"
            value={form.softwareName}
            onChange={(value) => setField("softwareName", value)}
            required
          />
          <Field
            label="Gói"
            value={form.planName}
            onChange={(value) => setField("planName", value)}
          />
          <VendorSelect
            vendors={vendors}
            value={form.vendorId}
            onChange={(value) => setField("vendorId", value)}
          />
          <Field
            label="Tổng seat"
            value={form.totalSeats}
            onChange={(value) => setField("totalSeats", value)}
            type="number"
          />
          <Field
            label="Đã dùng"
            value={form.usedSeats}
            onChange={(value) => setField("usedSeats", value)}
            type="number"
          />
          <Field
            label="Chi phí"
            value={form.cost}
            onChange={(value) => setField("cost", value)}
            type="currency"
          />
          <Field
            label="Chu kỳ thanh toán"
            value={form.billingCycle}
            onChange={(value) => setField("billingCycle", value)}
          />
          <Field
            label="Ngày bắt đầu"
            value={form.startDate}
            onChange={(value) => setField("startDate", value)}
            type="date"
          />
          <Field
            label="Ngày gia hạn"
            value={form.renewalDate}
            onChange={(value) => setField("renewalDate", value)}
            type="date"
          />
          <Select
            label="Trạng thái"
            value={form.status}
            onChange={(value) => setField("status", value)}
            options={[
              ["ACTIVE", "Đang hoạt động"],
              ["INACTIVE", "Ngưng hoạt động"],
            ]}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <label>
              <FormLabel>Ghi chú</FormLabel>
              <textarea
                className="crud-notes-textarea"
                value={form.notes || ""}
                onChange={(e) => setField("notes", e.target.value)}
                rows={4}
              />
            </label>
          </div>
        </>
      )}
      {modal.type === "request" && (
        <>
          <Field
            label="Tiêu đề"
            value={form.title}
            onChange={(value) => setField("title", value)}
            required
          />
          <Select
            label="Loại đề nghị"
            value={form.requestType}
            onChange={(value) => setField("requestType", value)}
            options={[
              ["DEVICE", "Thiết bị"],
              ["SUPPLY", "Tài sản"],
              ["OFFICE", "Văn phòng phẩm"],
              ["SOFTWARE", "Phần mềm"],
            ]}
          />
          <Field
            label="Lý do"
            value={form.reason}
            onChange={(value) => setField("reason", value)}
          />
          <Field
            label="Chi phí dự kiến"
            value={form.estimatedCost}
            onChange={(value) => setField("estimatedCost", value)}
            type="currency"
          />
          <EmployeeSelect
            employees={employees}
            value={form.requesterEmployeeId}
            onChange={(value) => setField("requesterEmployeeId", value)}
          />
          <DepartmentSelect
            departments={departments}
            value={form.departmentId}
            onChange={(value) => setField("departmentId", value)}
          />
          <WorkSiteSelect
            workSites={workSites}
            value={form.siteId}
            onChange={(value) => setField("siteId", value)}
          />
          <ProjectSelect
            projects={projects}
            value={form.projectId}
            onChange={(value) => setField("projectId", value)}
          />
          <Field
            label="Ngày cần"
            value={form.neededDate}
            onChange={(value) => setField("neededDate", value)}
            type="date"
          />
          <Select
            label="Trạng thái"
            value={form.status}
            onChange={(value) => setField("status", value)}
            options={[
              ["PENDING", "Chờ duyệt"],
              ["APPROVED", "Đã duyệt"],
              ["REJECTED", "Từ chối"],
              ["DRAFT", "Bản nháp"],
            ]}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <label>
              <FormLabel>Ghi chú</FormLabel>
              <textarea
                className="crud-notes-textarea"
                value={form.notes || ""}
                onChange={(e) => setField("notes", e.target.value)}
                rows={4}
              />
            </label>
          </div>
        </>
      )}
      {modal.type === "contract" && (
        <>
          <Field
            label="Số hợp đồng"
            value={form.contractNumber}
            onChange={(value) => setField("contractNumber", value)}
            required
          />
          <Field
            label="Tiêu đề"
            value={form.title}
            onChange={(value) => setField("title", value)}
            required
          />
          <VendorSelect
            vendors={vendors}
            value={form.vendorId}
            onChange={(value) => setField("vendorId", value)}
          />
          <Field
            label="Giá trị hợp đồng"
            value={form.contractValue}
            onChange={(value) => setField("contractValue", value)}
            type="number"
          />
          <Select
            label="Tiền tệ"
            value={form.currency}
            onChange={(value) => setField("currency", value)}
            options={[
              ["VND", "VND"],
              ["USD", "USD"],
              ["EUR", "EUR"],
            ]}
          />
          <Field
            label="Ngày ký"
            value={form.signDate}
            onChange={(value) => setField("signDate", value)}
            type="date"
          />
          <Field
            label="Hiệu lực từ"
            value={form.effectiveFrom}
            onChange={(value) => setField("effectiveFrom", value)}
            type="date"
          />
          <Field
            label="Hiệu lực đến"
            value={form.effectiveTo}
            onChange={(value) => setField("effectiveTo", value)}
            type="date"
          />
          <Field
            label="Điều khoản thanh toán"
            value={form.paymentTerms}
            onChange={(value) => setField("paymentTerms", value)}
          />
          <Field
            label="URL file đính kèm"
            value={form.attachmentUrl}
            onChange={(value) => setField("attachmentUrl", value)}
          />
          <Select
            label="Trạng thái"
            value={form.status}
            onChange={(value) => setField("status", value)}
            options={[
              ["DRAFT", "Bản nháp"],
              ["ACTIVE", "Đang hiệu lực"],
              ["EXPIRED", "Hết hạn"],
              ["TERMINATED", "Đã hủy"],
              ["COMPLETED", "Hoàn thành"],
            ]}
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <label>
              <FormLabel>Ghi chú</FormLabel>
              <textarea
                className="crud-notes-textarea"
                value={form.notes || ""}
                onChange={(e) => setField("notes", e.target.value)}
                rows={4}
              />
            </label>
          </div>
        </>
      )}
      {modal.type === "maintenance" && (
        <>
          <label>
            <FormLabel required>Tài sản</FormLabel>
            <select
              value={form.assetId}
              onChange={(event) => setField("assetId", event.target.value)}
              required
            >
              <option value="">Chọn tài sản</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetCode} · {asset.name}
                </option>
              ))}
            </select>
          </label>
          <Select
            label="Loại bảo trì"
            value={form.maintenanceType}
            onChange={(value) => setField("maintenanceType", value)}
            options={[
              ["PREVENTIVE", "Bảo trì định kỳ"],
              ["REPAIR", "Sửa chữa"],
              ["INSPECTION", "Kiểm tra"],
              ["CALIBRATION", "Hiệu chuẩn"],
            ]}
          />
          <Field
            label="Ngày bảo trì"
            value={form.maintenanceDate}
            onChange={(value) => setField("maintenanceDate", value)}
            type="date"
            required
          />
          <Field
            label="Chi phí"
            value={form.cost}
            onChange={(value) => setField("cost", value)}
            type="currency"
          />
          <VendorSelect
            vendors={vendors}
            value={form.vendorId}
            onChange={(value) => setField("vendorId", value)}
          />
          <Field
            label="Người thực hiện"
            value={form.performedBy}
            onChange={(value) => setField("performedBy", value)}
          />
          <Field
            label="Mô tả"
            value={form.description}
            onChange={(value) => setField("description", value)}
          />
          <Field
            label="Lần bảo trì kế tiếp"
            value={form.nextMaintenanceDate}
            onChange={(value) => setField("nextMaintenanceDate", value)}
            type="date"
          />
          <Select
            label="Trạng thái"
            value={form.status}
            onChange={(value) => setField("status", value)}
            options={[
              ["COMPLETED", "Đã hoàn thành"],
              ["SCHEDULED", "Đã lên lịch"],
              ["CANCELED", "Đã hủy"],
            ]}
          />
        </>
      )}
      {modal.type === "transfer" && (
        <>
          <label>
            <FormLabel required>Tài sản</FormLabel>
            <select
              value={form.assetId}
              onChange={(event) => setField("assetId", event.target.value)}
              required
            >
              <option value="">Chọn tài sản</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetCode} · {asset.name}
                </option>
              ))}
            </select>
          </label>
          <Select
            label="Loại luân chuyển"
            value={form.transferType}
            onChange={(value) => setField("transferType", value)}
            options={[
              ["ASSIGN", "Cấp phát"],
              ["REVOKE", "Thu hồi"],
              ["REASSIGN", "Cấp lại"],
              ["DEPARTMENT_CHANGE", "Chuyển phòng ban"],
              ["SITE_CHANGE", "Chuyển site"],
            ]}
          />
          <EmployeeSelect
            employees={employees}
            value={form.fromEmployeeId}
            onChange={(value) => setField("fromEmployeeId", value)}
          />
          <label>
            <FormLabel>Nhân viên nhận</FormLabel>
            <select
              value={form.toEmployeeId}
              onChange={(event) => setField("toEmployeeId", event.target.value)}
            >
              <option value="">Không gán</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employeeLabel(employee)}
                </option>
              ))}
            </select>
          </label>
          <DepartmentSelect
            departments={departments}
            value={form.toDepartmentId}
            onChange={(value) => setField("toDepartmentId", value)}
          />
          <WorkSiteSelect
            workSites={workSites}
            value={form.toSiteId}
            onChange={(value) => setField("toSiteId", value)}
          />
          <Field
            label="Ngày luân chuyển"
            value={form.transferDate}
            onChange={(value) => setField("transferDate", value)}
            type="date"
            required
          />
          <Field
            label="Lý do"
            value={form.reason}
            onChange={(value) => setField("reason", value)}
          />
          <Field
            label="Người ghi"
            value={form.performedBy}
            onChange={(value) => setField("performedBy", value)}
          />
          <Field
            label="URL biên bản bàn giao"
            value={form.handoverDocumentUrl}
            onChange={(value) => setField("handoverDocumentUrl", value)}
          />
          <Select
            label="Cập nhật tài sản?"
            value={form.applyToAsset}
            onChange={(value) => setField("applyToAsset", value)}
            options={[
              ["true", "Có -- đồng bộ người dùng/phòng ban lên tài sản"],
              ["false", "Không -- chỉ ghi nhận lịch sử"],
            ]}
          />
        </>
      )}
    </CrudModal>
  );
}

function initialForm(modal: NonNullable<ModalState>): Record<string, string> {
  if (modal.type === "vendor")
    return {
      name: modal.item?.name || "",
      taxCode: modal.item?.taxCode || "",
      contactName: modal.item?.contactName || "",
      email: modal.item?.email || "",
      phone: modal.item?.phone || "",
      address: modal.item?.address || "",
      status: modal.item?.status || "ACTIVE",
    };
  if (modal.type === "asset")
    return {
      assetCode: modal.item?.assetCode || "",
      name: modal.item?.name || "",
      category: modal.item?.category || "",
      serialNumber: modal.item?.serialNumber || "",
      source: modal.item?.source || "",
      vendorId: modal.item?.vendor?.id ? String(modal.item.vendor.id) : "",
      assignedEmployeeId: val(modal.item?.assignedEmployeeId),
      departmentId: val(modal.item?.departmentId),
      siteId: val(modal.item?.siteId),
      projectId: val(modal.item?.projectId),
      purchaseCost: val(modal.item?.purchaseCost),
      residualValue: val(modal.item?.residualValue),
      purchaseDate: modal.item?.purchaseDate || "",
      warrantyUntil: modal.item?.warrantyUntil || "",
      status: modal.item?.status || "IN_STOCK",
      depreciationMethod: modal.item?.depreciationMethod || "NONE",
      usefulLifeYears: val(modal.item?.usefulLifeYears),
      notes: "",
    };
  if (modal.type === "subscription")
    return {
      softwareName: modal.item?.softwareName || "",
      planName: modal.item?.planName || "",
      vendorId: modal.item?.vendor?.id ? String(modal.item.vendor.id) : "",
      totalSeats: val(modal.item?.totalSeats || 1),
      usedSeats: val(modal.item?.usedSeats || 0),
      cost: val(modal.item?.cost),
      billingCycle: modal.item?.billingCycle || "",
      startDate: "",
      renewalDate: modal.item?.renewalDate || "",
      status: modal.item?.status || "ACTIVE",
      notes: "",
    };
  if (modal.type === "request")
    return {
      requestType: modal.item?.requestType || "DEVICE",
      title: modal.item?.title || "",
      reason: modal.item?.reason || "",
      estimatedCost: val(modal.item?.estimatedCost),
      requesterEmployeeId: val(modal.item?.requesterEmployeeId),
      departmentId: "",
      siteId: "",
      projectId: "",
      neededDate: modal.item?.neededDate || "",
      status: modal.item?.status || "PENDING",
      notes: "",
    };
  if (modal.type === "contract")
    return {
      contractNumber: modal.item?.contractNumber || "",
      title: modal.item?.title || "",
      vendorId: modal.item?.vendor?.id ? String(modal.item.vendor.id) : "",
      contractValue: val(modal.item?.contractValue),
      currency: modal.item?.currency || "VND",
      signDate: modal.item?.signDate || "",
      effectiveFrom: modal.item?.effectiveFrom || "",
      effectiveTo: modal.item?.effectiveTo || "",
      paymentTerms: modal.item?.paymentTerms || "",
      attachmentUrl: modal.item?.attachmentUrl || "",
      status: modal.item?.status || "DRAFT",
      notes: modal.item?.notes || "",
    };
  if (modal.type === "maintenance")
    return {
      assetId: modal.item?.asset?.id ? String(modal.item.asset.id) : "",
      maintenanceType: modal.item?.maintenanceType || "PREVENTIVE",
      maintenanceDate: modal.item?.maintenanceDate || new Date().toISOString().slice(0, 10),
      cost: val(modal.item?.cost),
      vendorId: modal.item?.vendor?.id ? String(modal.item.vendor.id) : "",
      performedBy: modal.item?.performedBy || "",
      description: modal.item?.description || "",
      nextMaintenanceDate: modal.item?.nextMaintenanceDate || "",
      status: modal.item?.status || "COMPLETED",
    };
  return {
    assetId: "",
    transferType: "ASSIGN",
    fromEmployeeId: "",
    toEmployeeId: "",
    fromDepartmentId: "",
    toDepartmentId: "",
    fromSiteId: "",
    toSiteId: "",
    transferDate: new Date().toISOString().slice(0, 10),
    reason: "",
    performedBy: "",
    handoverDocumentUrl: "",
    applyToAsset: "true",
  };
}

function modalLabel(type: NonNullable<ModalState>["type"]): string {
  const labels: Record<NonNullable<ModalState>["type"], string> = {
    vendor: "nhà cung cấp",
    asset: "tài sản",
    subscription: "subscription",
    request: "đề nghị mua sắm",
    contract: "hợp đồng",
    maintenance: "bản ghi bảo trì",
    transfer: "lệnh luân chuyển",
  };
  return labels[type];
}
