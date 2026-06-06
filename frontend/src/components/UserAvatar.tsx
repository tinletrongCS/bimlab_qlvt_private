import { useEffect, useState } from "react";

const TONES = [
  "linear-gradient(135deg, #3b82f6, #0369a1)",
  "linear-gradient(135deg, #10b981, #0f766e)",
  "linear-gradient(135deg, #8b5cf6, #7e22ce)",
  "linear-gradient(135deg, #f59e0b, #c2410c)",
  "linear-gradient(135deg, #f43f5e, #be185d)",
  "linear-gradient(135deg, #06b6d4, #1d4ed8)",
];

const SIZE_CLASS = {
  sm: "avatar-sm",
  md: "avatar-md",
} as const;

type UserAvatarProps = {
  name?: string | null;
  seed?: string | number | null;
  size?: keyof typeof SIZE_CLASS;
  src?: string | null;
  alt?: string;
};

function getAvatarInitials(name?: string | null) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function toneIndex(seed?: string | number | null) {
  const value = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) % 9973;
  return Math.abs(hash) % TONES.length;
}

export function UserAvatar({ name, seed, size = "md", src, alt }: UserAvatarProps) {
  const key = seed ?? name ?? "";
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt={alt || name || ""}
        onError={() => setImageFailed(true)}
        className={`user-avatar ${SIZE_CLASS[size]}`}
      />
    );
  }

  return (
    <div
      className={`user-avatar ${SIZE_CLASS[size]}`}
      style={{ background: TONES[toneIndex(key)] }}
      aria-hidden="true"
    >
      {getAvatarInitials(name)}
    </div>
  );
}
