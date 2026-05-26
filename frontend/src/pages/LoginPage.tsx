import { animate, createTimeline, stagger } from "animejs";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { FiLogIn, FiShield } from "react-icons/fi";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { user, bootstrapping, login, loginError, submitting } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loginSceneRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user || bootstrapping || !loginSceneRef.current) return;
    const root = loginSceneRef.current;
    const timeline = createTimeline({ defaults: { ease: "outExpo" } });
    timeline.add(
      root.querySelectorAll(".bim-shape"),
      { opacity: [0, 1], scale: [0.55, 1], duration: 700, delay: stagger(80, { from: "center" }) },
      0,
    );
    const loginCard = root.querySelector(".login-card");
    if (loginCard) {
      timeline.add(
        loginCard,
        { opacity: [0, 1], translateY: [28, 0], scale: [0.96, 1], duration: 560 },
        100,
      );
    }
    timeline.add(
      root.querySelectorAll(".login-field"),
      { opacity: [0, 1], translateX: [-14, 0], duration: 320, delay: stagger(70) },
      420,
    );
    animate(root.querySelectorAll(".bim-shape"), {
      translateY: [0, -8, 0],
      duration: 4200,
      loop: true,
      ease: "inOutSine",
      delay: stagger(520),
    });
  }, [user, bootstrapping]);

  if (bootstrapping) {
    return <div className="loading">Đang khởi tạo...</div>;
  }

  if (user) {
    const redirectTo = (location.state as LocationState | null)?.from?.pathname || "/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await login(username, password);
    if (ok) {
      const redirectTo = (location.state as LocationState | null)?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    }
  }

  return (
    <main className="login-shell">
      <section className="login-blueprint" ref={loginSceneRef}>
        <div className="blueprint-grid" />
        <div className="login-radial" />
        <svg className="bim-shape shape-cube" viewBox="0 0 80 80">
          <polygon
            points="40,5 75,22 75,58 40,75 5,58 5,22"
            fill="none"
            stroke="rgba(21,77,124,0.30)"
            strokeWidth="1.5"
          />
          <line x1="40" y1="5" x2="40" y2="75" stroke="rgba(21,77,124,0.18)" />
          <line x1="5" y1="22" x2="75" y2="58" stroke="rgba(21,77,124,0.18)" />
        </svg>
        <svg className="bim-shape shape-building" viewBox="0 0 100 120">
          <rect
            x="10"
            y="30"
            width="30"
            height="90"
            fill="none"
            stroke="rgba(21,77,124,0.24)"
            strokeWidth="1.5"
          />
          <rect
            x="50"
            y="10"
            width="40"
            height="110"
            fill="none"
            stroke="rgba(21,77,124,0.24)"
            strokeWidth="1.5"
          />
          {[40, 56, 72].map((y) => (
            <rect key={y} x="17" y={y} width="8" height="8" fill="rgba(21,77,124,0.13)" />
          ))}
          {[22, 38, 54].map((y) => (
            <rect key={y} x="62" y={y} width="8" height="8" fill="rgba(21,77,124,0.13)" />
          ))}
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
          <text x="60" y="14" textAnchor="middle" fill="rgba(42,123,196,0.55)" fontSize="8">
            QLVT
          </text>
        </svg>
        <div className="login-card">
          <div className="login-logo">
            <img src="https://bimlab.com.vn/assets/img/bimlab-logo.png" alt="BIMLab" />
          </div>
          <p className="login-subtitle">Quản lý vật tư · tài sản · subscription</p>
          <h1>Đăng nhập QLVT</h1>
          <form onSubmit={handleSubmit}>
            <label className="login-field">
              Tên đăng nhập
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="Nhập username HRM"
              />
            </label>
            <label className="login-field">
              Mật khẩu
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
              />
            </label>
            {loginError && <div className="alert login-field">{loginError}</div>}
            <button className="login-btn" disabled={submitting} type="submit">
              <FiLogIn /> Đăng nhập
            </button>
          </form>
          <div className="login-note">
            <FiShield />
            <span>Dùng chung tài khoản HRM, phân quyền theo role hiện tại.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
