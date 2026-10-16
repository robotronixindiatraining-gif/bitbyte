import {
  Boxes,
  Briefcase,
  ChartColumn,
  Cloud,
  CodeXml,
  Cpu,
  Database,
  Gauge,
  Globe,
  GraduationCap,
  Handshake,
  Layers,
  LayoutTemplate,
  Lightbulb,
  Mail,
  MapPin,
  Megaphone,
  Monitor,
  Network,
  Palette,
  PenTool,
  Phone,
  Puzzle,
  Rocket,
  Search,
  Server,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wifi,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';

/**
 * Curated icon set (§5): the CMS stores an icon by NAME; only these names render. Unknown names
 * fall back to a neutral icon instead of failing, so content can never break the page.
 */
export const ICONS = Object.freeze({
  code: CodeXml,
  smartphone: Smartphone,
  cpu: Cpu,
  'layout-template': LayoutTemplate,
  megaphone: Megaphone,
  globe: Globe,
  server: Server,
  cloud: Cloud,
  'shield-check': ShieldCheck,
  database: Database,
  wifi: Wifi,
  'chart-column': ChartColumn,
  search: Search,
  settings: Settings,
  'pen-tool': PenTool,
  rocket: Rocket,
  layers: Layers,
  users: Users,
  briefcase: Briefcase,
  'graduation-cap': GraduationCap,
  mail: Mail,
  phone: Phone,
  'map-pin': MapPin,
  monitor: Monitor,
  'shopping-cart': ShoppingCart,
  workflow: Workflow,
  lightbulb: Lightbulb,
  handshake: Handshake,
  target: Target,
  gauge: Gauge,
  boxes: Boxes,
  network: Network,
  palette: Palette,
  'trending-up': TrendingUp,
  wrench: Wrench,
  puzzle: Puzzle,
  zap: Zap,
});
export const ICON_NAMES = Object.freeze(Object.keys(ICONS));

export function Icon({ name, className, strokeWidth = 1.75 }) {
  const Component = ICONS[name] ?? Sparkles;
  return (
    <Component
      aria-hidden="true"
      focusable="false"
      className={className}
      strokeWidth={strokeWidth}
    />
  );
}

/** 44 × 44 icon tile: accent tint on light, navy on dark (§5). */
export function IconTile({ name, className }) {
  if (!name) return null;
  return (
    <span
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-tile text-tile-fg ${className ?? ''}`}
    >
      <Icon name={name} className="size-6" />
    </span>
  );
}
