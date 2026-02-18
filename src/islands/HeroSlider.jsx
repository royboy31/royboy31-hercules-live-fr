import { useState, useEffect } from 'react';

const slides = [
  {
    id: 1,
    image: 'https://staging.hercules-merchandise.de/wp-content/uploads/2025/06/Hercules_Merchandise_football_kit_99-19.png',
    title: 'Custom Football Shirt',
    description: 'Personalised football shirts for your club',
    cta: 'Discover Now',
    link: '/products/custom-football-shirts',
    backgroundColor: '#253461',
  },
  {
    id: 2,
    image: 'https://staging.hercules-merchandise.de/wp-content/uploads/2025/06/HerculesMerchandisecustomfootballscarf102_c547ca87-7aa5-4360-a060-bf1176e710a0-23.png',
    title: 'Custom HD Football Scarf',
    description: 'High-quality fan scarves with your design',
    cta: 'Learn More',
    link: '/products/custom-football-scarf',
    backgroundColor: '#469ADC',
  },
  {
    id: 3,
    image: 'https://staging.hercules-merchandise.de/wp-content/uploads/2025/06/Hercules-Merchandise-Custom-Shoes-96-2.png',
    title: 'Custom Club Slides',
    description: 'Custom slides for your club',
    cta: 'Discover Our Club Slides',
    link: '/products/custom-club-slides-and-slippers',
    backgroundColor: '#10C99E',
  },
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000); // Auto-advance every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isPaused]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div
      className="hero-slider relative w-full overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{ height: '600px' }}
    >
      {/* Slides */}
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute top-0 left-0 w-full h-full transition-opacity duration-700 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={{ backgroundColor: slide.backgroundColor }}
          >
            <div className="container h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center h-full py-12">
                {/* Content */}
                <div className="text-white z-20 order-2 md:order-1">
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-slide-up">
                    {slide.title}
                  </h2>
                  <p className="text-xl md:text-2xl mb-8 text-white/90 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    {slide.description}
                  </p>
                  <a
                    href={slide.link}
                    className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/90 transition-all transform hover:scale-105 animate-slide-up"
                    style={{ animationDelay: '0.2s' }}
                  >
                    {slide.cta}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                </div>

                {/* Image */}
                <div className="flex items-center justify-center order-1 md:order-2">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="max-w-full h-auto max-h-[500px] object-contain animate-fade-in"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-white w-8'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
