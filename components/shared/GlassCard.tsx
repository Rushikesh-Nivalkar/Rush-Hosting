"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function GlassCard({
  children,
  className,
  hover = false,
  padding = "md",
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileHover={hover ? { scale: 1.005 } : undefined}
      className={cn(
        "rounded-[var(--radius-lg)]",
        "border border-[var(--glass-border)]",
        "bg-[var(--glass-bg)]",
        "shadow-[var(--shadow-card)]",
        "[backdrop-filter:blur(12px)]",
        hover && "cursor-pointer transition-colors hover:bg-[var(--bg-card-hover)]",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
