export function CargoAircraft({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 320"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Wide-body cargo aircraft illustration"
      role="img"
    >
      <defs>
        <linearGradient id="ac-fuselage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#BDD0EA" />
          <stop offset="12%" stopColor="#EEF4FF" />
          <stop offset="50%" stopColor="#F6FAFF" />
          <stop offset="85%" stopColor="#DDE8F4" />
          <stop offset="100%" stopColor="#9AAECC" />
        </linearGradient>
        <linearGradient id="ac-wing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C8D8EC" />
          <stop offset="60%" stopColor="#B2C4DC" />
          <stop offset="100%" stopColor="#8098BC" />
        </linearGradient>
        <linearGradient id="ac-engine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B8C8E0" />
          <stop offset="38%" stopColor="#D8E4F4" />
          <stop offset="100%" stopColor="#7C90AC" />
        </linearGradient>
        <linearGradient id="ac-tail" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C8D8EE" />
          <stop offset="100%" stopColor="#9CB4D0" />
        </linearGradient>
        <radialGradient id="ac-inlet" cx="35%" cy="42%" r="70%">
          <stop offset="0%" stopColor="#5A6E88" />
          <stop offset="55%" stopColor="#344A62" />
          <stop offset="100%" stopColor="#1E2E42" />
        </radialGradient>
        <filter id="ac-drop" x="-6%" y="-35%" width="112%" height="170%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#08163A" floodOpacity="0.14" />
        </filter>
      </defs>

      <ellipse cx="450" cy="308" rx="320" ry="15" fill="rgba(8,22,58,0.055)" />

      <path d="M446 120 L420 100 L515 82 L558 116 Z" fill="url(#ac-wing)" opacity="0.48" />
      <path d="M442 191 L568 191 L348 275 L274 265 Z" fill="url(#ac-wing)" />
      <line x1="442" y1="191" x2="274" y2="265" stroke="rgba(215,230,248,0.7)" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M274 265 Q269 256 272 248 Q277 242 284 243 Q280 253 278 263 Z" fill="#C2D4E8" opacity="0.85" />

      <path d="M300 230 L296 258" stroke="#9CB0C8" strokeWidth="7" strokeLinecap="round" />
      <path d="M372 218 L368 244" stroke="#9CB0C8" strokeWidth="6" strokeLinecap="round" />

      <rect x="218" y="257" width="98" height="26" rx="13" fill="url(#ac-engine)" />
      <ellipse cx="219" cy="270" rx="13" ry="13" fill="url(#ac-inlet)" />
      <circle cx="219" cy="270" r="3.5" fill="#0E1C30" />
      <ellipse cx="316" cy="270" rx="9" ry="8.5" fill="#8A9CB8" />
      <ellipse cx="264" cy="260" rx="36" ry="4.5" fill="rgba(255,255,255,0.3)" />

      <rect x="328" y="244" width="88" height="24" rx="12" fill="url(#ac-engine)" />
      <ellipse cx="329" cy="256" rx="12" ry="12" fill="url(#ac-inlet)" />
      <circle cx="329" cy="256" r="3" fill="#0E1C30" />
      <ellipse cx="416" cy="256" rx="8.5" ry="8" fill="#8A9CB8" />
      <ellipse cx="370" cy="247" rx="30" ry="4" fill="rgba(255,255,255,0.27)" />

      <path
        d="M78 155 C82 131 114 118 158 118 L826 118 C846 118 862 133 865 155 C862 177 846 192 826 192 L158 192 C114 192 82 179 78 155 Z"
        fill="url(#ac-fuselage)"
        filter="url(#ac-drop)"
      />

      <path d="M804 118 L786 46 L814 43 L848 64 L856 118 Z" fill="url(#ac-tail)" />
      <line x1="806" y1="118" x2="790" y2="48" stroke="rgba(222,234,250,0.6)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M842 190 L820 186 L902 218 Q906 222 903 225 L899 224 Q895 220 888 216 L843 194 Z" fill="url(#ac-wing)" />
      <path d="M840 120 L818 124 L896 98 Q900 95 898 92 L895 92 Q890 95 883 98 L841 124 Z" fill="url(#ac-wing)" opacity="0.5" />

      <path d="M140 148 C118 148 96 148 82 153 C96 158 118 158 140 158 L858 158 L858 148 Z" fill="#1A5AFF" opacity="0.68" />
      <line x1="140" y1="148" x2="858" y2="148" stroke="rgba(255,255,255,0.24)" strokeWidth="0.8" />

      <path
        d="M103 148 Q107 130 122 122 L150 121 Q155 126 153 138 Q150 148 140 151 L111 151 Q104 149 103 148 Z"
        fill="rgba(110,180,255,0.52)"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.9"
      />
      <line x1="128" y1="121" x2="126" y2="151" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      <path
        d="M153 124 L172 122 Q177 127 175 137 Q173 146 167 149 L153 149 Q150 144 151 133 Z"
        fill="rgba(90,165,255,0.42)"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.8"
      />

      <rect x="185" y="127" width="96" height="52" rx="3" fill="none" stroke="rgba(155,180,220,0.3)" strokeWidth="1.2" strokeDasharray="5 4" />
      <line x1="185" y1="142" x2="281" y2="142" stroke="rgba(155,180,220,0.2)" strokeWidth="0.9" />
      <path d="M162 120 Q490 115 825 118" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="198" y="127" width="13" height="8" rx="3" fill="rgba(110,175,255,0.38)" />
      <rect x="220" y="127" width="13" height="8" rx="3" fill="rgba(110,175,255,0.33)" />
    </svg>
  );
}
