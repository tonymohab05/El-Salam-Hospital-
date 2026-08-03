import React from "react";

interface HospitalLogoProps {
  className?: string;
}

export default function HospitalLogo({ className = "w-10 h-10" }: HospitalLogoProps) {
  return (
    <div className={`shrink-0 aspect-square flex items-center justify-center ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full shrink-0"
      >
        <defs>
          {/* Inner Light Blue Background */}
          <linearGradient id="hospLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d2f2fe" />
            <stop offset="100%" stopColor="#aae1fa" />
          </linearGradient>

          {/* Green Ring Outer Border */}
          <linearGradient id="hospLogoRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="50%" stopColor="#84cc16" />
            <stop offset="100%" stopColor="#65a30d" />
          </linearGradient>

          {/* Leaf Green Gradient */}
          <linearGradient id="hospLogoLeaf" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e840d" />
            <stop offset="60%" stopColor="#41b814" />
            <stop offset="100%" stopColor="#7ee330" />
          </linearGradient>
        </defs>

        {/* Outer Dark Green Fine Line */}
        <circle cx="50" cy="50" r="48" fill="none" stroke="#365314" strokeWidth="0.8" />

        {/* Glossy Green Outer Ring */}
        <circle cx="50" cy="50" r="44.5" fill="none" stroke="url(#hospLogoRing)" strokeWidth="5" />

        {/* Light Sky-Blue Center Disk */}
        <circle cx="50" cy="50" r="42" fill="url(#hospLogoBg)" />

        {/* Deep Blue Crescent Moon */}
        <path
          d="M 61 18 C 42 18, 24 32, 24 50 C 24 68, 42 82, 61 82 C 46 79, 35 67, 35 50 C 35 33, 46 21, 61 18 Z"
          fill="#0c2393"
        />

        {/* Bold Red Medical Cross inside Crescent Opening */}
        <path
          d="M 59 38 H 67 V 45 H 74 V 53 H 67 V 60 H 59 V 53 H 52 V 45 H 59 Z"
          fill="#e61a1a"
        />

        {/* Bottom-Left Green Leaf Overlay */}
        <g>
          {/* Leaf Body */}
          <path
            d="M 7 62 C 8 82, 26 85, 36 81 C 34 74, 31 63, 19 54 C 13 50, 8 54, 7 62 Z"
            fill="url(#hospLogoLeaf)"
            stroke="#166534"
            strokeWidth="1"
          />
          {/* Main White Vein */}
          <path
            d="M 8 64 C 15 66, 23 71, 36 81"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M 8 64 C 15 66, 23 71, 36 81"
            fill="none"
            stroke="#14532d"
            strokeWidth="0.8"
            strokeLinecap="round"
          />

          {/* Water Drops */}
          <circle cx="14" cy="77" r="2" fill="#ffffff" opacity="0.9" />
          <circle cx="14" cy="77" r="1.3" fill="#86efac" opacity="0.4" />
          <circle cx="13.5" cy="76.5" r="0.5" fill="#ffffff" />

          <circle cx="21" cy="80" r="1.6" fill="#ffffff" opacity="0.9" />
          <circle cx="21" cy="80" r="1.1" fill="#86efac" opacity="0.4" />
          <circle cx="20.6" cy="79.6" r="0.4" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}

