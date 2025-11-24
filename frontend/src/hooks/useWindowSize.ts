import { useState, useEffect } from "react";

export default function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    width: size.width,
    height: size.height,
    // Tailwind's default md breakpoint is 768px
    isMdUp: size.width >= 768,
    isSm: size.width < 640,
  };
}
