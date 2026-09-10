import { useState, useRef } from 'react';

export default function InteractiveHeroGrid() {
  const containerRef = useRef(null);
  const [gridState, setGridState] = useState({
    x: 0,
    y: 0,
    size: 1, // multiplier: 1, 2, or 4
    isVisible: false,
  });

  const handleMouseMove = (e) => {
    // Disable effect on mobile devices (window width < 768px)
    if (window.innerWidth < 768) {
      if (gridState.isVisible) {
        setGridState((prev) => ({ ...prev, isVisible: false }));
      }
      return;
    }

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const relativeY = e.clientY - rect.top;

    // Grid cells are 80x80
    const snappedX = Math.floor(relativeX / 80) * 80;
    const snappedY = Math.floor(relativeY / 80) * 80;

    // Only update state if we enter a new cell to maintain performance
    if (
      !gridState.isVisible ||
      snappedX !== gridState.x ||
      snappedY !== gridState.y
    ) {
      const sizes = [1, 2, 4];
      const randomSize = sizes[Math.floor(Math.random() * sizes.length)];

      setGridState({
        x: snappedX,
        y: snappedY,
        size: randomSize,
        isVisible: true,
      });
    }
  };

  const handleMouseLeave = () => {
    setGridState((prev) => ({ ...prev, isVisible: false }));
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Interactive Highlight Block */}
      <div
        className={`absolute hidden md:block pointer-events-none mix-blend-screen transition-opacity duration-150 ease-out ${
          gridState.isVisible ? 'opacity-80' : 'opacity-0'
        }`}
        style={{
          backgroundColor: '#FF9900', // AWS Orange
          left: `${gridState.x}px`,
          top: `${gridState.y}px`,
          width: `${80 * gridState.size}px`,
          height: `${80 * gridState.size}px`,
          // Disable transition on layout properties for instant snapping
          transitionProperty: 'opacity',
        }}
      />
    </div>
  );
}
