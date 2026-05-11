import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ToastContext = createContext(null);

let nextId = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, { type = "info", duration = 4000 } = {}) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => remove(id), duration);
      }
      return id;
    },
    [remove]
  );

  const value = {
    show,
    success: (msg, opts) => show(msg, { ...opts, type: "success" }),
    error: (msg, opts) => show(msg, { ...opts, type: "error" }),
    info: (msg, opts) => show(msg, { ...opts, type: "info" }),
    remove,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ toast, onClose }) => {
  useEffect(() => {
    // Pause/resume on hover would go here if we wanted that polish.
  }, []);

  return (
    <div className={`toast toast-${toast.type}`}>
      <span>{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};