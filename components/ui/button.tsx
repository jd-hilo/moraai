"use client";

import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps {
  variant?: ButtonVariant;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "none",
  },
  secondary: {
    backgroundColor: "#fff",
    color: "#1a1a1a",
    border: "1px solid rgba(0,0,0,0.08)",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "#1a1a1a",
    border: "none",
  },
};

export function Button({
  variant = "primary",
  className,
  onClick,
  disabled = false,
  children,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        ...variantStyles[variant],
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: "40px",
        padding: "0 20px",
        borderRadius: "20px",
        fontSize: "14px",
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "opacity 0.2s, background-color 0.2s",
        outline: "none",
      }}
    >
      {children}
    </button>
  );
}
