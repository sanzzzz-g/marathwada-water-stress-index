import React, {
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';

export interface ScrollExpandMediaProps {
  mediaType?: 'video' | 'image';
  mediaSrc: string;
  posterSrc?: string;
  bgImageSrc: string;
  title?: string;
  date?: string;
  scrollToExpand?: string;
  textBlend?: boolean;
  children?: ReactNode;
}

export const ScrollExpandMedia: React.FC<ScrollExpandMediaProps> = ({
  mediaType = 'image',
  mediaSrc,
  posterSrc,
  bgImageSrc,
  title = 'MARATHWADA WATER INTELLIGENCE',
  date = 'Godavari Basin & 8 Districts',
  scrollToExpand = 'Scroll down or click to expand platform telemetry',
  textBlend = false,
  children,
}) => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showContent, setShowContent] = useState<boolean>(false);
  const [mediaFullyExpanded, setMediaFullyExpanded] = useState<boolean>(false);
  const [isMobileState, setIsMobileState] = useState<boolean>(false);

  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setScrollProgress(0);
    setShowContent(false);
    setMediaFullyExpanded(false);
  }, [mediaType]);

  useEffect(() => {
    let touchStartY = 0;

    const handleWheel = (e: WheelEvent) => {
      if (mediaFullyExpanded) {
        if (e.deltaY < 0 && window.scrollY <= 10) {
          setMediaFullyExpanded(false);
          setShowContent(false);
          setScrollProgress(0.9);
          e.preventDefault();
        }
      } else {
        const scrollDelta = e.deltaY * 0.0015;
        setScrollProgress(prev => {
          const next = Math.min(Math.max(prev + scrollDelta, 0), 1);
          if (next >= 0.98) {
            setMediaFullyExpanded(true);
            setShowContent(true);
            return 1;
          } else if (next < 0.75) {
            setShowContent(false);
          }
          return next;
        });
        if (scrollProgress < 1) {
          e.preventDefault();
        }
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartY) return;
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY;

      if (mediaFullyExpanded) {
        if (deltaY < -25 && window.scrollY <= 10) {
          setMediaFullyExpanded(false);
          setShowContent(false);
          setScrollProgress(0.9);
          e.preventDefault();
        }
      } else {
        const factor = deltaY < 0 ? 0.006 : 0.004;
        const scrollDelta = deltaY * factor;
        setScrollProgress(prev => {
          const next = Math.min(Math.max(prev + scrollDelta, 0), 1);
          if (next >= 0.98) {
            setMediaFullyExpanded(true);
            setShowContent(true);
            return 1;
          } else if (next < 0.75) {
            setShowContent(false);
          }
          return next;
        });
        if (scrollProgress < 1) {
          e.preventDefault();
        }
        touchStartY = touchY;
      }
    };

    const handleTouchEnd = () => {
      touchStartY = 0;
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scrollProgress, mediaFullyExpanded]);

  useEffect(() => {
    const checkIfMobile = (): void => {
      setIsMobileState(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  const triggerExpand = () => {
    setScrollProgress(1);
    setMediaFullyExpanded(true);
    setShowContent(true);
  };

  const mediaWidth = 320 + scrollProgress * (isMobileState ? 600 : 1200);
  const mediaHeight = 380 + scrollProgress * (isMobileState ? 220 : 380);
  const textTranslateX = scrollProgress * (isMobileState ? 180 : 150);

  const firstWord = title ? title.split(' ')[0] : '';
  const restOfTitle = title ? title.split(' ').slice(1).join(' ') : '';

  return (
    <div ref={sectionRef} className="transition-colors duration-700 ease-in-out overflow-x-hidden">
      <section className="relative flex flex-col items-center justify-start min-h-[100dvh]">
        <div className="relative w-full flex flex-col items-center min-h-[100dvh]">
          {/* Background Image with smooth fade out on expand */}
          <div
            className="absolute inset-0 z-0 h-full overflow-hidden transition-opacity duration-200"
            style={{ opacity: Math.max(0, 1 - scrollProgress) }}
          >
            <img
              src={bgImageSrc}
              alt="Water Basin Background"
              className="w-screen h-screen object-cover object-center filter brightness-40"
            />
            <div className="absolute inset-0 bg-[#080d1a]/60 backdrop-blur-xs" />
          </div>

          {/* Expanding Media Container */}
          <div className="container mx-auto flex flex-col items-center justify-start relative z-10">
            <div className="flex flex-col items-center justify-center w-full h-[100dvh] relative">
              <div
                onClick={!mediaFullyExpanded ? triggerExpand : undefined}
                className="absolute z-0 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-150 rounded-2xl overflow-hidden border border-cyan-500/30 cursor-pointer"
                style={{
                  width: `${mediaWidth}px`,
                  height: `${mediaHeight}px`,
                  maxWidth: '96vw',
                  maxHeight: '86vh',
                  boxShadow: '0px 0px 60px rgba(6, 182, 212, 0.25)',
                }}
                title={!mediaFullyExpanded ? 'Click to expand' : undefined}
              >
                {mediaType === 'video' ? (
                  <div className="relative w-full h-full pointer-events-none">
                    <video
                      src={mediaSrc}
                      poster={posterSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      className="w-full h-full object-cover rounded-xl"
                      controls={false}
                    />
                    <div
                      className="absolute inset-0 bg-slate-950/40 rounded-xl transition-opacity duration-200"
                      style={{ opacity: Math.max(0.2, 0.5 - scrollProgress * 0.3) }}
                    />
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={mediaSrc}
                      alt={title || 'Hydroclimatic Intelligence'}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <div
                      className="absolute inset-0 bg-slate-950/40 rounded-xl transition-opacity duration-200"
                      style={{ opacity: Math.max(0.2, 0.5 - scrollProgress * 0.3) }}
                    />
                  </div>
                )}

                {/* Subtitle / Expansion prompt */}
                <div className="flex flex-col items-center text-center relative z-10 mt-4 px-4 transition-transform duration-150">
                  {date && (
                    <p
                      className="text-lg md:text-xl font-mono text-cyan-300 font-semibold drop-shadow-md"
                      style={{ transform: `translateX(-${textTranslateX}vw)` }}
                    >
                      {date}
                    </p>
                  )}
                  {scrollToExpand && (
                    <p
                      className="text-xs md:text-sm text-slate-300 font-medium text-center mt-1 drop-shadow"
                      style={{ transform: `translateX(${textTranslateX}vw)` }}
                    >
                      {scrollToExpand}
                    </p>
                  )}
                </div>
              </div>

              {/* Splitting Title Animation */}
              <div
                className={`flex items-center justify-center text-center gap-3 w-full relative z-10 transition-none flex-col px-4 ${
                  textBlend ? 'mix-blend-difference' : 'mix-blend-normal'
                }`}
              >
                <h2
                  className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-cyan-200 drop-shadow-lg transition-transform duration-150"
                  style={{ transform: `translateX(-${textTranslateX}vw)` }}
                >
                  {firstWord}
                </h2>
                <h2
                  className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-center text-slate-100 drop-shadow-lg transition-transform duration-150"
                  style={{ transform: `translateX(${textTranslateX}vw)` }}
                >
                  {restOfTitle}
                </h2>
              </div>
            </div>

            {/* Revealed Children Content */}
            <section
              className="flex flex-col w-full px-4 py-8 md:px-12 lg:py-16 transition-opacity duration-500 ease-in-out"
              style={{
                opacity: showContent ? 1 : 0,
                pointerEvents: showContent ? 'auto' : 'none',
              }}
            >
              {children}
            </section>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ScrollExpandMedia;
