import React from "react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";

interface PreviewContentProps {
  content: string;
  maxLength?: number;
  showReadMore?: boolean;
  className?: string;
}

export function PreviewContent({
  content,
  maxLength = 100,
  showReadMore = true,
  className,
}: PreviewContentProps) {
  const { t } = useTranslation();

  const truncatedContent =
    content.length > maxLength
      ? content.substring(0, maxLength) + "..."
      : content;

  return (
    <div className={clsx("relative", className)}>
      <div className="text-text-default text-sm leading-relaxed">
        {truncatedContent}
      </div>

      {showReadMore && content.length > maxLength && (
        <div className="mt-2">
          <span className="text-accent text-sm font-medium">
            {t("gated.readMore", "Read more")} →
          </span>
        </div>
      )}
    </div>
  );
}

// Gated Card Component
interface GatedCardProps {
  title: string;
  description?: string;
  previewContent?: string;
  thumbnail?: string;
  locked: boolean;
  featureKey: string;
  upgradeBenefit: string;
  userPlan?: "Basic" | "Professional" | "Enterprise";
  className?: string;
  onUpgradeClick?: () => void;
  onClick?: () => void;
}

export function GatedCard({
  title,
  description,
  previewContent,
  thumbnail,
  locked,
  featureKey,
  upgradeBenefit,
  userPlan = "Basic",
  className,
  onUpgradeClick,
  onClick,
}: GatedCardProps) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (locked) {
      if (onUpgradeClick) {
        onUpgradeClick();
      }
    } else {
      if (onClick) {
        onClick();
      }
    }
  };

  return (
    <div
      className={clsx(
        "relative bg-surface-1 border border-border rounded-lg shadow-soft overflow-hidden transition-all duration-200",
        locked ? "cursor-pointer hover:shadow-float" : "hover:shadow-float",
        className,
      )}
      onClick={handleClick}
      data-feature-key={featureKey}
      aria-label={
        locked
          ? t(
              "gated.cardLockedForPlan",
              "Feature {{feature}} locked for {{plan}} plan",
              {
                feature: featureKey,
                plan: userPlan,
              },
            )
          : undefined
      }
    >
      {/* Thumbnail */}
      {thumbnail && (
        <div className="aspect-video bg-surface-2 overflow-hidden">
          <img
            src={thumbnail}
            alt={title}
            className={clsx(
              "w-full h-full object-cover transition-all duration-200",
              locked && "blur-sm opacity-60",
            )}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-text-strong font-semibold mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p
            className={clsx(
              "text-text-muted text-sm mb-3 line-clamp-2",
              locked && "blur-sm opacity-60",
            )}
          >
            {description}
          </p>
        )}

        {/* Preview Content */}
        {previewContent && locked && (
          <div className="mb-3">
            <PreviewContent
              content={previewContent}
              maxLength={80}
              showReadMore={false}
            />
          </div>
        )}

        {/* Lock indicator */}
        {locked && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-accent text-accent-contrast rounded-full p-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-text-muted text-xs">
                {t("gated.lockedContent", "Locked content")}
              </span>
            </div>
            <span className="text-accent text-xs font-medium">
              {t("gated.upgradeToAccess", "Upgrade to access")}
            </span>
          </div>
        )}
      </div>

      {/* Upgrade overlay for locked content */}
      {locked && (
        <div className="absolute inset-0 bg-gradient-to-t from-surface-1/90 to-transparent flex flex-col justify-end p-4">
          <p className="text-text-muted text-xs mb-2">{upgradeBenefit}</p>
          <p className="text-text-muted text-[0.65rem] mb-3">
            {t("gated.currentPlan", "Current plan: {{plan}}", {
              plan: userPlan,
            })}
          </p>
          <div className="w-full">
            <button className="w-full bg-accent text-accent-contrast rounded-md py-2 px-4 text-sm font-medium hover:opacity-90 transition-opacity">
              {t("gated.unlockFeature", "Unlock this feature")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Gated List Component
interface GatedListItem {
  id: string;
  title: string;
  description?: string;
  locked: boolean;
  featureKey: string;
  upgradeBenefit: string;
}

interface GatedListProps {
  items: GatedListItem[];
  userPlan?: "Basic" | "Professional" | "Enterprise";
  className?: string;
  onItemClick?: (item: GatedListItem) => void;
  onUpgradeClick?: (item: GatedListItem) => void;
}

export function GatedList({
  items,
  userPlan = "Basic",
  className,
  onItemClick,
  onUpgradeClick,
}: GatedListProps) {
  const { t } = useTranslation();

  return (
    <div className={clsx("space-y-3", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className={clsx(
            "flex items-center justify-between p-4 bg-surface-1 border border-border rounded-lg transition-all duration-200",
            item.locked
              ? "cursor-pointer hover:shadow-soft"
              : "hover:shadow-soft",
          )}
          onClick={() => {
            if (item.locked) {
              onUpgradeClick?.(item);
            } else {
              onItemClick?.(item);
            }
          }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h4 className="text-text-strong font-medium">{item.title}</h4>
              {item.locked && (
                <div className="bg-accent text-accent-contrast rounded-full p-1">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
            {item.description && (
              <p
                className={clsx(
                  "text-text-muted text-sm mt-1",
                  item.locked && "blur-sm opacity-60",
                )}
              >
                {item.description}
              </p>
            )}
          </div>

          <div className="ml-4 text-right">
            {item.locked ? (
              <>
                <button className="text-accent text-sm font-medium hover:text-accent/80 transition-colors">
                  {t("gated.upgradeToAccess", "Upgrade to access")}
                </button>
                <p className="text-text-muted text-[0.65rem] mt-1">
                  {t("gated.currentPlan", "Current plan: {{plan}}", {
                    plan: userPlan,
                  })}
                </p>
                <p className="text-text-muted text-[0.65rem]">
                  {item.upgradeBenefit}
                </p>
              </>
            ) : (
              <svg
                className="w-5 h-5 text-success"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
