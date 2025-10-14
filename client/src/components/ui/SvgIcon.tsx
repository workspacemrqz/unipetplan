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
      className={cn(
        "inline-block",
        // Por padrão, aplica filtro que transforma a imagem SVG na cor atual do texto
        "[filter:brightness(0)_saturate(100%)]",
        className
      )}
    />
  );
}