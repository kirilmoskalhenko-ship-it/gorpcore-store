export interface NavItem {
  label: string;
  /** Якорь секции на главной странице. */
  href: `#${string}`;
}

export const navigation: NavItem[] = [
  { label: "LOOKBOOK", href: "#lookbook" },
  { label: "SHOP", href: "#shop" },
  { label: "BUILD YOUR FIT", href: "#build" },
  { label: "ABOUT", href: "#about" },
];
