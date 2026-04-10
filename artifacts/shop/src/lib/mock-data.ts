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

export type Review = {
  id: string;
  name: string;
  rating: number;
  comment: string;
  date: string;
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

export const MOCK_REVIEWS: Record<string, Review[]> = {
  "1": [
    { id: "r1", name: "Ananya S.", rating: 5, comment: "Absolutely love this scarf! The colours are vibrant and it's super soft. Got so many compliments.", date: "12 Mar 2025" },
    { id: "r2", name: "Ritika M.", rating: 4, comment: "Good quality and fast delivery. The Olive Green looks even better in person.", date: "28 Feb 2025" },
    { id: "r3", name: "Pooja D.", rating: 5, comment: "Perfect gift! My mom was thrilled. Packaging was also very neat.", date: "5 Jan 2025" },
  ],
  "2": [
    { id: "r4", name: "Karan T.", rating: 5, comment: "The mug is gorgeous. Solid, well-made, and the Terracotta colour is stunning.", date: "18 Mar 2025" },
    { id: "r5", name: "Sneha R.", rating: 4, comment: "Really happy with it. Holds heat well and looks beautiful on my desk.", date: "2 Mar 2025" },
  ],
  "3": [
    { id: "r6", name: "Divya P.", rating: 5, comment: "The fragrance is amazing! Makes the best morning cup. Will definitely reorder the 250g pack.", date: "20 Mar 2025" },
    { id: "r7", name: "Meera K.", rating: 4, comment: "Very fresh taste, clearly high quality. Delivery was quick too.", date: "10 Mar 2025" },
  ],
  "4": [
    { id: "r8", name: "Simran A.", rating: 5, comment: "Such a breezy, comfortable dress! Wore it to a beach trip and got so many compliments.", date: "15 Mar 2025" },
    { id: "r9", name: "Tanya B.", rating: 5, comment: "Perfect summer staple. The pockets are a blessing. True to size.", date: "1 Mar 2025" },
    { id: "r10", name: "Naina J.", rating: 3, comment: "Fabric is lovely but the sizing ran a bit large for me. Still a nice piece overall.", date: "20 Feb 2025" },
  ],
  "5": [
    { id: "r11", name: "Preet K.", rating: 5, comment: "Worth every rupee! The leather quality is top-notch and it fits a surprising amount.", date: "8 Mar 2025" },
  ],
  "6": [
    { id: "r12", name: "Rohan G.", rating: 5, comment: "Ordered these as a gift and everyone loved them. The Dark flavour is exceptional.", date: "14 Mar 2025" },
    { id: "r13", name: "Aisha M.", rating: 4, comment: "Creamy, rich, and not too sweet. The box of 24 is great value!", date: "3 Mar 2025" },
  ],
  "7": [
    { id: "r14", name: "Leena S.", rating: 5, comment: "My living room looks so much better with this hanging. The craftsmanship is beautiful.", date: "22 Mar 2025" },
    { id: "r15", name: "Farah N.", rating: 5, comment: "Perfect size and the natural cotton gives it a lovely texture. Shipping was fast!", date: "9 Mar 2025" },
  ],
  "8": [
    { id: "r16", name: "Vikram P.", rating: 4, comment: "Classic fit, great quality denim. The Light Wash looks very clean and crisp.", date: "17 Mar 2025" },
    { id: "r17", name: "Aman S.", rating: 5, comment: "Ordered the Distressed version — looks super cool. Very comfortable too.", date: "5 Mar 2025" },
  ],
};

export const MOCK_STATS = {
  totalOrders: 24,
  revenue: 48500,
  productCount: 8
};

export const MOCK_ANALYTICS = {
  totalVisitors: 1284,
  uniqueVisitors: 948,
  totalClicks: 3872,
  conversionRate: 18.7,
  avgSessionMinutes: 3.2,
  weeklyVisitors: [
    { day: "Mon", visitors: 142 },
    { day: "Tue", visitors: 198 },
    { day: "Wed", visitors: 165 },
    { day: "Thu", visitors: 210 },
    { day: "Fri", visitors: 248 },
    { day: "Sat", visitors: 189 },
    { day: "Sun", visitors: 132 },
  ],
  productClicks: [
    { productId: "4", name: "Linen Summer Dress",      clicks: 642, views: 890 },
    { productId: "8", name: "Denim Jacket",            clicks: 521, views: 710 },
    { productId: "1", name: "Handwoven Cotton Scarf",  clicks: 498, views: 620 },
    { productId: "6", name: "Artisan Choc. Truffles",  clicks: 387, views: 510 },
    { productId: "3", name: "Organic Green Tea",       clicks: 312, views: 430 },
    { productId: "5", name: "Leather Crossbody Bag",   clicks: 241, views: 370 },
    { productId: "7", name: "Macrame Wall Hanging",    clicks: 186, views: 260 },
    { productId: "2", name: "Ceramic Coffee Mug",      clicks: 85,  views: 130 },
  ],
  categoryBreakdown: [
    { category: "Clothes",     clicks: 1163, color: "#6366f1" },
    { category: "Accessories", clicks: 739,  color: "#22c55e" },
    { category: "Food",        clicks: 699,  color: "#f59e0b" },
    { category: "Crafts",      clicks: 271,  color: "#ec4899" },
  ],
  demandTrend: [
    { month: "Oct", orders: 8  },
    { month: "Nov", orders: 14 },
    { month: "Dec", orders: 22 },
    { month: "Jan", orders: 18 },
    { month: "Feb", orders: 26 },
    { month: "Mar", orders: 24 },
  ],
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
