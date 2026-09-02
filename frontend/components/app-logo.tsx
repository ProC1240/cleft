type AppLogoProps = {
  size?: "sm" | "md" | "lg";
  variant?: "circle" | "square" | "mark";
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
};

export function AppLogo({ size = "md", variant = "square", showWordmark = true, wordmarkClassName = "", className = "" }: AppLogoProps) {
  const iconSize = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-[52px] w-[52px]" : "h-8 w-8";
  const iconSrc = variant === "circle" ? "/cleft-icon-circle.svg" : variant === "mark" ? "/cleft-mark.svg" : "/cleft-icon-square.svg";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc}
        alt=""
        width={36}
        height={36}
        className={`${iconSize} shrink-0 object-contain`}
        draggable={false}
      />
      {showWordmark ? (
        <span
          className={`font-display text-xl font-medium tracking-[0.01em] text-text sm:text-[1.35rem] ${wordmarkClassName}`}
        >
          cleft
        </span>
      ) : null}
    </span>
  );
}
