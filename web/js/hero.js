// Paisaje del encabezado: cambia con la hora del día.

const THEMES = {
  manana: { greet: 'Buenos días', sky: '#DCE7DA', back: '#B4CAB6', mid: '#88A78F', trees: '#5E8068', date: '#41584A', title: '#1F2A23', stars: 0, moon: 0, sun: 1, sunY: 92, sunColor: '#F4D9A2', fog: 0.45, avatarBg: 'rgba(255,255,255,0.55)', avatarFg: '#1F2A23' },
  tarde: { greet: 'Buenas tardes', sky: '#4A6855', back: '#3B5645', mid: '#2E4637', trees: '#253B2E', date: '#DCE5DB', title: '#F4F6F0', stars: 0, moon: 0, sun: 1, sunY: 158, sunColor: '#EDB985', fog: 0.08, avatarBg: 'rgba(16,26,21,0.35)', avatarFg: '#EEF3EC' },
  noche: { greet: 'Buenas noches', sky: '#101A15', back: '#17251D', mid: '#1C2D23', trees: '#223629', date: '#A9B8AC', title: '#EEF3EC', stars: 1, moon: 1, sun: 0, sunY: 92, sunColor: '#E9DFC4', fog: 0, avatarBg: '#1C2B23', avatarFg: '#EEF3EC' },
};

export const theme = (m) => THEMES[m] || THEMES.noche;

export function heroSVG(m) {
  const h = theme(m);
  return `<svg viewBox="0 0 390 270" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="390" height="270" fill="${h.sky}"/>
    <g opacity="${h.stars}">
      <circle cx="40" cy="70" r="1.2" fill="#EEF3EC" opacity="0.5"/><circle cx="120" cy="40" r="1" fill="#EEF3EC" opacity="0.4"/>
      <circle cx="210" cy="90" r="1.3" fill="#EEF3EC" opacity="0.35"/><circle cx="250" cy="30" r="1" fill="#EEF3EC" opacity="0.5"/>
      <circle cx="360" cy="140" r="1.1" fill="#EEF3EC" opacity="0.35"/>
    </g>
    <g opacity="${h.moon}">
      <circle cx="300" cy="86" r="58" fill="#E9DFC4" opacity="0.05"/><circle cx="300" cy="86" r="40" fill="#E9DFC4" opacity="0.06"/>
      <circle cx="300" cy="86" r="24" fill="#E9DFC4" opacity="0.92"/><circle cx="311" cy="78" r="21" fill="${h.sky}"/>
    </g>
    <g opacity="${h.sun}">
      <circle cx="300" cy="${h.sunY}" r="62" fill="${h.sunColor}" opacity="0.16"/><circle cx="300" cy="${h.sunY}" r="42" fill="${h.sunColor}" opacity="0.24"/>
      <circle cx="300" cy="${h.sunY}" r="25" fill="${h.sunColor}"/>
    </g>
    <path d="M0 190 C 70 158, 130 160, 200 182 S 330 150, 390 168 V270 H0Z" fill="${h.back}"/>
    <path d="M0 204 C 90 192, 200 204, 390 194 V226 H0Z" fill="#F4F8F2" opacity="${h.fog}"/>
    <path d="M0 222 C 90 198, 160 212, 230 226 S 340 204, 390 216 V270 H0Z" fill="${h.mid}"/>
    <path d="M40 226 l12 -30 l12 30Z M58 228 l9 -22 l9 22Z M318 218 l11 -28 l11 28Z M336 220 l8 -20 l8 20Z" fill="${h.trees}"/>
    <path d="M0 252 C 110 236, 260 246, 390 234 V270 H0Z" fill="#101A15"/>
  </svg>`;
}
