"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "system";

const ThemeIcon = ({ theme, style }: { theme: Theme; style?: string }) => {
  const iconMap: Record<Theme, string> = {
    light: "/icons/sun.svg",
    dark: "/icons/moon.svg",
    system: "/icons/computer.svg",
  };

  return (
    <Image
      priority
      width={20}
      height={20}
      loading="eager"
      src={iconMap[theme]}
      alt={`${theme} mode logo`}
      className={style || ""}
    />
  );
};

const ThemeSwitcher = () => {
  const { setTheme, resolvedTheme: currentTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure component is only rendered on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // If not mounted (i.e., rendering on the server), render null to avoid mismatches
  if (!mounted) {
    return null;
  }

  const handleThemeChange = (theme: Theme) => {
    setTheme(theme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="cursor-pointer outline-none focus:bg-light-900 data-[state=open]:bg-light-900 dark:focus:bg-dark-200 dark:data-[state=open]:bg-dark-200"
        >
          <ThemeIcon theme={currentTheme as Theme} style="active-theme" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <ThemeIcon theme="light" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <ThemeIcon theme="dark" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("system")}>
          <ThemeIcon theme="system" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeSwitcher;
