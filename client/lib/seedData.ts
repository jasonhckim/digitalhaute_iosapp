import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product, Vendor, Budget, ProductStatus } from "@/types";

const SEED_KEY = "@digitalhaute/seeded";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

const mockVendors: Omit<Vendor, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Zimmermann",
    contactName: "Sarah Mitchell",
    email: "sarah@zimmermann.com",
    phone: "+1 (212) 555-0101",
    website: "https://zimmermann.com",
    paymentTerms: "Net 30",
    notes: "Premium Australian designer. Minimum order $5,000.",
  },
  {
    name: "Ulla Johnson",
    contactName: "Michael Chen",
    email: "orders@ullajohnson.com",
    phone: "+1 (212) 555-0102",
    website: "https://ullajohnson.com",
    paymentTerms: "Net 45",
    notes: "Bohemian-inspired luxury. Great for resort season.",
  },
  {
    name: "Veronica Beard",
    contactName: "Jennifer Adams",
    email: "wholesale@veronicabeard.com",
    phone: "+1 (212) 555-0103",
    website: "https://veronicabeard.com",
    paymentTerms: "Net 30",
    notes: "Contemporary classics. Strong blazer collection.",
  },
  {
    name: "Farm Rio",
    contactName: "Ana Oliveira",
    email: "buyers@farmrio.com",
    phone: "+1 (305) 555-0104",
    website: "https://farmrio.com",
    paymentTerms: "Net 30",
    notes: "Brazilian prints. Popular with younger demographic.",
  },
  {
    name: "LoveShackFancy",
    contactName: "Emily Rose",
    email: "wholesale@loveshackfancy.com",
    phone: "+1 (212) 555-0105",
    website: "https://loveshackfancy.com",
    paymentTerms: "Net 45",
    notes: "Romantic, feminine pieces. Strong in dresses.",
  },
];

const productTemplates = [
  {
    name: "Postcard Midi Dress",
    styleNumber: "ZM-4521",
    vendorIndex: 0,
    category: "Dresses",
    wholesalePrice: 285,
    retailPrice: 695,
    quantity: 4,
    colors: ["Cream", "Blush"],
    sizes: ["XS", "S", "M", "L"],
    season: "Fall 2026",
    status: "ordered" as ProductStatus,
    notes: "Bestseller from last season. Reorder.",
  },
  {
    name: "Floral Wrap Blouse",
    styleNumber: "UJ-7832",
    vendorIndex: 1,
    category: "Tops",
    wholesalePrice: 145,
    retailPrice: 350,
    quantity: 6,
    colors: ["Navy", "Ivory"],
    sizes: ["XS", "S", "M", "L", "XL"],
    season: "Fall 2026",
    status: "shipped" as ProductStatus,
    notes: "",
  },
  {
    name: "Miller Dickey Jacket",
    styleNumber: "VB-1199",
    vendorIndex: 2,
    category: "Outerwear",
    wholesalePrice: 298,
    retailPrice: 695,
    quantity: 3,
    colors: ["Black", "Navy", "Camel"],
    sizes: ["0", "2", "4", "6", "8"],
    season: "Fall 2026",
    status: "ordered" as ProductStatus,
    notes: "Signature piece. High demand expected.",
  },
  {
    name: "Tropical Print Maxi",
    styleNumber: "FR-9012",
    vendorIndex: 3,
    category: "Dresses",
    wholesalePrice: 120,
    retailPrice: 295,
    quantity: 8,
    colors: ["Multi"],
    sizes: ["XS", "S", "M", "L"],
    season: "Resort 2027",
    status: "maybe" as ProductStatus,
    notes: "Considering for resort collection.",
  },
  {
    name: "Ruffle Tiered Skirt",
    styleNumber: "LSF-3344",
    vendorIndex: 4,
    category: "Bottoms",
    wholesalePrice: 165,
    retailPrice: 395,
    quantity: 5,
    colors: ["Pink", "Blue", "White"],
    sizes: ["XS", "S", "M", "L"],
    season: "Spring 2026",
    status: "delivered" as ProductStatus,
    notes: "",
  },
  {
    name: "Silk Camisole",
    styleNumber: "ZM-5567",
    vendorIndex: 0,
    category: "Tops",
    wholesalePrice: 125,
    retailPrice: 295,
    quantity: 10,
    colors: ["Champagne", "Black", "Blush"],
    sizes: ["XS", "S", "M", "L"],
    season: "Fall 2026",
    status: "received" as ProductStatus,
    notes: "Already in stock. Selling well.",
  },
  {
    name: "Embroidered Tunic",
    styleNumber: "UJ-8844",
    vendorIndex: 1,
    category: "Tops",
    wholesalePrice: 195,
    retailPrice: 475,
    quantity: 4,
    colors: ["White", "Natural"],
    sizes: ["XS", "S", "M", "L"],
    season: "Resort 2027",
    status: "ordered" as ProductStatus,
    notes: "",
  },
  {
    name: "Wide Leg Trousers",
    styleNumber: "VB-2256",
    vendorIndex: 2,
    category: "Bottoms",
    wholesalePrice: 175,
    retailPrice: 398,
    quantity: 6,
    colors: ["Black", "Ivory", "Camel"],
    sizes: ["0", "2", "4", "6", "8", "10"],
    season: "Fall 2026",
    status: "shipped" as ProductStatus,
    notes: "Pairs well with Miller Dickey Jacket.",
  },
  {
    name: "Beaded Crossbody Bag",
    styleNumber: "FR-1001",
    vendorIndex: 3,
    category: "Accessories",
    wholesalePrice: 85,
    retailPrice: 195,
    quantity: 12,
    colors: ["Multi", "Natural"],
    sizes: ["One Size"],
    season: "Resort 2027",
    status: "maybe" as ProductStatus,
    notes: "Good price point accessory.",
  },
  {
    name: "Lace Mini Dress",
    styleNumber: "LSF-7799",
    vendorIndex: 4,
    category: "Dresses",
    wholesalePrice: 225,
    retailPrice: 525,
    quantity: 4,
    colors: ["White", "Blush"],
    sizes: ["XS", "S", "M", "L"],
    season: "Spring 2026",
    status: "received" as ProductStatus,
    notes: "Perfect for spring events.",
  },
];

const mockBudgets: Omit<Budget, "id" | "createdAt" | "updatedAt">[] = [
  {
    season: "Fall 2026",
    amount: 50000,
    spent: 0,
  },
  {
    season: "Fall 2026",
    category: "Dresses",
    amount: 15000,
    spent: 0,
  },
  {
    season: "Resort 2027",
    amount: 25000,
    spent: 0,
  },
  {
    season: "Spring 2026",
    amount: 20000,
    spent: 0,
  },
];

export async function seedMockData(): Promise<boolean> {
  try {
    const alreadySeeded = await AsyncStorage.getItem(SEED_KEY);
    if (alreadySeeded === "true") {
      return false;
    }

    const now = new Date().toISOString();

    const vendors: Vendor[] = mockVendors.map((v, index) => ({
      ...v,
      id: generateId() + index,
      createdAt: now,
      updatedAt: now,
    }));

    await AsyncStorage.setItem("@digitalhaute/vendors", JSON.stringify(vendors));

    const getDeliveryDate = (daysFromNow: number) => {
      const date = new Date();
      date.setDate(date.getDate() + daysFromNow);
      return date.toISOString().split("T")[0];
    };

    const deliveryOffsets = [7, 14, 21, 45, -10, -5, 30, 10, 60, -15];

    const products: Product[] = productTemplates.map((p, index) => ({
      id: generateId() + index,
      name: p.name,
      styleNumber: p.styleNumber,
      vendorId: vendors[p.vendorIndex].id,
      vendorName: vendors[p.vendorIndex].name,
      category: p.category,
      wholesalePrice: p.wholesalePrice,
      retailPrice: p.retailPrice,
      quantity: p.quantity,
      colors: p.colors,
      sizes: p.sizes,
      deliveryDate: getDeliveryDate(deliveryOffsets[index] || 14),
      receivedDate: p.status === "received" ? getDeliveryDate(-3) : undefined,
      season: p.season,
      notes: p.notes,
      status: p.status,
      createdAt: now,
      updatedAt: now,
    }));

    await AsyncStorage.setItem("@digitalhaute/products", JSON.stringify(products));

    const budgets: Budget[] = mockBudgets.map((b, index) => {
      let spent = 0;
      for (const product of products) {
        if (product.season !== b.season) continue;
        if (b.category && product.category !== b.category) continue;
        if (product.status !== "cancelled" && product.status !== "maybe") {
          spent += product.wholesalePrice * product.quantity;
        }
      }
      
      return {
        ...b,
        id: generateId() + index,
        spent,
        createdAt: now,
        updatedAt: now,
      };
    });

    await AsyncStorage.setItem("@digitalhaute/budgets", JSON.stringify(budgets));

    await AsyncStorage.setItem(SEED_KEY, "true");

    return true;
  } catch (error) {
    console.error("Error seeding mock data:", error);
    return false;
  }
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    "@digitalhaute/products",
    "@digitalhaute/vendors",
    "@digitalhaute/budgets",
    SEED_KEY,
  ]);
}
