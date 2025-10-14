import { cn } from "@/lib/admin/utils";

interface SvgIconProps {
  name: string;
  className?: string;
}

export function SvgIcon({ name, className }: SvgIconProps) {
  const iconPath = `/Icons/${name}.svg`;
  
  return (
    <img 
      src={iconPath} 
      alt={name}
      className={cn("inline-block", className)}
    />
  );
}