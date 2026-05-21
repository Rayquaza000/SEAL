// MIT License
// Simple SVG Trash/Delete Icon for React
export default function TrashIcon({ size = 18, color = '#e57373', style = {}, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      {...props}
    >
      <path
        d="M6 7V15C6 15.5523 6.44772 16 7 16H13C13.5523 16 14 15.5523 14 15V7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 5H16"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 5V4C8 3.44772 8.44772 3 9 3H11C11.5523 3 12 3.44772 12 4V5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
