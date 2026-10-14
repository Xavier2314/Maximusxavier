"use client";
import { BookOpen, Briefcase, Circle, Dumbbell, Mic, Music, Plane, Star, User, Heart, GraduationCap, Moon, Sparkles, type LucideIcon } from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  "book-open": BookOpen, dumbbell: Dumbbell, music: Music, briefcase: Briefcase, mic: Mic, user: User, plane: Plane, star: Star,
  heart: Heart, "graduation-cap": GraduationCap, moon: Moon, sparkles: Sparkles, circle: Circle,
};

export function CategoryIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const I = (icon && MAP[icon]) || Circle;
  return <I className={className ?? "h-4 w-4"} aria-hidden />;
}
