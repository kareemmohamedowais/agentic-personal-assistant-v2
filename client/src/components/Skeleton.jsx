import React from "react";

/**
 * Professional Skeleton loader component
 * Uses the CSS skeleton-pulse animation defined in index.css
 */
export default function Skeleton({ className = "", width, height, borderRadius, style }) {
  return (
    <div 
      className={`skeleton ${className}`} 
      style={{ 
        width: width || "100%", 
        height: height || "1rem", 
        borderRadius: borderRadius || "8px",
        ...style 
      }} 
    />
  );
}
