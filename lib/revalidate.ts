import { revalidatePath } from "next/cache";
import { routing } from "@/i18n/routing";

// revalidatePath targets route-segment ISR pages directly (call on publish/sync).
export function revalidateProducts() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/category/[slug]`, "page");
  }
}

export function revalidateArticles() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/blog`);
    revalidatePath(`/${locale}/blog/[slug]`, "page");
  }
}
