export type ProductVariant = {
  label: string;
  values: string[];
};

export type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
  units: number;
  variants?: ProductVariant[];
};

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Handwoven Cotton Scarf",
    price: 1200,
    description: "A beautiful, lightweight cotton scarf handwoven by artisans. Perfect for any season and adds a touch of elegance to any outfit.",
    imageUrl: "https://picsum.photos/seed/1/400/400",
    category: "Accessories",
    units: 14,
    variants: [
      { label: "Size", values: ["S", "M", "L", "Free Size"] },
      { label: "Colour", values: ["Red", "Beige", "Olive Green", "Navy"] },
    ]
  },
  {
    id: "2",
    name: "Ceramic Coffee Mug",
    price: 450,
    description: "Start your morning right with this perfectly sized, handcrafted ceramic mug. Microwave and dishwasher safe.",
    imageUrl: "https://picsum.photos/seed/2/400/400",
    category: "Crafts",
    units: 0,
    variants: [
      { label: "Colour", values: ["White", "Matte Black", "Terracotta"] },
    ]
  },
  {
    id: "3",
    name: "Organic Green Tea Blend",
    price: 350,
    description: "A refreshing blend of organic green tea leaves and delicate jasmine flowers. Sourced directly from hill gardens.",
    imageUrl: "https://picsum.photos/seed/3/400/400",
    category: "Food",
    units: 32,
    variants: [
      { label: "Pack Size", values: ["50g", "100g", "250g"] },
    ]
  },
  {
    id: "4",
    name: "Linen Summer Dress",
    price: 2400,
    description: "Stay cool and comfortable in this breathable linen summer dress. Features a relaxed fit and handy side pockets.",
    imageUrl: "https://picsum.photos/seed/4/400/400",
    category: "Clothes",
    units: 5,
    variants: [
      { label: "Size", values: ["XS", "S", "M", "L", "XL"] },
      { label: "Colour", values: ["Off White", "Sky Blue", "Sage Green"] },
    ]
  },
  {
    id: "5",
    name: "Leather Crossbody Bag",
    price: 3200,
    description: "A minimalist leather crossbody bag that holds all your essentials. Soft, durable, and gets better with age.",
    imageUrl: "https://picsum.photos/seed/5/400/400",
    category: "Accessories",
    units: 0,
    variants: [
      { label: "Colour", values: ["Tan", "Black", "Chocolate Brown"] },
    ]
  },
  {
    id: "6",
    name: "Artisan Chocolate Truffles",
    price: 650,
    description: "Box of 12 handcrafted dark chocolate truffles with rich, creamy centers. Made with premium cocoa.",
    imageUrl: "https://picsum.photos/seed/6/400/400",
    category: "Food",
    units: 20,
    variants: [
      { label: "Pack", values: ["Box of 6", "Box of 12", "Box of 24"] },
      { label: "Flavour", values: ["Dark", "Milk", "Mixed"] },
    ]
  },
  {
    id: "7",
    name: "Macrame Wall Hanging",
    price: 1800,
    description: "Add texture to your space with this intricately knotted macrame wall hanging. Made with natural cotton cord.",
    imageUrl: "https://picsum.photos/seed/7/400/400",
    category: "Crafts",
    units: 8,
    variants: [
      { label: "Size", values: ["Small (30cm)", "Medium (60cm)", "Large (90cm)"] },
    ]
  },
  {
    id: "8",
    name: "Denim Jacket",
    price: 2800,
    description: "A classic denim jacket with a comfortable fit. The perfect layering piece for cool evenings.",
    imageUrl: "https://picsum.photos/seed/8/400/400",
    category: "Clothes",
    units: 3,
    variants: [
      { label: "Size", values: ["S", "M", "L", "XL", "XXL"] },
      { label: "Wash", values: ["Light Wash", "Dark Wash", "Distressed"] },
    ]
  }
];

export const MOCK_STATS = {
  totalOrders: 24,
  revenue: 48500,
  productCount: 8
};

export const MOCK_COUPONS = {
  "SAVE10": 10,
  "WELCOME20": 20,
  "SUMMER15": 15
};

export const MOCK_STORE_INFO = {
  name: "Priya's Boutique",
  slug: "priya-boutique",
  whatsapp: "+91 98765 43210",
  category: "Fashion",
  location: "Bandra West, Mumbai, Maharashtra"
};
