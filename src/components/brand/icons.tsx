import { memo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Navigation icons.
 *
 * Drawn as SVG paths rather than pulled from an icon font: the app already depends on
 * `react-native-svg`, and a font would add a second asset to load before the tab bar
 * could paint. Every icon shares one 24-unit grid and one stroke weight so they read as
 * a set rather than four separate drawings.
 */

export type IconProps = {
  size?: number;
  color: string;
  /** Thickens the stroke on the active tab, which reads as weight rather than colour. */
  active?: boolean;
};

function base(size: number, active?: boolean) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    strokeWidth: active ? 2.2 : 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}

/** Today. A roof over a door — where you live day to day. */
export const HomeIcon = memo(function HomeIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path d="M3.5 10.2 12 3.5l8.5 6.7V20a1 1 0 0 1-1 1h-4.6v-5.6H9.1V21H4.5a1 1 0 0 1-1-1z" stroke={color} strokeWidth={props.strokeWidth} strokeLinecap={props.strokeLinecap} strokeLinejoin={props.strokeLinejoin} />
    </Svg>
  );
});

/** Invest. A line going up and to the right — the only shape that means growth. */
export const InvestIcon = memo(function InvestIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path d="M3.5 17.5 9 12l3.6 3.6L20.5 7.5" stroke={color} strokeWidth={props.strokeWidth} strokeLinecap={props.strokeLinecap} strokeLinejoin={props.strokeLinejoin} />
      <Path d="M15.4 7.5h5.1v5.1" stroke={color} strokeWidth={props.strokeWidth} strokeLinecap={props.strokeLinecap} strokeLinejoin={props.strokeLinejoin} />
    </Svg>
  );
});

/** Borrow. A wallet: cash you can reach without selling what is inside. */
export const BorrowIcon = memo(function BorrowIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path
        d="M3.5 8.2a2.2 2.2 0 0 1 2.2-2.2h11.1a2.2 2.2 0 0 1 2.2 2.2v8.6a2.2 2.2 0 0 1-2.2 2.2H5.7a2.2 2.2 0 0 1-2.2-2.2z"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap={props.strokeLinecap}
        strokeLinejoin={props.strokeLinejoin}
      />
      <Path d="M19 10.4h1.9v4.2H19" stroke={color} strokeWidth={props.strokeWidth} strokeLinecap={props.strokeLinecap} strokeLinejoin={props.strokeLinejoin} />
      <Circle cx={16} cy={12.5} r={1} fill={color} />
    </Svg>
  );
});

/** Streak. A flame — the only shape that already means "don't let this go out". */
export const StreakIcon = memo(function StreakIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path
        d="M12 2.8c3.5 3.2 5.7 6.4 5.7 9.9a5.7 5.7 0 1 1-11.4 0c0-1.7.5-3.2 1.5-4.5.2 1.6 1 2.5 2.1 2.7-.3-3 .6-5.7 2.1-8.1z"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap={props.strokeLinecap}
        strokeLinejoin={props.strokeLinejoin}
      />
    </Svg>
  );
});

/** Story. A speech bubble — the chapter where your future self does the talking. */
export const StoryIcon = memo(function StoryIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path
        d="M4 6.2a2.2 2.2 0 0 1 2.2-2.2h11.6A2.2 2.2 0 0 1 20 6.2v7.6a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 13.8z"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap={props.strokeLinecap}
        strokeLinejoin={props.strokeLinejoin}
      />
      <Path d="M8.6 16v4.2l4.6-4.2" stroke={color} strokeWidth={props.strokeWidth} strokeLinecap={props.strokeLinecap} strokeLinejoin={props.strokeLinejoin} />
    </Svg>
  );
});

/** A question mark in a ring. The universal "explain this". */
export const HelpIcon = memo(function HelpIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Circle cx={12} cy={12} r={8.6} stroke={color} strokeWidth={props.strokeWidth} />
      <Path
        d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.5"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap={props.strokeLinecap}
        strokeLinejoin={props.strokeLinejoin}
      />
      <Circle cx={12} cy={16.4} r={1} fill={color} />
    </Svg>
  );
});

/** Sign out. A door with an arrow leaving it. */
export const LogoutIcon = memo(function LogoutIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  const stroke = {
    stroke: color,
    strokeWidth: props.strokeWidth,
    strokeLinecap: props.strokeLinecap,
    strokeLinejoin: props.strokeLinejoin,
  };
  return (
    <Svg {...props}>
      <Path d="M14.4 4.4H6.2a1 1 0 0 0-1 1v13.2a1 1 0 0 0 1 1h8.2" {...stroke} />
      <Path d="M18.8 12H10" {...stroke} />
      <Path d="m15.6 8.8 3.2 3.2-3.2 3.2" {...stroke} />
    </Svg>
  );
});

/** Save to device. An arrow falling into a tray. */
export const DownloadIcon = memo(function DownloadIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  const stroke = {
    stroke: color,
    strokeWidth: props.strokeWidth,
    strokeLinecap: props.strokeLinecap,
    strokeLinejoin: props.strokeLinejoin,
  };
  return (
    <Svg {...props}>
      <Path d="M12 3.6v11.2" {...stroke} />
      <Path d="m7.6 10.6 4.4 4.4 4.4-4.4" {...stroke} />
      <Path d="M4.4 18.4v1a1 1 0 0 0 1 1h13.2a1 1 0 0 0 1-1v-1" {...stroke} />
    </Svg>
  );
});

/** Instagram, as a monochrome glyph rather than the trademarked gradient. */
export const InstagramIcon = memo(function InstagramIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path
        d="M7.4 3.6h9.2a3.8 3.8 0 0 1 3.8 3.8v9.2a3.8 3.8 0 0 1-3.8 3.8H7.4a3.8 3.8 0 0 1-3.8-3.8V7.4a3.8 3.8 0 0 1 3.8-3.8z"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinejoin={props.strokeLinejoin}
      />
      <Circle cx={12} cy={12} r={3.7} stroke={color} strokeWidth={props.strokeWidth} />
      <Circle cx={17.1} cy={6.9} r={1.1} fill={color} />
    </Svg>
  );
});

/** WhatsApp — where an Indian referral actually travels. */
export const WhatsAppIcon = memo(function WhatsAppIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path
        d="M3.8 20.2 5 16.5a8.2 8.2 0 1 1 3.1 3z"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinejoin={props.strokeLinejoin}
      />
      <Path
        d="M9.2 8.6c-.5 1.2.2 2.6 1.1 3.5.9.9 2.3 1.6 3.5 1.1l.9-1.4 1.6.9c-.3 1.1-1.4 1.7-2.5 1.5-2.6-.4-5.2-3-5.6-5.6-.2-1.1.4-2.2 1.5-2.5l.9 1.6z"
        fill={color}
      />
    </Svg>
  );
});

/** Everything else — hands over to the OS share sheet. */
export const MoreIcon = memo(function MoreIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={5.6} cy={12} r={1.7} fill={color} />
      <Circle cx={12} cy={12} r={1.7} fill={color} />
      <Circle cx={18.4} cy={12} r={1.7} fill={color} />
    </Svg>
  );
});

/** A trophy. Reserved for the streak, which is the only thing here you can win. */
export const TrophyIcon = memo(function TrophyIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  const stroke = {
    stroke: color,
    strokeWidth: props.strokeWidth,
    strokeLinecap: props.strokeLinecap,
    strokeLinejoin: props.strokeLinejoin,
  };
  return (
    <Svg {...props}>
      <Path d="M7.2 4h9.6v5.2a4.8 4.8 0 0 1-9.6 0z" {...stroke} />
      <Path d="M7.2 5.6H4.4v1.6a3.2 3.2 0 0 0 3.2 3.2" {...stroke} />
      <Path d="M16.8 5.6h2.8v1.6a3.2 3.2 0 0 1-3.2 3.2" {...stroke} />
      <Path d="M12 14v3.2M8.4 20.4h7.2l-.8-3.2H9.2z" {...stroke} />
    </Svg>
  );
});

/** A shield. The safety net you can reach without selling anything. */
export const ShieldIcon = memo(function ShieldIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path
        d="M12 3.2 19.2 6v5.6c0 4.2-2.9 7.6-7.2 9.2-4.3-1.6-7.2-5-7.2-9.2V6z"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap={props.strokeLinecap}
        strokeLinejoin={props.strokeLinejoin}
      />
    </Svg>
  );
});

/** A disclosure chevron. Rotates to point down when its row is open. */
export const ChevronIcon = memo(function ChevronIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path
        d="m9.5 5 7 7-7 7"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap={props.strokeLinecap}
        strokeLinejoin={props.strokeLinejoin}
      />
    </Svg>
  );
});

/** A wrapped gift. Ribbon crossing the lid is what makes it read at 28pt. */
export const GiftIcon = memo(function GiftIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  const stroke = {
    stroke: color,
    strokeWidth: props.strokeWidth,
    strokeLinecap: props.strokeLinecap,
    strokeLinejoin: props.strokeLinejoin,
  };
  return (
    <Svg {...props}>
      <Path d="M3.6 8.8h16.8v3.4H3.6z" {...stroke} />
      <Path d="M5.2 12.2h13.6v7.6a1 1 0 0 1-1 1H6.2a1 1 0 0 1-1-1z" {...stroke} />
      <Path d="M12 8.8v12" {...stroke} />
      <Path d="M12 8.8S10.6 3.4 8.1 3.4a2.1 2.1 0 0 0 0 5.4z" {...stroke} />
      <Path d="M12 8.8s1.4-5.4 3.9-5.4a2.1 2.1 0 0 1 0 5.4z" {...stroke} />
    </Svg>
  );
});

/** A closed padlock. Reserved for rewards that are genuinely out of reach. */
export const LockIcon = memo(function LockIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path
        d="M5.6 11.2h12.8a1 1 0 0 1 1 1v7.2a1 1 0 0 1-1 1H5.6a1 1 0 0 1-1-1v-7.2a1 1 0 0 1 1-1z"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinejoin={props.strokeLinejoin}
      />
      <Path
        d="M8.2 11.2V8a3.8 3.8 0 0 1 7.6 0v3.2"
        stroke={color}
        strokeWidth={props.strokeWidth}
        strokeLinecap={props.strokeLinecap}
      />
      <Circle cx={12} cy={15.6} r={1.2} fill={color} />
    </Svg>
  );
});

/** A lowercase i in a ring — the universal "explain this to me". */
export const InfoIcon = memo(function InfoIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Circle cx={12} cy={12} r={8.6} stroke={color} strokeWidth={props.strokeWidth} />
      <Path d="M12 11v5.2" stroke={color} strokeWidth={props.strokeWidth} strokeLinecap={props.strokeLinecap} />
      <Circle cx={12} cy={8} r={1} fill={color} />
    </Svg>
  );
});

/** A tick. Drawn rather than typed so it never depends on a font's glyph metrics. */
export const CheckIcon = memo(function CheckIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Path
        d="m5.8 12.4 4 4L18.2 7.6"
        stroke={color}
        strokeWidth={active ? 3 : 2.6}
        strokeLinecap={props.strokeLinecap}
        strokeLinejoin={props.strokeLinejoin}
      />
    </Svg>
  );
});

/** Future. A person — the one tab that is a who, not a what. */
export const FutureIcon = memo(function FutureIcon({ size = 24, color, active }: IconProps) {
  const props = base(size, active);
  return (
    <Svg {...props}>
      <Circle cx={12} cy={8} r={3.6} stroke={color} strokeWidth={props.strokeWidth} />
      <Path d="M4.8 20.5c0-3.7 3.2-6.7 7.2-6.7s7.2 3 7.2 6.7" stroke={color} strokeWidth={props.strokeWidth} strokeLinecap={props.strokeLinecap} strokeLinejoin={props.strokeLinejoin} />
    </Svg>
  );
});
