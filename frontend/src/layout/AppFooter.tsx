import { FiGlobe, FiMail, FiMapPin, FiUsers } from "react-icons/fi";

export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-brand">
        <strong>BIMLab QLVT</strong>
        <span>© 2026 Bản quyền thuộc về Công ty CP BIMLab Bách Khoa</span>
      </div>

      <address className="app-footer-contact">
        <span>
          <FiMapPin aria-hidden="true" />
          Một phần tầng 4, ResGreen Tower, 7A Thoại Ngọc Hầu, Phường Tân Phú, TP. Hồ Chí Minh
        </span>
        <a href="mailto:bimlab.hcmut@gmail.com">
          <FiMail aria-hidden="true" /> bimlab.hcmut@gmail.com
        </a>
        <a href="https://bimlab.com.vn" target="_blank" rel="noreferrer">
          <FiGlobe aria-hidden="true" /> bimlab.com.vn
        </a>
      </address>

      <div className="app-footer-team">
        <strong>
          <FiUsers aria-hidden="true" /> Đội ngũ phát triển
        </strong>
        <span>Lê Trọng Tín · Nguyễn Xuân Cường · Vũ Trọng Quang</span>
      </div>
    </footer>
  );
}
