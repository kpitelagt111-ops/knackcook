import { Rating } from "@/components/ui/rating";
import { Link } from "@/i18n/navigation";
import type { ProductCardData } from "@/lib/products/queries";
import { ProductImage } from "./product-image";
import { WishlistButton } from "./wishlist-button";

/** Product card used on the homepage, category and search pages. No price (compliance). */
export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <div className="group relative">
      <Link
        href={`/products/${product.slug}`}
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-3 shadow-soft transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-ember-200 dark:hover:border-ember-500/60 hover:shadow-lift focus-visible:-translate-y-1.5 focus-visible:border-ember-300 focus-visible:shadow-lift"
      >
        <div className="relative overflow-hidden rounded-xl">
          <ProductImage
            placeholderKey={product.placeholderKey ?? product.categorySlug}
            className="aspect-square w-full rounded-xl transition-transform duration-[600ms] ease-out group-hover:scale-[1.05] group-focus-visible:scale-[1.05]"
          />
          {product.editorialRating != null ? (
            <span className="absolute left-3 top-3">
              <Rating score={product.editorialRating} size="sm" />
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5 px-2 pb-3">
          {product.brand ? (
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ember-600">
              {product.brand}
            </p>
          ) : null}
          <h3 className="line-clamp-2 font-display text-base font-medium leading-snug text-foreground transition-colors group-hover:text-ember-700 dark:group-hover:text-ember-200">
            {product.title}
          </h3>
          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors group-hover:text-ember-700 dark:group-hover:text-ember-200">
            Read the review
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>
      </Link>
      <WishlistButton slug={product.slug} className="absolute right-5 top-5 z-10" />
    </div>
  );
}
