import React from "react";
import { clsx } from "clsx";

interface FeatureLockProps {
  featureKey: string;
  size?: "sm" | "md" | "lg";
  userPlan?: "Basic" | "Professional" | "Enterprise";
  className?: string;
}

export function FeatureLock({
  featureKey,
  size = "md",
  userPlan = "Basic",
  className,
}: FeatureLockProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={clsx("flex items-center justify-center", className)}
      data-feature-key={featureKey}
      aria-label={`Feature ${featureKey} locked for ${userPlan} plan`}
    >
      <div
        className={clsx(
          "bg-gray-100 text-gray-400 rounded-full flex items-center justify-center",
          sizeClasses[size],
        )}
      >
        <svg className="w-3/4 h-3/4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
}
