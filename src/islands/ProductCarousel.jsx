import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function ProductCarousel({ products }) {
  return (
    <div className="product-carousel-wrapper">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={24}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
        }}
        breakpoints={{
          640: {
            slidesPerView: 2,
            spaceBetween: 20,
          },
          768: {
            slidesPerView: 3,
            spaceBetween: 24,
          },
          1024: {
            slidesPerView: 4,
            spaceBetween: 24,
          },
        }}
        className="featured-products-swiper"
      >
        {products.map((product) => (
          <SwiperSlide key={product.id}>
            <div className="product-card card group h-full">
              <a href={`/products/${product.slug}`} className="block h-full">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={product.images[0]?.src || '/placeholder-product.jpg'}
                    alt={product.images[0]?.alt || product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                <div className="p-4">
                  <h3 className="font-medium text-lg text-primary mb-2 group-hover:text-accent transition-colors">
                    {product.name}
                  </h3>

                  <div className="flex items-center gap-2">
                    {product.on_sale ? (
                      <>
                        <span className="text-xl font-semibold text-accent">
                          {`£${parseFloat(product.price).toFixed(2)}`}
                        </span>
                        <span className="text-sm text-text-secondary line-through">
                          {`£${parseFloat(product.regular_price).toFixed(2)}`}
                        </span>
                      </>
                    ) : (
                      <span className="text-xl font-semibold text-primary">
                        {`£${parseFloat(product.price).toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
