"use client";

import { useEffect } from "react";
import "./toast.css";

export type ToastType = "success" | "info" | "warning";

type ToastProps = {
  message: string;
  type?: ToastType;
  onClose: () => void;
};

export default function Toast({
  message,
  type = "info",
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        {message}
      </div>
    </div>
  );
}