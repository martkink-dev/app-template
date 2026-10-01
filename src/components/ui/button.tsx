/*
 * CUSTOMISED shadcn/ui component: Material Design 3 buttons.
 * Do not overwrite with `npx shadcn@latest add button`.
 *
 * Variant -> MD3 button type:
 *   default     Filled   (main action, one per view)
 *   secondary   Tonal    (important, but not the main action)
 *   elevated    Elevated (needs to stand out from a patterned background)
 *   outline     Outlined (medium emphasis)
 *   ghost       Text     (low emphasis); with an icon size: standard icon button
 *   destructive Error tonal (delete, irreversible actions)
 *   link        Inline text link
 *
 * Hover and press use MD3 state layers: the content colour mixed into the
 * container colour at 8 % (hover) and 10 % (pressed).
 */
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonCva = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,box-shadow] outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary),var(--primary-foreground)_8%)] hover:shadow-sm active:bg-[color-mix(in_srgb,var(--primary),var(--primary-foreground)_10%)] active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,var(--secondary),var(--secondary-foreground)_8%)] hover:shadow-sm active:bg-[color-mix(in_srgb,var(--secondary),var(--secondary-foreground)_10%)] active:shadow-none aria-expanded:bg-[color-mix(in_srgb,var(--secondary),var(--secondary-foreground)_10%)]",
        elevated:
          "bg-surface-container-low text-primary shadow-sm hover:bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-low),var(--primary)_8%)] hover:shadow-md active:bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-low),var(--primary)_10%)] active:shadow-sm",
        outline:
          "border-input bg-transparent text-primary hover:bg-primary/8 active:bg-primary/10 aria-expanded:bg-primary/10",
        ghost:
          "text-primary hover:bg-primary/8 active:bg-primary/10 aria-expanded:bg-primary/10",
        destructive:
          "bg-error-container text-error-container-foreground hover:bg-[color-mix(in_srgb,var(--md-sys-color-error-container),var(--md-sys-color-on-error-container)_8%)] active:bg-[color-mix(in_srgb,var(--md-sys-color-error-container),var(--md-sys-color-on-error-container)_10%)] focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        // MD3 default: 40 px high, 24 px side padding, 16 px next to an icon.
        default:
          "h-10 gap-2 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-6 gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-4",
        lg: "h-12 gap-2 px-8 text-base has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6 [&_svg:not([class*='size-'])]:size-5",
        icon: "size-10",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-4",
        "icon-lg": "size-12 [&_svg:not([class*='size-'])]:size-6",
      },
    },
    compoundVariants: [
      // MD3 standard icon button: neutral colour instead of primary.
      {
        variant: "ghost",
        size: ["icon", "icon-xs", "icon-sm", "icon-lg"],
        className:
          "text-muted-foreground hover:bg-foreground/8 hover:text-foreground active:bg-foreground/10 aria-expanded:bg-foreground/10 aria-expanded:text-foreground",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Class names for a button. Also use for links that look like buttons:
 * `<Link className={buttonVariants({ variant: "outline" })} />`.
 * Runs through cn() so that compound variants and extra classes override
 * the base variant cleanly.
 */
function buttonVariants(props?: Parameters<typeof buttonCva>[0]) {
  return cn(buttonCva(props));
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonCva>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}

export { Button, buttonVariants };
