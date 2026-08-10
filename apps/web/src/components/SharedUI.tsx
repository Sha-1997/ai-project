import React from "react";

// ==============================================================================
// 1. Sleek Design Tokens (Curated HSL)
// ==============================================================================
export const DesignTokens = {
  colors: {
    primary: "hsl(222.2, 84%, 4.9%)",       // Slate Core
    secondary: "hsl(210, 40%, 96.1%)",      // Soft Gray Accent
    accent: "hsl(142.1, 70.6%, 45.3%)",     // Emerald Green (Verified/Active)
    destructive: "hsl(0, 84.2%, 60.2%)",    // Crimson Red
    border: "hsl(214.3, 31.8%, 91.4%)",
    textPrimary: "hsl(222.2, 84%, 4.9%)",
    textSecondary: "hsl(215.4, 16.3%, 46.9%)",
    background: "#ffffff",
  }
};

// ==============================================================================
// 2. DOMAIN-AGNOSTIC BUTTON COMPONENT
// ==============================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-[hsl(222.2,84%,4.9%)] text-white hover:bg-opacity-90 focus:ring-[hsl(222.2,84%,4.9%)]",
    secondary: "bg-[hsl(210,40%,96.1%)] text-[hsl(222.2,84%,4.9%)] hover:bg-opacity-80 focus:ring-gray-300",
    destructive: "bg-[hsl(0,84.2%,60.2%)] text-white hover:bg-opacity-90 focus:ring-[hsl(0,84.2%,60.2%)]",
    outline: "border border-[hsl(214.3,31.8%,91.4%)] text-[hsl(222.2,84%,4.9%)] hover:bg-gray-50 focus:ring-gray-300"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ==============================================================================
// 3. CARD COMPONENT SYSTEM
// ==============================================================================
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div className={`bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white rounded-xl border border-[hsl(214.3,31.8%,91.4%)] shadow-sm overflow-hidden ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div className={`p-6 border-b border-[hsl(214.3,31.8%,91.4%)] ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ children, className = "", ...props }) => (
  <h3 className={`text-lg font-bold text-[hsl(222.2,84%,4.9%)] tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => (
  <div className={`p-6 border-t border-[hsl(214.3,31.8%,91.4%)] bg-gray-50 bg-opacity-50 ${className}`} {...props}>
    {children}
  </div>
);

// ==============================================================================
// 4. FORMS & INPUT COMPONENTS
// ==============================================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = "", ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold ">{label}</label>}
    <input
      className={`px-3 py-2 border rounded-lg text-sm  border-[hsl(214.3,31.8%,91.4%)] focus:outline-none focus:ring-2 focus:ring-[hsl(222.2,84%,4.9%)] focus:border-transparent transition-all ${className}`}
      {...props}
    />
    {error && <span className="text-xs text-[hsl(0,84.2%,60.2%)]">{error}</span>}
  </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({ label, options, error, className = "", ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-semibold ]">{label}</label>}
    <select
    className={`px-3 py-2 border rounded-lg text-sm bg-slate-950 text-white border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${className}`}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <span className="text-xs text-[hsl(0,84.2%,60.2%)]">{error}</span>}
  </div>
);

// ==============================================================================
// 5. DATA TABLES SYSTEM
// ==============================================================================
export const Table: React.FC<React.HTMLAttributes<HTMLTableElement>> = ({ children, className = "", ...props }) => (
  <div className="w-full overflow-x-auto border border-[hsl(214.3,31.8%,91.4%)] rounded-lg">
    <table className={`w-full text-left border-collapse text-sm ${className}`} {...props}>
      {children}
    </table>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, ...props }) => (
  <thead className="bg-gray-50 border-b border-[hsl(214.3,31.8%,91.4%)] text-[hsl(215.4,16.3%,46.9%)] font-medium" {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, ...props }) => (
  <tbody className="divide-y divide-[hsl(214.3,31.8%,91.4%)] bg-white" {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className = "", ...props }) => (
  <tr className={`hover:bg-gray-50 transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ children, className = "", ...props }) => (
  <td className={`p-4 text-[hsl(222.2,84%,4.9%)] align-middle ${className}`} {...props}>
    {children}
  </td>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ children, className = "", ...props }) => (
  <th className={`p-4 font-semibold text-[hsl(222.2,84%,4.9%)] align-middle ${className}`} {...props}>
    {children}
  </th>
);

// ==============================================================================
// 6. STATES & DIALOGS
// ==============================================================================
export const EmptyState: React.FC<{ title: string; desc: string; icon?: string }> = ({
  title,
  desc,
  icon = "🔍"
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl border-[hsl(214.3,31.8%,91.4%)] bg-opacity-40">
    <span className="text-4xl mb-4">{icon}</span>
    <h4 className="text-base font-bold text-[hsl(222.2,84%,4.9%)] mb-1">{title}</h4>
    <p className="text-sm text-[hsl(215.4,16.3%,46.9%)] max-w-sm">{desc}</p>
  </div>
);

export const LoadingState: React.FC<{ label?: string }> = ({ label = "Loading details..." }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center w-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(222.2,84%,4.9%)] mb-4"></div>
    <span className="text-sm text-[hsl(215.4,16.3%,46.9%)]">{label}</span>
  </div>
);

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl max-w-lg w-full border shadow-lg overflow-hidden animate-slide-up">
        <div className="flex justify-between items-center p-6 border-b border-[hsl(214.3,31.8%,91.4%)]">
          <h3 className="text-lg font-bold text-[hsl(222.2,84%,4.9%)]">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ❌
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  );
};

// ==============================================================================
// 7. TOAST NOTIFICATIONS & PAGINATION
// ==============================================================================
interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = "success", onClose }) => {
  const backgrounds = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800"
  };

  React.useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 p-4 border rounded-xl shadow-md ${backgrounds[type]} animate-slide-up`}>
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="text-xs hover:opacity-75">
        ✕
      </button>
    </div>
  );
};

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ◀ Previous
      </Button>
      <span className="text-xs font-semibold text-gray-500">
        Page {currentPage} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next ▶
      </Button>
    </div>
  );
};
