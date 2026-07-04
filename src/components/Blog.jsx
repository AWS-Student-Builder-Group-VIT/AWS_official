import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BLOG_DATA from '../data/blogData';
import awsIcon from '../assets/aws_icon.jpeg';

const ArrowLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
);

const ArrowRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const CursorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
  </svg>
);

export default function Blog() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(2);
  
  // Duplicate the array to ensure smooth carousel wrapping since there are only 4 posts
  const carouselItems = [...BLOG_DATA, ...BLOG_DATA].map((item, index) => ({
    ...item,
    uniqueId: `${item.slug}-${index}`
  }));

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % carouselItems.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  return (
    <section id="blog" className="relative w-full py-24 bg-background border-b border-white/10 overflow-hidden font-sans">
      <div className="relative w-full mt-12 mb-12">
        
        {/* Top Badge */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-[20px] border-2 border-primary-container px-6 py-2 shadow-[4px_4px_0px_0px_var(--color-primary-container)] z-20 flex items-center justify-center gap-3 whitespace-nowrap bg-background">
          <img src={awsIcon} alt="AWS Club Icon" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
          <span className="text-primary-container font-bold text-[15px] sm:text-lg uppercase tracking-widest">Blogs</span>
        </div>

        {/* Full-width Container */}
        <div 
          className="relative w-full pt-24 pb-16 px-4 flex flex-col items-center"
          style={{
            minHeight: '600px'
          }}
        >
          {/* Subtle Grid Paper Pattern */}
          <div className="absolute inset-0 pointer-events-none bg-grid-pattern opacity-50" />

          {/* Carousel Wrapper */}
          <div className="relative w-full max-w-[1000px] h-[450px] flex items-center justify-center perspective-[1000px]">
            {carouselItems.map((card, index) => {
              // Distance from active index
              let distance = index - activeIndex;
              // Normalize distance to handle wrapping
              if (distance > carouselItems.length / 2) distance -= carouselItems.length;
              if (distance < -carouselItems.length / 2) distance += carouselItems.length;

              const isActive = distance === 0;
              const isVisible = Math.abs(distance) <= 2;
              
              if (!isVisible && Math.abs(distance) !== 3) return null;

              // Alternating rotation for inactive cards
              const rotationOffset = index % 2 === 0 ? 4 : -4;

              return (
                <motion.div
                  key={card.uniqueId}
                  initial={false}
                  animate={{
                    x: distance * 280, // Horizontal spread
                    scale: isActive ? 1.05 : 0.95,
                    rotate: isActive ? 0 : rotationOffset,
                    zIndex: 50 - Math.abs(distance),
                    opacity: Math.abs(distance) >= 3 ? 0 : 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                    mass: 1,
                  }}
                  className="absolute w-[300px] sm:w-[320px] h-[380px] sm:h-[400px] cursor-pointer"
                  onClick={() => {
                    if (isActive) {
                      navigate(`/blog/${card.slug}`);
                    } else {
                      setActiveIndex(index);
                    }
                  }}
                >
                  {/* Shadow Element (to emulate brutalist shadow with clip path) */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      top: isActive ? '8px' : '6px',
                      left: isActive ? '8px' : '6px',
                      backgroundColor: isActive ? '#FF9900' : 'rgba(255,255,255,0.2)',
                      clipPath: 'polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 0 100%)',
                      transition: 'top 0.4s ease, left 0.4s ease, background-color 0.4s ease'
                    }}
                  />

                  {/* Card Neo-Brutalist Shape (Outer wrapper acts as border) */}
                  <div 
                    className="absolute inset-0 flex flex-col p-[2px]"
                    style={{
                      clipPath: 'polygon(0 0, calc(100% - 40px) 0, 100% 40px, 100% 100%, 0 100%)',
                      backgroundColor: isActive ? '#FF9900' : 'rgba(255,255,255,0.2)',
                      transition: 'background-color 0.4s ease'
                    }}
                  >
                    {/* Inner wrapper is the actual card background */}
                    <div
                      className="w-full h-full flex flex-col relative"
                      style={{
                        clipPath: 'polygon(0 0, calc(100% - 39px) 0, 100% 39px, 100% 100%, 0 100%)',
                        backgroundColor: isActive ? '#FF9900' : '#0A0C10',
                        color: isActive ? '#000000' : '#FFFFFF',
                        transition: 'background-color 0.4s ease, color 0.4s ease'
                      }}
                    >
                    {/* Inner Content (Top Section) */}
                    <div className="flex-1 p-6 flex flex-col pt-8">
                      <span 
                        className="text-[10px] font-bold tracking-widest uppercase mb-2 line-clamp-1"
                        style={{ color: isActive ? 'rgba(0,0,0,0.8)' : '#FF9900', transition: 'color 0.4s ease' }}
                      >
                        {card.author} • {card.category}
                      </span>
                      <h3 className="text-[22px] font-black mb-2 tracking-tight leading-tight line-clamp-2">
                        {card.title}
                      </h3>
                      <h4 
                        className="text-[12px] font-bold uppercase tracking-wider mb-3 line-clamp-1"
                        style={{ color: isActive ? 'rgba(0,0,0,0.9)' : '#FFFFFF' }}
                      >
                        {card.subtitle}
                      </h4>
                      <p 
                        className="text-[13px] leading-relaxed font-medium line-clamp-3" 
                        style={{ color: isActive ? 'rgba(0,0,0,0.75)' : '#A1A1AA', transition: 'color 0.4s ease' }}
                      >
                        {card.description}
                      </p>
                    </div>

                    {/* Card Footer (Action Area) - Always white with black text */}
                    <div className="h-[60px] border-t-2 bg-white flex items-center justify-between px-6 flex-shrink-0" style={{ borderColor: isActive ? '#000000' : 'rgba(255,255,255,0.2)' }}>
                      <span className="text-black font-bold text-[13px] tracking-widest uppercase">
                        {isActive ? 'READ FULL POST' : 'VIEW BLOG'}
                      </span>
                      <div className="text-black">
                        <CursorIcon />
                      </div>
                    </div>
                  </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="mt-8 flex gap-4 z-20">
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="w-12 h-12 border-2 border-primary-container bg-background flex items-center justify-center text-primary-container hover:scale-95 active:scale-90 transition-transform cursor-pointer shadow-[2px_2px_0px_0px_var(--color-primary-container)]"
            >
              <ArrowLeft />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="w-12 h-12 border-2 border-primary-container bg-background flex items-center justify-center text-primary-container hover:scale-95 active:scale-90 transition-transform cursor-pointer shadow-[2px_2px_0px_0px_var(--color-primary-container)]"
            >
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
