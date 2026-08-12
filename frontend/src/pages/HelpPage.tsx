import { type ReactNode, useMemo, useState } from "react";
import {
  FiArchive,
  FiBookOpen,
  FiBox,
  FiBriefcase,
  FiCalendar,
  FiGrid,
  FiRepeat,
  FiSearch,
  FiTool,
  FiX,
} from "react-icons/fi";
import { NavLink } from "react-router-dom";

interface GuideItem {
  id: string;
  title: string;
  icon?: ReactNode;
  description: string;
  steps: string[];
  details?: string[];
  links?: Array<{ to: string; label: string }>;
  children?: GuideItem[];
}

const GUIDE_TREE: GuideItem[] = [
  {
    id: "overview",
    title: "Tổng quan hệ thống",
    icon: <FiBookOpen />,
    description: "Trang Tổng quan dùng để điều hướng nhanh tới các nghiệp vụ chính.",
    steps: [
      "Dùng các shortcut để mở nhanh danh sách tài sản, danh mục, đặt lịch, bàn giao hoặc bảo trì.",
      "Theo dõi nhanh lịch phòng họp gần nhất nếu dữ liệu booking đã được tải.",
    ],
    links: [{ to: "/dashboard", label: "Mở Tổng quan" }],
  },
  {
    id: "assets",
    title: "Tài sản",
    icon: <FiBox />,
    description: "Nhóm hướng dẫn cho trang Tài sản > Danh sách.",
    steps: ["Chọn một mục con ở cây hướng dẫn để xem thao tác cụ thể."],
    children: [
      {
        id: "asset-list",
        title: "Quản lý danh sách tài sản",
        description: "Theo dõi tài sản theo danh mục, trạng thái, giá trị và thông tin sử dụng.",
        steps: [
          "Chọn danh mục ở sidebar trái để lọc danh sách.",
          "Dùng ô tìm kiếm để tìm theo mã, tên, serial hoặc nhà cung cấp.",
          "Bấm Xem trên từng dòng để mở chi tiết và cập nhật nếu có quyền.",
        ],
        links: [{ to: "/assets", label: "Mở danh sách tài sản" }],
      },
      {
        id: "asset-import",
        title: "Import Excel danh sách tài sản",
        description: "Nhập nhiều tài sản từ file Excel theo mẫu hệ thống.",
        steps: [
          "Vào Tài sản > Danh sách, bấm Tải mẫu Excel để lấy file mẫu.",
          "Điền dữ liệu theo đúng cột và mã tham chiếu trong file.",
          "Tải file lên, bấm Kiểm tra dữ liệu, sau đó mới import các dòng hợp lệ.",
        ],
        links: [{ to: "/assets", label: "Mở danh sách tài sản" }],
      },
      {
        id: "asset-bulk",
        title: "Thao tác hàng loạt",
        description: "Thao tác với nhiều tài sản đã tick trong bảng.",
        steps: [
          "Bật chế độ Chọn nhiều nếu checkbox chưa hiển thị.",
          "Tick các tài sản cần xử lý.",
          "Chọn thao tác ở Action Bar phía dưới bảng và kiểm tra lại danh sách trước khi lưu.",
        ],
        links: [{ to: "/assets", label: "Mở danh sách tài sản" }],
      },
      {
        id: "asset-qr",
        title: "Xem QR/Barcode",
        description: "Mở khung xem QR/Barcode của từng tài sản từ dòng danh sách.",
        steps: [
          "Ở bảng tài sản, dùng thao tác QR trên dòng tương ứng.",
          "Tính năng sinh/in QR chi tiết còn phụ thuộc phần backend và quy trình sau này.",
        ],
        links: [{ to: "/assets", label: "Mở danh sách tài sản" }],
      },
    ],
  },
  {
    id: "categories",
    title: "Danh mục tài sản",
    icon: <FiGrid />,
    description: "Quản lý cây phân cấp danh mục và thông tin từng danh mục.",
    steps: ["Chọn mục con để xem hướng dẫn theo luồng đang có."],
    children: [
      {
        id: "category-tree",
        title: "Sơ đồ phân cấp",
        description: "Xem cây danh mục tài sản theo cấu trúc cha con.",
        steps: [
          "Mở Tài sản > Danh mục để xem sơ đồ phân cấp.",
          "Bấm vào node để chọn danh mục và xem thông tin ở khu vực chỉnh sửa.",
          "Dùng tìm kiếm để tự bung nhánh có kết quả phù hợp.",
        ],
        links: [{ to: "/asset-categories", label: "Mở danh mục tài sản" }],
      },
      {
        id: "category-crud",
        title: "Thêm/sửa/xóa danh mục",
        description: "Cập nhật thông tin danh mục và tạo danh mục con.",
        steps: [
          "Chọn một danh mục trong cây hoặc danh sách chi tiết.",
          "Bấm Thêm con để tạo danh mục dưới node đang chọn.",
          "Chỉ xóa khi danh mục không còn con và không còn dữ liệu tham chiếu.",
        ],
        links: [{ to: "/asset-categories", label: "Mở danh mục tài sản" }],
      },
    ],
  },
  {
    id: "booking",
    title: "Đặt lịch phòng họp",
    icon: <FiCalendar />,
    description: "Tạo và theo dõi các phiên booking phòng họp.",
    steps: ["Chọn mục con để xem hướng dẫn theo từng thao tác."],
    children: [
      {
        id: "booking-create",
        title: "Tạo lịch đặt phòng",
        description: "Tạo phiên đặt phòng họp từ form bên trái trang Đặt lịch.",
        steps: [
          "Chọn phòng họp, thời gian bắt đầu/kết thúc và nhập mục đích.",
          "Bấm Kiểm tra lịch trước khi xác nhận.",
          "Bấm Xác nhận đặt phòng nếu dữ liệu hợp lệ.",
        ],
        links: [{ to: "/booking", label: "Mở đặt lịch" }],
      },
      {
        id: "booking-check",
        title: "Kiểm tra trùng lịch",
        description: "Kiểm tra khả dụng của phòng họp trước khi tạo booking.",
        steps: [
          "Chọn phòng và khoảng thời gian cần đặt.",
          "Bấm Kiểm tra lịch để hệ thống trả về trạng thái khả dụng hoặc xung đột.",
        ],
        links: [{ to: "/booking", label: "Mở đặt lịch" }],
      },
      {
        id: "booking-actions",
        title: "Nhận phòng/trả phòng",
        description: "Các thao tác nhận, trả hoặc hủy phòng đã có nút trên bảng lịch đặt.",
        steps: [
          "Mở Danh sách lịch đặt.",
          "Chọn thao tác Nhận phòng, Trả phòng hoặc Hủy trên dòng booking phù hợp.",
          "Một số API có thể còn phụ thuộc backend hoàn thiện ở bước sau.",
        ],
        links: [{ to: "/booking", label: "Mở đặt lịch" }],
      },
    ],
  },
  {
    id: "transfers",
    title: "Bàn giao tài sản",
    icon: <FiRepeat />,
    description: "Theo dõi các nghiệp vụ bàn giao và điều chuyển tài sản đã có màn hình riêng.",
    steps: ["Vào Tài sản > Bàn giao để xem hoặc xử lý theo quyền được cấp."],
    links: [{ to: "/transfers", label: "Mở bàn giao" }],
  },
  {
    id: "maintenance",
    title: "Bảo trì tài sản",
    icon: <FiTool />,
    description: "Theo dõi các bản ghi bảo trì/sửa chữa tài sản.",
    steps: ["Vào Tài sản > Bảo trì để xem danh sách và cập nhật thông tin theo quyền."],
    links: [{ to: "/maintenance", label: "Mở bảo trì" }],
  },
  {
    id: "references",
    title: "Nhà cung cấp / Hợp đồng",
    icon: <FiBriefcase />,
    description: "Quản lý dữ liệu tham chiếu phục vụ mua sắm và hợp đồng.",
    steps: ["Mở từng màn hình Nhà cung cấp hoặc Hợp đồng để tra cứu/cập nhật dữ liệu hiện có."],
    links: [
      { to: "/vendors", label: "Nhà cung cấp" },
      { to: "/contracts", label: "Hợp đồng" },
    ],
  },
];

function flattenGuides(items: GuideItem[]): GuideItem[] {
  return items.flatMap((item) => [item, ...flattenGuides(item.children || [])]);
}

function normalizeGuideText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function guideMatches(item: GuideItem, query: string) {
  if (!query) return true;
  return [item.title, item.description, ...item.steps, ...(item.details || [])].some((value) =>
    normalizeGuideText(value).includes(query),
  );
}

function filterGuideTree(items: GuideItem[], query: string): GuideItem[] {
  if (!query) return items;
  return items.flatMap((item): GuideItem[] => {
    const children = filterGuideTree(item.children || [], query);
    if (guideMatches(item, query) || children.length > 0) {
      return [{ ...item, children: children.length > 0 ? children : item.children }];
    }
    return [];
  });
}

export function HelpPage() {
  const allGuides = useMemo(() => flattenGuides(GUIDE_TREE), []);
  const [activeId, setActiveId] = useState("overview");
  const [guideSearch, setGuideSearch] = useState("");
  const normalizedGuideSearch = normalizeGuideText(guideSearch.trim());
  const visibleGuideTree = useMemo(
    () => filterGuideTree(GUIDE_TREE, normalizedGuideSearch),
    [normalizedGuideSearch],
  );
  const visibleGuideCount = useMemo(
    () => flattenGuides(visibleGuideTree).length,
    [visibleGuideTree],
  );
  const activeGuide = allGuides.find((item) => item.id === activeId) || allGuides[0];
  const activeDetails = activeGuide.details || [
    "Đọc mô tả nghiệp vụ trước, sau đó thao tác theo thứ tự các bước bên dưới để tránh chọn sai màn hình hoặc sai dữ liệu.",
    "Nếu một nút hoặc API phụ thuộc phân quyền, hãy kiểm tra lại vai trò đăng nhập và quyền tương ứng trước khi kết luận là lỗi hệ thống.",
    "Sau khi cập nhật dữ liệu, ưu tiên làm mới đúng khu vực nghiệp vụ thay vì reload toàn trang để giữ lại bộ lọc và ngữ cảnh đang thao tác.",
  ];

  return (
    <section className="help-page page-grid">
      <div className="panel help-hero">
        <div>
          <h1>Hướng dẫn sử dụng</h1>
        </div>
        <FiArchive />
      </div>

      <div className="help-layout">
        <aside className="panel help-nav">
          <strong>Danh mục hướng dẫn</strong>
          <label className="help-search">
            <FiSearch />
            <input
              value={guideSearch}
              onChange={(event) => setGuideSearch(event.target.value)}
              placeholder="Tìm hướng dẫn..."
            />
            {guideSearch && (
              <button type="button" onClick={() => setGuideSearch("")} aria-label="Xóa tìm kiếm">
                <FiX />
              </button>
            )}
          </label>
          {guideSearch && (
            <span className="help-search-count">{visibleGuideCount} kết quả phù hợp</span>
          )}
          <div className="help-nav-tree">
            {visibleGuideTree.length === 0 && (
              <div className="empty-state">Không tìm thấy hướng dẫn phù hợp.</div>
            )}
            {visibleGuideTree.map((item) => (
              <div className="help-nav-group" key={item.id}>
                <button
                  type="button"
                  className={activeId === item.id ? "active" : ""}
                  onClick={() => setActiveId(item.id)}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </button>
                {item.children && (
                  <div className="help-nav-children">
                    {item.children.map((child) => (
                      <button
                        type="button"
                        key={child.id}
                        className={activeId === child.id ? "active" : ""}
                        onClick={() => setActiveId(child.id)}
                      >
                        <span>{child.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        <article className="panel help-detail">
          <div className="help-detail-head">
            {activeGuide.icon}
            <div>
              <h2>{activeGuide.title}</h2>
              <p>{activeGuide.description}</p>
            </div>
          </div>
          <ol>
            {activeGuide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <section className="help-detail-section">
            <h3>Chi tiết cần lưu ý</h3>
            <ul>
              {activeDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </section>
          {activeGuide.children && activeGuide.children.length > 0 && (
            <section className="help-detail-section">
              <h3>Các mục con liên quan</h3>
              <div className="help-related-list">
                {activeGuide.children.map((child) => (
                  <button type="button" key={child.id} onClick={() => setActiveId(child.id)}>
                    {child.title}
                  </button>
                ))}
              </div>
            </section>
          )}
          {activeGuide.links && (
            <div className="help-links">
              {activeGuide.links.map((link) => (
                <NavLink key={link.to} to={link.to}>
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
