import * as React from "react";

interface FeatureAccessBadgeProps {
  label?: string;
  className?: string;
}

export const FeatureAccessBadge: React.FC<FeatureAccessBadgeProps> = ({
  label = "Feature",
  className = "",
}) => {
  return React.createElement(
    "span",
    {
      className: `inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 ${className}`,
    },
    label,
  );
};

type UpgradeVariant = "banner" | "inline" | "button";

interface UpgradeCTAProps {
  featureKey?: string;
  upgradeBenefit?: string;
  variant?: UpgradeVariant;
  className?: string;
  onClick?: () => void;
}

export const UpgradeCTA: React.FC<UpgradeCTAProps> = ({
  featureKey = "feature",
  upgradeBenefit = "Unlock more features by upgrading your plan.",
  variant = "inline",
  className = "",
  onClick,
}) => {
  const base =
    "rounded-md border border-gray-200 bg-white text-gray-700 cursor-pointer";
  const styles =
    variant === "banner"
      ? "p-4 flex items-center justify-between"
      : variant === "button"
        ? "px-3 py-1 inline-flex items-center"
        : "px-2 py-1 inline-flex items-center";

  return React.createElement(
    "div",
    { className: `${base} ${styles} ${className}`, onClick },
    `Upgrade required for ${featureKey}. ${upgradeBenefit}`,
  );
};

export { Button } from "./button";
export { Card } from "./card";
export { Code } from "./code";

// Swiss Theme Components
export { ThemeToggle } from "./components/ThemeToggle";
export { LanguageSwitcher } from "./components/LanguageSwitcher";
export { UploadModal } from "./components/UploadModal";
export { GatedContent } from "./components/GatedContent";
export {
  PreviewContent,
  GatedCard,
  GatedList,
} from "./components/PreviewContent";
export { FeatureLock } from "./components/FeatureLock";
export {
  AntivirusUploadStatus,
  useAntivirusUpload,
} from "./components/AntivirusUploadStatus";
export {
  Button as SwissButton,
  Card as SwissCard,
  Input,
  Select,
  Textarea,
  Badge,
  Status,
} from "./components/SwissComponents";

// Navigation Components

// Alert and Messaging Components

// Admin Components
export {
  AdminButton,
  AdminCard,
  AdminStatus,
  AdminBadge,
  AdminMetric,
  AdminAlert,
  AdminTable,
  AdminTableHeader,
  AdminTableBody,
  AdminTableRow,
  AdminTableCell,
  AdminTableHeaderCell,
} from "./components/AdminComponents";

// Admin Alert and Messaging Components

// Responsive Utilities
