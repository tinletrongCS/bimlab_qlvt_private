import { animate, createTimeline, stagger } from "animejs";
import { useEffect, useRef } from "react";
import { FiLogIn, FiShield } from "react-icons/fi";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface LocationState {
  from?: { pathname?: string };
}

function BlueprintGrid() {
  return (
    <svg className="login-blueprint-grid" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="qlvtSmallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(21,77,124,0.08)" strokeWidth="0.5" />
        </pattern>
        <pattern id="qlvtGrid" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#qlvtSmallGrid)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(21,77,124,0.15)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#qlvtGrid)" />
    </svg>
  );
}

function FloatingShapes() {
  return (
    <div className="login-shapes" aria-hidden="true">
      <svg className="bim-shape shape-cube" viewBox="0 0 80 80">
        <polygon
          points="40,5 75,22 75,58 40,75 5,58 5,22"
          fill="none"
          stroke="rgba(21,77,124,0.30)"
          strokeWidth="1.5"
        />
        <line x1="40" y1="5" x2="40" y2="75" stroke="rgba(21,77,124,0.18)" />
        <line x1="5" y1="22" x2="75" y2="58" stroke="rgba(21,77,124,0.18)" />
        <line x1="75" y1="22" x2="5" y2="58" stroke="rgba(21,77,124,0.18)" />
      </svg>
      <svg className="bim-shape shape-building" viewBox="0 0 100 120">
        <rect
          x="10"
          y="30"
          width="30"
          height="90"
          fill="none"
          stroke="rgba(21,77,124,0.25)"
          strokeWidth="1.5"
        />
        <rect
          x="50"
          y="10"
          width="40"
          height="110"
          fill="none"
          stroke="rgba(21,77,124,0.25)"
          strokeWidth="1.5"
        />
        {[40, 55, 70].map((y) => (
          <rect key={`left-${y}`} x="16" y={y} width="8" height="8" fill="rgba(21,77,124,0.15)" />
        ))}
        {[20, 35, 50].map((y) => (
          <rect key={`right-${y}`} x="58" y={y} width="8" height="8" fill="rgba(21,77,124,0.15)" />
        ))}
        {[20, 35, 50].map((y) => (
          <rect
            key={`right-b-${y}`}
            x="74"
            y={y}
            width="8"
            height="8"
            fill="rgba(21,77,124,0.15)"
          />
        ))}
      </svg>
      <svg className="bim-shape shape-truss" viewBox="0 0 90 60">
        <polygon
          points="45,5 85,55 5,55"
          fill="none"
          stroke="rgba(21,77,124,0.25)"
          strokeWidth="1.5"
        />
        <line x1="45" y1="5" x2="45" y2="55" stroke="rgba(21,77,124,0.14)" />
        <line x1="25" y1="30" x2="65" y2="30" stroke="rgba(21,77,124,0.14)" />
      </svg>
      <svg className="bim-shape shape-dimension" viewBox="0 0 120 40">
        <line
          x1="5"
          y1="20"
          x2="115"
          y2="20"
          stroke="rgba(42,123,196,0.35)"
          strokeDasharray="4 3"
        />
        <line x1="5" y1="10" x2="5" y2="30" stroke="rgba(42,123,196,0.35)" />
        <line x1="115" y1="10" x2="115" y2="30" stroke="rgba(42,123,196,0.35)" />
        <text
          x="60"
          y="14"
          textAnchor="middle"
          fill="rgba(42,123,196,0.55)"
          fontSize="8"
          fontFamily="monospace"
        >
          QLVT
        </text>
      </svg>
    </div>
  );
}

export function LoginPage() {
  // Keycloak-only: đăng nhập qua SSO (Authorization Code + PKCE) — không còn form username/password.
  const { user, bootstrapping, login, loginError, submitting } = useAuth();
  const location = useLocation();
  const loginSceneRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  const redirectTo = (location.state as LocationState | null)?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (user || bootstrapping || hasAnimated.current || !loginSceneRef.current) return;
    hasAnimated.current = true;
    const root = loginSceneRef.current;
    const timeline = createTimeline({ defaults: { ease: "outExpo" } });

    timeline.add(
      root.querySelectorAll(".bim-shape"),
      { opacity: [0, 1], scale: [0.55, 1], duration: 700, delay: stagger(80, { from: "center" }) },
      0,
    );
    const scanLine = root.querySelector(".scan-line");
    if (scanLine) {
      timeline.add(
        scanLine,
        { top: ["0%", "100%"], opacity: [0.8, 0], duration: 800, ease: "inOutSine" },
        0,
      );
    }
    const loginCard = root.querySelector(".login-card");
    if (loginCard) {
      timeline.add(
        loginCard,
        { opacity: [0, 1], translateY: [30, 0], scale: [0.96, 1], duration: 550 },
        100,
      );
    }
    const loginLogo = root.querySelector(".login-logo");
    if (loginLogo) {
      timeline.add(loginLogo, { opacity: [0, 1], translateY: [-10, 0], duration: 350 }, 250);
    }
    const loginSubtitle = root.querySelector(".login-subtitle");
    if (loginSubtitle) {
      timeline.add(loginSubtitle, { opacity: [0, 1], translateY: [8, 0], duration: 300 }, 380);
    }
    timeline.add(
      root.querySelectorAll(".login-field"),
      { opacity: [0, 1], translateX: [-15, 0], duration: 300, delay: stagger(70) },
      440,
    );
    const loginButton = root.querySelector(".login-btn");
    if (loginButton) {
      timeline.add(loginButton, { opacity: [0, 1], scale: [0.9, 1], duration: 250 }, 650);
    }

    animate(root.querySelectorAll(".bim-shape"), {
      translateY: [0, -8, 0],
      duration: 4000,
      loop: true,
      ease: "inOutSine",
      delay: stagger(600),
    });
  }, [user, bootstrapping]);

  if (bootstrapping) {
    return <div className="loading">Đang khởi tạo...</div>;
  }

  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <main className="login-shell">
      <section className="login-blueprint" ref={loginSceneRef}>
        <BlueprintGrid />
        <div className="login-radial" />
        <FloatingShapes />
        <div className="scan-line">
          <div />
        </div>

        <div className="login-card">
          <span className="corner corner-tl" />
          <span className="corner corner-tr" />
          <span className="corner corner-bl" />
          <span className="corner corner-br" />

          <div className="login-logo">
            <img src="https://bimlab.com.vn/assets/img/bimlab-logo.png" alt="BIMLab" />
          </div>
          <p className="login-subtitle">HỆ THỐNG QUẢN LÝ TÀI SẢN</p>

          {/* Keycloak (SSO): redirect sang trang login Keycloak (Authorization Code + PKCE). */}
          <div className="login-keycloak">
            {loginError && <div className="alert login-field">{loginError}</div>}
            <button
              className="login-btn login-field"
              disabled={submitting}
              type="button"
              onClick={() => login()}
            >
              <FiLogIn /> Đăng nhập bằng SSO (Keycloak)
            </button>
          </div>
          <div className="login-note">
            <FiShield />
            <span>Dùng chung tài khoản HRM, phân quyền theo role hiện tại.</span>
          </div>

          <div className="login-footer-line">
            <span />
            <small>BIMlab © 2026</small>
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}
