import React from "react";

interface HospitalLogoProps {
  className?: string;
}

export default function HospitalLogo({ className = "w-10 h-10" }: HospitalLogoProps) {
  return (
    <div className={className}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          {/* Blue background gradient */}
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d5f2ff" />
            <stop offset="100%" stopColor="#aaddff" />
          </linearGradient>
          {/* Outer ring gradient */}
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="50%" stopColor="#d4fc79" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>
          {/* Leaf gradient */}
          <linearGradient id="leafGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2ca82c" />
            <stop offset="60%" stopColor="#66d13d" />
            <stop offset="100%" stopColor="#a3f26d" />
          </linearGradient>
          {/* Drop shadow for high-end look */}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0.5" dy="1" stdDeviation="1" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Outer dark-green thin border */}
        <circle cx="50" cy="50" r="48" fill="none" stroke="#5da314" strokeWidth="0.8" />
        
        {/* The main outer ring with glossy green gradient */}
        <circle cx="50" cy="50" r="45.5" fill="none" stroke="url(#ringGrad)" strokeWidth="4.5" />
        
        {/* Inside soft light-blue background */}
        <circle cx="50" cy="50" r="43.5" fill="url(#bgGrad)" />
        
        {/* Glass reflection effect */}
        <path d="M 12 36 A 38 38 0 0 1 88 36" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />

        {/* Deep Blue Crescent Moon aligned with crescent shapes */}
        <path 
          d="M 60 19 
             C 41 19, 23 33, 23 51 
             C 23 69, 41 83, 60 83 
             C 45 80, 34 68, 34 51 
             C 34 34, 45 22, 60 19 Z" 
          fill="#0c2393" 
          filter="url(#shadow)"
        />

        {/* Symmetrical Red Medical Cross inside the opening */}
        <path 
          d="M 59 38 H 66 V 45 H 73 V 51 H 66 V 58 H 59 V 51 H 52 V 45 H 59 Z" 
          fill="#e61a1a" 
          filter="url(#shadow)"
        />

        {/* Leaf at the bottom-left */}
        <g transform="translate(1, -1)">
          {/* Leaf Drop Shadow */}
          <path 
            d="M 7 66 C 8 84, 25 87, 35 83 C 33 76, 31 66, 19 57 C 13 53, 8 57, 7 66 Z" 
            fill="#153603" 
            opacity="0.15" 
          />
          {/* Leaf Body */}
          <path 
            d="M 7 64 C 8 82, 25 85, 35 81 C 33 74, 31 64, 19 55 C 13 51, 8 55, 7 64 Z" 
            fill="url(#leafGrad)" 
            stroke="#27700e" 
            strokeWidth="1.2" 
          />
          {/* Central White/Green Vein */}
          <path 
            d="M 8 66 C 15 68, 23 73, 35 81" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="1.5" 
            opacity="0.7"
            strokeLinecap="round"
          />
          <path 
            d="M 8 66 C 15 68, 23 73, 35 81" 
            fill="none" 
            stroke="#1b5a03" 
            strokeWidth="0.8" 
            strokeLinecap="round"
          />
          
          {/* Side Veins */}
          <path d="M 17 70 Q 20 65, 23 62" fill="none" stroke="#1b5a03" strokeWidth="0.8" opacity="0.6" />
          <path d="M 22 74 Q 26 69, 30 67" fill="none" stroke="#1b5a03" strokeWidth="0.8" opacity="0.6" />
          
          <path d="M 13 75 Q 12 80, 10 82" fill="none" stroke="#1b5a03" strokeWidth="0.8" opacity="0.6" />
          <path d="M 19 79 Q 18 83, 17 84" fill="none" stroke="#1b5a03" strokeWidth="0.8" opacity="0.6" />

          {/* Water drops at bottom-left corner of leaf */}
          <circle cx="14" cy="79" r="2" fill="#ffffff" opacity="0.8" />
          <circle cx="14" cy="79" r="1.5" fill="#a3f26d" opacity="0.3" />
          <circle cx="13.5" cy="78.5" r="0.5" fill="#ffffff" />

          <circle cx="20" cy="81" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="20" cy="81" r="1.1" fill="#a3f26d" opacity="0.3" />
          <circle cx="19.6" cy="80.6" r="0.4" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}

