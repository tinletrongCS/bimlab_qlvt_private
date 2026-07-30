const statusLabels = {
  IN_STOCK: "Trong kho",
  ASSIGNED: "Đã cấp phát",
  MAINTENANCE: "Đang bảo trì",
  DISPOSED: "Đã thanh lý",
};
const assetClassLabels = {
  FIXED_ASSET: "Tài sản cố định",
  TOOL_EQUIPMENT: "Công cụ dụng cụ",
};
const dateFormat = new Intl.DateTimeFormat("vi-VN");
const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "medium",
});
const moneyFormat = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const valueOrDash = (value) =>
  value === null || value === undefined || value === "" ? "—" : value;
const formatDate = (value) => (value ? dateFormat.format(new Date(`${value}T00:00:00`)) : "—");
const formatDateTime = (value) => (value ? dateTimeFormat.format(new Date(value)) : "—");
const reference = (label, id) => (id ? `${label} #${id}` : "Chưa gán");

function fillFacts(id, facts) {
  const container = document.getElementById(id);
  container.replaceChildren(
    ...facts.map(([label, value]) => {
      const item = document.createElement("div");
      item.className = "fact";
      const caption = document.createElement("span");
      caption.textContent = label;
      const content = document.createElement("strong");
      content.textContent = valueOrDash(value);
      item.append(caption, content);
      return item;
    }),
  );
}

function routeText(employeeId, departmentId, siteId) {
  return (
    [
      employeeId ? `Nhân sự #${employeeId}` : null,
      departmentId ? `Phòng ban #${departmentId}` : null,
      siteId ? `Chi nhánh #${siteId}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Kho / chưa gán"
  );
}

function renderHistory(items) {
  const list = document.getElementById("history-list");
  if (!Array.isArray(items)) {
    document.getElementById("history-count").textContent = "Không khả dụng";
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Không tải được lịch sử bàn giao.";
    list.replaceChildren(empty);
    return;
  }

  const orderedItems = [...items].sort((left, right) => {
    if (left.action === "ASSET_CREATED" && right.action === "ASSET_CREATED") return 0;
    if (left.action === "ASSET_CREATED") return 1;
    if (right.action === "ASSET_CREATED") return -1;
    return new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime();
  });
  document.getElementById("history-count").textContent = `${orderedItems.length} sự kiện`;
  if (orderedItems.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Chưa có lịch sử bàn giao.";
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(
    ...orderedItems.map((item) => {
      const row = document.createElement("li");
      const head = document.createElement("div");
      head.className = "timeline-head";
      const title = document.createElement("h3");
      title.textContent = item.title || "Bàn giao tài sản";
      const time = document.createElement("time");
      time.textContent = formatDateTime(item.occurredAt);
      head.append(title, time);

      const detail = document.createElement("p");
      detail.textContent = item.summary || "";
      if (item.action === "ASSET_CREATED") {
        row.append(head, detail);
        return row;
      }

      const before = item.beforeData || {};
      const after = item.afterData || {};
      const route = document.createElement("div");
      route.className = "transfer-route";
      const from = document.createElement("div");
      from.className = "route-point";
      const fromLabel = document.createElement("span");
      fromLabel.textContent = "Từ";
      const fromValue = document.createElement("strong");
      fromValue.textContent = routeText(
        before.assignedEmployeeId,
        before.departmentId,
        before.siteId,
      );
      from.append(fromLabel, fromValue);
      const arrow = document.createElement("div");
      arrow.className = "route-arrow";
      arrow.textContent = "→";
      const to = document.createElement("div");
      to.className = "route-point";
      const toLabel = document.createElement("span");
      toLabel.textContent = "Đến";
      const toValue = document.createElement("strong");
      toValue.textContent = routeText(after.assignedEmployeeId, after.departmentId, after.siteId);
      to.append(toLabel, toValue);
      route.append(from, arrow, to);
      row.append(head, detail, route);
      return row;
    }),
  );
}

function renderAsset(asset) {
  document.title = `${asset.assetCode} | BIMLAB QLVT`;
  document.getElementById("asset-name").textContent = asset.name;
  document.getElementById("asset-code").textContent = asset.assetCode;
  document.getElementById("asset-serial").textContent = asset.serialNumber
    ? ` · Serial: ${asset.serialNumber}`
    : "";
  document.getElementById("asset-mark").textContent = asset.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const status = document.getElementById("asset-status");
  status.dataset.status = asset.status;
  status.textContent = statusLabels[asset.status] || asset.status;
  document.getElementById("updated-at").textContent = `Cập nhật ${formatDateTime(asset.updatedAt)}`;

  fillFacts("overview-facts", [
    [
      "Người đang giữ",
      asset.assignedEmployeeName || reference("Nhân sự", asset.assignedEmployeeId),
    ],
    ["Phòng ban", asset.departmentName || reference("Phòng ban", asset.departmentId)],
    ["Chi nhánh", asset.siteName || reference("Chi nhánh", asset.siteId)],
    [
      "Danh mục",
      [asset.categoryName, assetClassLabels[asset.assetClass]].filter(Boolean).join(" · "),
    ],
    ["Ngày bắt đầu sử dụng", formatDate(asset.useDate)],
    ["Trạng thái tài sản", statusLabels[asset.status] || asset.status],
  ]);
  fillFacts("identity-facts", [
    ["Mã danh mục", asset.categoryCode],
    ["Phân loại", assetClassLabels[asset.assetClass] || asset.assetClass],
    ["Số serial", asset.serialNumber],
    ["Dự án", reference("Dự án", asset.projectId)],
    ["Mô tả kỹ thuật", asset.technicalDescription],
    ["Mã tài sản", asset.assetCode],
  ]);
  fillFacts("purchase-facts", [
    ["Ngày mua", formatDate(asset.purchaseDate)],
    ["Nhà cung cấp", asset.vendorName],
    ["Nguyên giá", asset.originalCost == null ? "—" : moneyFormat.format(asset.originalCost)],
    ["Nguồn hình thành", asset.source],
  ]);
  fillFacts("warranty-facts", [
    ["Ngày hết hạn", formatDate(asset.warrantyUntil)],
    [
      "Tình trạng bảo hành",
      asset.warrantyUntil && new Date(`${asset.warrantyUntil}T23:59:59`) >= new Date()
        ? "Còn hiệu lực"
        : "Hết hiệu lực / chưa cập nhật",
    ],
  ]);
}

function storedAccessToken() {
  const storedUserKey = Object.keys(sessionStorage).find((key) => key.startsWith("oidc.user:"));
  try {
    const storedUser = storedUserKey ? sessionStorage.getItem(storedUserKey) : null;
    return JSON.parse(storedUser || "{}").access_token || "";
  } catch {
    return "";
  }
}

async function loadAsset() {
  const token = new URLSearchParams(location.search).get("token");
  if (!token) {
    throw new Error("Mã QR không hợp lệ.");
  }
  const apiBase = document.querySelector('meta[name="asset-api-base"]').content.replace(/\/$/, "");
  const accessToken = storedAccessToken();
  const headers = {
    Accept: "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  const [assetResponse, historyResponse] = await Promise.all([
    fetch(`${apiBase}/api/asset/qr/public/${encodeURIComponent(token)}`, {
      credentials: "omit",
      headers,
    }),
    fetch(`${apiBase}/api/asset/qr/public/${encodeURIComponent(token)}/transfer-history`, {
      credentials: "omit",
      headers,
    }),
  ]);
  if (
    assetResponse.status === 401 ||
    assetResponse.status === 403 ||
    historyResponse.status === 401 ||
    historyResponse.status === 403
  ) {
    const returnUrl = `${location.pathname}${location.search}${location.hash}`;
    sessionStorage.setItem("qlvt:oidc:return-url", returnUrl);
    // biome-ignore lint/suspicious/noDocumentCookie: QR login must support mobile browsers without Cookie Store API.
    document.cookie =
      `qlvt_oidc_return_url=${encodeURIComponent(returnUrl)}; Path=/; Max-Age=600; SameSite=Lax` +
      (location.protocol === "https:" ? "; Secure" : "");
    document.getElementById("login-link").href = `/login?returnTo=${encodeURIComponent(returnUrl)}`;
    const error = new Error("Bạn đang ở ngoài mạng nội bộ. Hãy đăng nhập QLVT để tiếp tục.");
    error.requiresLogin = true;
    throw error;
  }
  if (!assetResponse.ok) {
    throw new Error("Mã QR không hợp lệ, đã bị thu hồi hoặc tài sản không còn tồn tại.");
  }
  return {
    asset: await assetResponse.json(),
    history: historyResponse.ok ? await historyResponse.json() : null,
    authenticated: Boolean(accessToken),
  };
}

document.querySelectorAll("[data-panel]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const selected = tab.dataset.panel;
    document.querySelectorAll("[data-panel]").forEach((item) => {
      item.setAttribute("aria-selected", String(item === tab));
    });
    document.querySelectorAll("[data-panel-content]").forEach((panel) => {
      panel.hidden = panel.dataset.panelContent !== selected;
    });
  });
});

loadAsset()
  .then(({ asset, history, authenticated }) => {
    renderAsset(asset);
    renderHistory(history);
    document.getElementById("network-state").textContent = authenticated
      ? "Đã xác thực"
      : "Mạng nội bộ · Không cần đăng nhập";
    document.getElementById("asset-content").hidden = false;
  })
  .catch((error) => {
    document.getElementById("network-state").textContent = "Truy cập được bảo vệ";
    document.getElementById("error-title").textContent = error.requiresLogin
      ? "Cần đăng nhập"
      : "Không thể mở thông tin tài sản";
    document.getElementById("error-message").textContent = error.message;
    document.getElementById("login-link").hidden = !error.requiresLogin;
    document.getElementById("access-error").hidden = false;
  })
  .finally(() => {
    document.getElementById("loading").hidden = true;
  });
