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
  FiZoomIn,
} from "react-icons/fi";
import { NavLink } from "react-router-dom";

export interface GuideStepItem {
  text: string;
  image?: string;
  imageCaption?: string;
}

export interface GuideTabItem {
  id: string;
  title: string;
  description: string;
  steps: Array<string | GuideStepItem>;
  details?: string[];
}

export interface GuideItem {
  id: string;
  title: string;
  icon?: ReactNode;
  description: string;
  steps: Array<string | GuideStepItem>;
  tabs?: GuideTabItem[];
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
        id: "asset-import-danhmuc",
        title: "Import Excel danh sách danh mục",
        description:
          "Nhập nhiều danh mục từ file Excel theo mẫu hệ thống với 4 bước trực quan bên dưới.",
        steps: [
          {
            text: "Bước 1: Vào mục 'Tài sản > Danh mục' và bấm nút 'Nhập danh mục' trên thanh công cụ chính.",
            image: "/guide/image-Category/image-dm-1.png",
            imageCaption: "Màn hình Danh mục tài sản: Vị trí nút 'Nhập danh mục'",
          },
          {
            text: "Bước 2: Trong hộp thoại 'Tải danh mục tài sản', bấm 'Chọn file Excel' và chọn tệp Excel dữ liệu danh mục.",
            image: "/guide/image-Category/image-dm-2.png",
            imageCaption: "Hộp thoại nhập danh mục: Thao tác chọn file Excel từ máy tính",
          },
          {
            text: "Bước 3: Bấm nút 'Kiểm tra dữ liệu' để hệ thống bắt đầu thẩm định tệp Excel danh mục.",
            image: "/guide/image-Category/image-dm-3.png",
            imageCaption: "Kiểm tra dữ liệu: Vị trí nút 'Kiểm tra dữ liệu'",
          },
          {
            text: "Bước 4: Xem kết quả kiểm tra dữ liệu theo các trạng thái Hợp lệ, Lỗi và Cảnh báo.",
            image: "/guide/image-Category/image-dm-4.png",
            imageCaption: "Xem lại kết quả kiểm tra dữ liệu.",
          },
          {
            text: "Bước 5: Chuyển sang tab 'Phân cấp cha con' (Tree view) để xem trực quan cấu trúc phân cấp danh mục trước khi bấm 'Xác nhận nhập'.",
            image: "/guide/image-Category/image-dm-5.jpg",
            imageCaption:
              "Tab Phân cấp cha con: Xem cấu trúc cây danh mục và bấm 'Xác nhận nhập'. Các dòng hợp lệ sẽ được nhập, các dòng lỗi sẽ bị loại bỏ.",
          },
        ],
        details: [
          "File Excel cần có sheet tên 'DanhMuc_ThamChieu' giống file mẫu danh mục.",
          "Chế độ nhập dữ liệu mặc định là 'Chỉ nhập những dòng hợp lệ' - hệ thống sẽ loại bỏ các dòng bị lỗi và cho phép nhập phần còn lại.",
          "Bạn có thể kiểm tra phần lỗi/cảnh báo trên từng dòng trước khi xác nhận nhập danh mục.",
        ],
        links: [{ to: "/asset-categories", label: "Mở danh mục tài sản" }],
      },
      {
        id: "asset-import-taisan",
        title: "Import Excel danh sách tài sản",
        description:
          "Nhập nhiều tài sản từ file Excel theo mẫu hệ thống với 4 bước trực quan bên dưới.",
        steps: [
          {
            text: "Bước 1: Vào mục 'Tài sản > Danh sách' và bấm nút 'Nhập tài sản' trên thanh công cụ chính.",
            image: "/guide/image-asset/image-asset-1.jpg",
            imageCaption: "Màn hình Danh sách tài sản: Vị trí nút 'Nhập tài sản'",
          },
          {
            text: "Bước 2: Trong hộp thoại 'Tải danh sách tài sản', bấm 'Chọn file Excel' và chọn tệp Excel dữ liệu (ví dụ: import_main.xlsx).",
            image: "/guide/image-asset/image-asset-2.jpg",
            imageCaption: "Hộp thoại nhập file: Thao tác chọn file Excel từ máy tính",
          },
          {
            text: "Bước 3: Bấm nút 'Kiểm tra dữ liệu' ở góc dưới bên phải để hệ thống bắt đầu thẩm định tệp Excel.",
            image: "/guide/image-asset/image-asset-3.jpg",
            imageCaption: "Kiểm tra dữ liệu: Vị trí nút 'Kiểm tra dữ liệu'",
          },
          {
            text: "Bước 4: Xem kết quả phân tích (dòng Hợp lệ, Lỗi, Cảnh báo) ở chế độ Bảng và bấm nút 'Import' để hoàn tất nhập các dòng hợp lệ.",
            image: "/guide/image-asset/image-asset-4.jpg",
            imageCaption: "Xem lại kết quả kiểm tra dữ liệu và nhấn nút 'Import'",
          },
        ],
        details: [
          "File mẫu Excel cần có sheet tên 'HoSoTaiSan_import' hoặc theo định dạng mẫu tải về từ hệ thống.",
          "Chế độ nhập dữ liệu mặc định là 'Chỉ nhập những dòng hợp lệ' - hệ thống sẽ loại bỏ các dòng bị lỗi và cho phép nhập phần còn lại.",
          "Bạn có thể tải kết quả kiểm tra dạng CSV để xem chi tiết các lỗi trên từng dòng nếu có.",
        ],
        links: [{ to: "/assets", label: "Mở danh sách tài sản" }],
      },
      {
        id: "asset-bulk",
        title: "Thao tác hàng loạt",
        description: "Chọn nhiều tài sản để cập nhật trạng thái hoặc in mã QR theo nhóm.",
        steps: [
          {
            text: "Bước 1: Ở màn hình Tài sản > Danh sách, bấm 'Chọn nhiều' phía trên bảng để bật chế độ chọn hàng loạt.",
            image: "/guide/image-batch/image-batch-1.png",
            imageCaption: "Vị trí nút 'Chọn nhiều' trên danh sách tài sản.",
          },
          {
            text: "Bước 2: Tick checkbox ở các dòng tài sản cần xử lý. Có thể tick từng dòng hoặc dùng checkbox ở đầu bảng để chọn nhanh nhiều tài sản.",
            image: "/guide/image-batch/image-batch-2.png",
            imageCaption: "Chọn các tài sản cần thao tác hàng loạt.",
          },
          {
            text: "Bước 3: Kiểm tra danh sách tài sản đã chọn ở khu vực thao tác bên dưới, sau đó mở ô 'Chọn thao tác' để chọn 'Cập nhật trạng thái' hoặc 'In QR theo nhóm'.",
            image: "/guide/image-batch/image-batch-3.png",
            imageCaption: "Khu vực thao tác hàng loạt và các tùy chọn xử lý.",
          },
          {
            text: "Bước 3.1: Nếu chọn 'Cập nhật trạng thái', chọn trạng thái mới cho toàn bộ tài sản đã chọn rồi bấm 'Lưu trạng thái'.",
            image: "/guide/image-batch/image-batch-4.png",
            imageCaption: "Cập nhật cùng một trạng thái cho nhiều tài sản.",
          },
          {
            text: "Bước 3.2: Nếu chọn 'In QR theo nhóm', hệ thống mở màn hình in mã QR cho toàn bộ tài sản đã chọn. Chọn máy in hoặc lưu PDF rồi bấm 'Lưu'.",
            image: "/guide/image-batch/image-batch-5.png",
            imageCaption: "Màn hình in hoặc lưu PDF mã QR theo nhóm tài sản.",
          },
        ],
        details: [
          "Chỉ những tài sản đang được tick mới được đưa vào thao tác hàng loạt.",
          "Có thể bấm 'Bỏ chọn' để thoát chế độ chọn nhiều hoặc dùng dấu x trên từng tài sản trong vùng đã chọn để loại khỏi danh sách xử lý.",
          "Trước khi lưu trạng thái hoặc in QR theo nhóm, nên kiểm tra lại số lượng và danh sách tài sản đã chọn.",
        ],
        links: [{ to: "/assets", label: "Mở danh sách tài sản" }],
      },
      {
        id: "asset-qr",
        title: "Xem QR/Barcode",
        description: "Mở mã QR của từng tài sản từ menu thao tác trên dòng danh sách.",
        steps: [
          {
            text: "Bước 1: Ở bảng danh sách tài sản, bấm nút ba chấm ở cột 'Thao tác' của tài sản cần xem, sau đó chọn 'Xem QR'.",
            image: "/guide/image-qr/image-qr-1.png",
            imageCaption: "Mở menu thao tác của từng tài sản và chọn 'Xem QR'.",
          },
          {
            text: "Bước 2: Kiểm tra mã QR trong hộp thoại. Có thể bấm 'In QR' để in mã QR của tài sản này hoặc bấm 'Đóng' để quay lại danh sách.",
            image: "/guide/image-qr/image-qr-2.png",
            imageCaption: "Hộp thoại mã QR tài sản và nút 'In QR'.",
          },
        ],
        details: [
          "Mỗi mã QR gắn với một tài sản cụ thể, kèm mã tài sản và tên tài sản để dễ đối chiếu.",
          "Khi in QR đơn lẻ, hãy kiểm tra đúng tài sản trước khi gửi lệnh in hoặc lưu thành PDF.",
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
        description: "Xem, tìm kiếm và chọn danh mục tài sản trên sơ đồ phân cấp cha con.",
        steps: [
          {
            text: "Cách xem tổng quan: Vào menu 'Tài sản > Danh mục' để mở sơ đồ phân cấp. Các danh mục được hiển thị thành từng node theo quan hệ cha con, giúp nhìn nhanh cấu trúc nhóm tài sản.",
            image: "/guide/image-Category/image-cate-dia-1.png",
            imageCaption: "Màn hình Danh mục tài sản và sơ đồ phân cấp các nhóm danh mục.",
          },
          {
            text: "Cách xem chi tiết: Dùng ô 'Tìm danh mục' để tìm theo tên, mã hoặc mô tả. Khi chọn một node trên sơ đồ, thông tin danh mục sẽ hiện ở khung cập nhật bên phải để xem.",
            image: "/guide/image-Category/image-cate-dia-2.png",
            imageCaption: "Tìm kiếm danh mục, chọn node trên sơ đồ và xem thông tin ở khung cập nhật.",
          },
        ],
        details: [
          "Có thể lọc thêm theo 'Loại danh mục' và 'Trạng thái' để thu hẹp sơ đồ đang xem.",
          "Node đang chọn sẽ được tô nổi bật, giúp đối chiếu nhanh với thông tin ở khung cập nhật bên phải.",
          "Dùng nút 'Làm mới' khi cần tải lại sơ đồ sau khi thêm, sửa hoặc xóa danh mục.",
        ],
        links: [{ to: "/asset-categories", label: "Mở danh mục tài sản" }],
      },
      {
        id: "category-crud",
        title: "Thêm/sửa/xóa danh mục",
        description: "Cập nhật thông tin danh mục và tạo danh mục con.",
        steps: [],
        tabs: [
          {
            id: "category-add",
            title: "Thêm",
            description: "Tạo danh mục mới hoặc tạo danh mục con dưới một danh mục đang chọn.",
            steps: [
              {
                text: "Bước 1: Chọn danh mục cha trên sơ đồ, sau đó bấm 'Thêm con' ở khung cập nhật bên phải nếu muốn tạo danh mục con.",
                image: "/guide/image-Category/image-cate-add-2.png",
                imageCaption: "Chọn node cha và bấm 'Thêm con' để tạo danh mục con.",
              },
              {
                text: "Bước 2: Nhập tên danh mục, mã danh mục, nhóm cha, loại tài sản, mô tả và trạng thái sử dụng trong form thêm danh mục.",
                image: "/guide/image-Category/image-cate-add-1.png",
                imageCaption: "Form thêm danh mục và các trường thông tin cần nhập.",
              },
              {
                text: "Bước 3:Sau khi nhập đủ thông tin, bấm 'Tạo danh mục'. Danh mục mới sẽ xuất hiện trên sơ đồ phân cấp theo đúng nhóm cha đã chọn.",
                image: "/guide/image-Category/image-cate-add-3.png",
                imageCaption: "Tạo danh mục thành công và kiểm tra node mới trên sơ đồ.",
              },
            ],
            details: [
              "Mã danh mục nên ngắn gọn, không trùng với danh mục đã có.",
              "Nếu tạo danh mục con, hệ thống sẽ cố định nhóm cha theo node đã chọn để tránh đặt sai cấp.",
            ],
          },
          {
            id: "category-edit",
            title: "Sửa",
            description: "Chỉnh sửa thông tin của danh mục đang chọn trên sơ đồ phân cấp.",
            steps: [
              {
                text: "Chọn danh mục cần sửa trên sơ đồ. Khung 'Cập nhật danh mục' bên phải sẽ hiển thị các trường: tên danh mục, mã danh mục, nhóm cha, loại tài sản, mô tả và trạng thái sử dụng.",
                image: "/guide/image-Category/image-cate-edit1.png",
                imageCaption: "Các trường thông tin có thể kiểm tra và chỉnh sửa trong danh mục.",
              },
              "Cập nhật các thông tin cần thay đổi, sau đó bấm 'Lưu' để ghi nhận.",
            ],
            details: [
              "Nên kiểm tra kỹ nhóm cha và loại tài sản trước khi lưu vì các trường này ảnh hưởng đến vị trí danh mục trong sơ đồ.",
              "Nếu chỉ muốn xem thông tin, chọn node trên sơ đồ và không cần bấm lưu.",
            ],
          },
          {
            id: "category-delete",
            title: "Xóa",
            description: "Xóa danh mục không còn sử dụng khi danh mục đủ điều kiện xóa.",
            steps: [
              {
                text: "Bước 1: Chọn danh mục cần xóa, sau đó bấm biểu tượng thùng rác trên node hoặc nút 'Xóa' trong khung cập nhật bên phải.",
                image: "/guide/image-Category/image-cate-dele-1.png",
                imageCaption: "Vị trí thao tác xóa danh mục trên sơ đồ và trong khung cập nhật.",
              },
              {
                text: "Bước 2: Nếu hệ thống báo 'Không xóa được danh mục', danh mục có thể đang có danh mục con hoặc dữ liệu tài sản tham chiếu. Cần xử lý dữ liệu liên quan trước khi xóa lại.",
                image: "/guide/image-Category/image-cate-dele-err.png",
                imageCaption: "Thông báo khi danh mục chưa đủ điều kiện để xóa.",
              },
            ],
            details: [
              "Chỉ xóa danh mục khi chắc chắn không còn sử dụng trong dữ liệu tài sản.",
              "Nếu danh mục còn con, hãy chuyển hoặc xóa các danh mục con trước.",
            ],
          },
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
  const stepTexts = item.steps.map((step) =>
    typeof step === "string" ? step : `${step.text} ${step.imageCaption || ""}`,
  );
  const tabTexts =
    item.tabs?.flatMap((tab) => [
      tab.title,
      tab.description,
      ...tab.steps.map((step) =>
        typeof step === "string" ? step : `${step.text} ${step.imageCaption || ""}`,
      ),
      ...(tab.details || []),
    ]) || [];
  return [item.title, item.description, ...stepTexts, ...tabTexts, ...(item.details || [])].some((value) =>
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
  const [lightboxImg, setLightboxImg] = useState<{ src: string; caption?: string } | null>(null);
  const [selectedGuideTabId, setSelectedGuideTabId] = useState<string | null>(null);
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
  const activeGuideTabs = activeGuide.tabs || [];
  const activeGuideTab =
    activeGuideTabs.find((tab) => tab.id === selectedGuideTabId) || activeGuideTabs[0];
  const activeDetails = activeGuide.details || [
    "Đọc mô tả nghiệp vụ trước, sau đó thao tác theo thứ tự các bước bên dưới để tránh chọn sai màn hình hoặc sai dữ liệu.",
    "Nếu một nút hoặc API phụ thuộc phân quyền, hãy kiểm tra lại vai trò đăng nhập và quyền tương ứng trước khi kết luận là lỗi hệ thống.",
    "Sau khi cập nhật dữ liệu, ưu tiên làm mới đúng khu vực nghiệp vụ thay vì reload toàn trang để giữ lại bộ lọc và ngữ cảnh đang thao tác.",
  ];
  const renderGuideSteps = (steps: Array<string | GuideStepItem>) => (
    <ol className="help-step-list">
      {steps.map((step, idx) => {
        const isObj = typeof step !== "string";
        const stepText = isObj ? step.text : step;
        const stepImage = isObj ? step.image : undefined;
        const stepCaption = isObj ? step.imageCaption : undefined;

        return (
          <li key={idx} className="help-step-item">
            <div className="help-step-text">{stepText}</div>
            {stepImage && (
              <div className="help-step-image-wrap">
                <div
                  className="help-step-image-box"
                  onClick={() => setLightboxImg({ src: stepImage, caption: stepCaption })}
                  title="Click để phóng to ảnh"
                >
                  <img src={stepImage} alt={stepCaption || stepText} />
                  <div className="help-step-image-overlay">
                    <FiZoomIn /> Phóng to hình ảnh
                  </div>
                </div>
                {stepCaption && <span className="help-step-caption">{stepCaption}</span>}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );

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
          <div className={`help-detail-head${activeGuideTab ? " help-detail-head-with-tabs" : ""}`}>
            {activeGuideTab ? (
              <div className="help-guide-tab-list help-guide-tab-list-hero" role="tablist">
                {activeGuideTabs.map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    role="tab"
                    aria-selected={activeGuideTab.id === tab.id}
                    className={activeGuideTab.id === tab.id ? "active" : ""}
                    onClick={() => setSelectedGuideTabId(tab.id)}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            ) : (
              <>
                {activeGuide.icon}
                <div>
                  <h2>{activeGuide.title}</h2>
                  <p>{activeGuide.description}</p>
                </div>
              </>
            )}
          </div>

          {activeGuideTab ? (
            <section className="help-guide-tabs" aria-label={`Hướng dẫn ${activeGuide.title}`}>
              <div className="help-guide-tab-panel" role="tabpanel">
                <h3>Hướng dẫn {activeGuideTab.title.toLowerCase()} danh mục</h3>
                <p>{activeGuideTab.description}</p>
                {renderGuideSteps(activeGuideTab.steps)}
                {activeGuideTab.details && (
                  <ul className="help-guide-tab-notes">
                    {activeGuideTab.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : (
            renderGuideSteps(activeGuide.steps)
          )}

          {!activeGuideTab && (
            <section className="help-detail-section">
              <h3>Chi tiết cần lưu ý</h3>
              <ul>
                {activeDetails.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </section>
          )}

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

      {lightboxImg && (
        <div className="modal-backdrop help-lightbox-backdrop" onClick={() => setLightboxImg(null)}>
          <div className="help-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="icon-button help-lightbox-close"
              onClick={() => setLightboxImg(null)}
              aria-label="Đóng phóng to ảnh"
            >
              <FiX />
            </button>
            <img src={lightboxImg.src} alt={lightboxImg.caption || "Hình hướng dẫn"} />
            {lightboxImg.caption && <p className="help-lightbox-caption">{lightboxImg.caption}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
