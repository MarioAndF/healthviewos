import type { HealthViewIconKey } from "@healthviewos/app-model";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Baby,
  Bone,
  Brain,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Dna,
  Droplet,
  Dumbbell,
  FileText,
  FlaskConical,
  FolderOpen,
  Globe2,
  HeartPulse,
  Hospital,
  IdCard,
  Lock,
  MessageCircle,
  Microscope,
  Pill,
  ScanSearch,
  Settings,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserRound,
  Utensils,
  Wind,
  X,
} from "lucide-react-native";

export type PlatformIconName = HealthViewIconKey;

type LucideNativeIcon = typeof Activity;

const iconByKey: Record<PlatformIconName, LucideNativeIcon> = {
  activity: Activity,
  alert: AlertTriangle,
  "arrow-left": ArrowLeft,
  baby: Baby,
  bone: Bone,
  brain: Brain,
  building: Building2,
  calendar: CalendarDays,
  card: CreditCard,
  "chevron-right": ChevronRight,
  "clipboard-list": ClipboardList,
  close: X,
  digestive: Utensils,
  dna: Dna,
  droplet: Droplet,
  dumbbell: Dumbbell,
  file: FileText,
  folder: FolderOpen,
  globe: Globe2,
  heart: HeartPulse,
  hospital: Hospital,
  "id-card": IdCard,
  lab: FlaskConical,
  medication: Pill,
  message: MessageCircle,
  microscope: Microscope,
  scan: ScanSearch,
  security: ShieldCheck,
  settings: Settings,
  stethoscope: Stethoscope,
  syringe: Syringe,
  user: UserRound,
  utensils: Utensils,
  wind: Wind,
};

export function PlatformIcon({
  color,
  icon,
  size = 20,
  strokeWidth = 2,
}: {
  color: string;
  icon: PlatformIconName;
  size?: number;
  strokeWidth?: number;
}) {
  const Icon = iconByKey[icon] ?? Lock;

  return <Icon color={color} size={size} strokeWidth={strokeWidth} />;
}
