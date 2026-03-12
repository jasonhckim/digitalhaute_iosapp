import AsyncStorage from "@react-native-async-storage/async-storage";
import { VendorStorage } from "./storage";

const SEED_KEY = "@digitalhaute/seeded";

// Default vendor data from wholesale vendor list
const DEFAULT_VENDORS = [
  { name: "HYFVE", phone: "(323) 234-6000", email: "sales@hyfve.com", address: "1015 Crocker St Ste Q-28, Los Angeles, CA 90021" },
  { name: "Hot & Delicious", phone: "(213) 748-0320", email: "info@shophotndelish.com", address: "1015 Crocker St Ste Q-09, Los Angeles, CA 90021" },
  { name: "Orange Shine", phone: "(213) 745-3001", email: "", address: "1015 Crocker St Ste S21, Los Angeles, CA 90021" },
  { name: "Tic Toc", phone: "(213) 748-2298", email: "", address: "1015 S Crocker St, Los Angeles, CA 90021" },
  { name: "Cleo Apparel", phone: "(213) 493-4516", email: "", address: "1015 Crocker St, Los Angeles, CA 90021" },
  { name: "She & Sky", phone: "(323) 262-8001", email: "info@sheandsky.com", address: "1910 E Olympic Blvd, Los Angeles, CA 90021" },
  { name: "Vocal Apparel", phone: "(213) 746-4002", email: "info@vocalapparel.com", address: "1020 Crocker St, Los Angeles, CA 90021" },
  { name: "CHICWAYS", phone: "", email: "", address: "1173 Crocker St, Los Angeles, CA 90021" },
  { name: "La'Ros", phone: "(213) 271-3506", email: "", address: "800 E 12th St #105, Los Angeles, CA 90021" },
  { name: "Chris & Carol", phone: "(213) 765-8962", email: "", address: "1182 Crocker St, Los Angeles, CA 90021" },
  { name: "Apparel Ave", phone: "(213) 748-7440", email: "", address: "1168 S Crocker St, Los Angeles, CA 90021" },
  { name: "O Fashion USA", phone: "(323) 923-2888", email: "ofashionusa@gmail.com", address: "810 E Pico Blvd Ste B18, Los Angeles, CA 90021" },
  { name: "SHE Junior", phone: "", email: "redvelvetapparel@gmail.com", address: "800 E 12th St #436, Los Angeles, CA 90021" },
  { name: "ACG Los Angeles", phone: "", email: "", address: "742 E 12th St, Los Angeles, CA 90021" },
  { name: "Wholesale Fashion Couture", phone: "", email: "", address: "1615 E 15th St, Los Angeles, CA 90021" },
  { name: "Oops Wholesale", phone: "", email: "", address: "800 E 12th St, Los Angeles, CA 90021" },
  { name: "Lafestar Inc", phone: "(818) 483-8918", email: "", address: "1015 Crocker St Unit R35, Los Angeles, CA 90021" },
  { name: "American Bazi", phone: "", email: "", address: "807 E 12th St, Los Angeles, CA 90021" },
  { name: "Annabelle", phone: "", email: "", address: "800 E 12th St, Los Angeles, CA 90021" },
  { name: "Anama/ANM", phone: "", email: "", address: "800 E 12th St, Los Angeles, CA 90021" },
  { name: "Audrey 3+1", phone: "", email: "", address: "1100 S San Pedro St, Los Angeles, CA 90021" },
  { name: "Available by Angela Fashion", phone: "", email: "", address: "762 E 12th St, Los Angeles, CA 90021" },
  { name: "Avec Collection", phone: "", email: "", address: "1015 S Crocker St, Los Angeles, CA 90021" },
  { name: "Andree by Unit", phone: "", email: "", address: "1015 S Crocker St, Los Angeles, CA 90021" },
  { name: "Better Be", phone: "", email: "", address: "1015 S Crocker St, Los Angeles, CA 90021" },
  { name: "Best Cody", phone: "", email: "", address: "1015 S Crocker St, Los Angeles, CA 90021" },
  { name: "Brenda's", phone: "", email: "", address: "1015 S Crocker St, Los Angeles, CA 90021" },
  { name: "Bubble B Plus", phone: "", email: "", address: "1015 S Crocker St, Los Angeles, CA 90021" },
  { name: "Belinda", phone: "", email: "", address: "1138 S Crocker St, Los Angeles, CA 90021" },
  { name: "Buxom Curvy", phone: "", email: "", address: "921 Crocker St, Los Angeles, CA 90021" },
  { name: "Bagel", phone: "", email: "", address: "921 Crocker St, Los Angeles, CA 90021" },
  { name: "Caribbean Queen", phone: "", email: "", address: "1128 S Crocker St, Los Angeles, CA 90021" },
  { name: "Caramela", phone: "", email: "", address: "807 E 12th St, Los Angeles, CA 90021" },
  { name: "Bus Stop", phone: "", email: "", address: "1212 S Stanford Ave, Los Angeles, CA 90021" },
  { name: "Bella Mia Lingerie", phone: "", email: "", address: "1212 S Stanford Ave, Los Angeles, CA 90021" },
  { name: "Beach Joy Bikini", phone: "", email: "", address: "1105 Towne Ave, Los Angeles, CA 90021" },
  { name: "Banjul", phone: "", email: "", address: "1001 Towne Ave, Los Angeles, CA 90021" },
  { name: "Capella Apparel", phone: "", email: "", address: "1001 Towne Ave, Los Angeles, CA 90021" },
  { name: "Be Cool", phone: "", email: "", address: "1016 S Towne Ave, Los Angeles, CA 90021" },
  { name: "C'est Toi Inc.", phone: "", email: "", address: "1016 S Towne Ave, Los Angeles, CA 90021" },
  { name: "Beulah", phone: "", email: "", address: "1031 S Towne Ave, Los Angeles, CA 90021" },
  { name: "Cali Girls", phone: "", email: "", address: "1188 S San Pedro St, Los Angeles, CA 90021" },
  { name: "2 Hearts", phone: "", email: "", address: "1015 S Crocker St, Los Angeles, CA 90021" },
  { name: "2.7 August Apparel", phone: "", email: "", address: "747 E 12th St, Los Angeles, CA 90021" },
  { name: "1 Funky", phone: "", email: "", address: "1436 S Main St, Los Angeles, CA 90021" },
  { name: "Ambiance Apparel", phone: "", email: "", address: "930 Towne Ave, Los Angeles, CA 90021" },
  { name: "April Women's Apparel", phone: "", email: "", address: "1100 S San Pedro St, Los Angeles, CA 90021" },
  { name: "Aphrodite Jeans", phone: "", email: "", address: "1100 S San Pedro St, Los Angeles, CA 90021" },
  { name: "Anymore Jeans", phone: "", email: "", address: "1100 S San Pedro St, Los Angeles, CA 90021" },
  { name: "Active USA", phone: "", email: "", address: "744 E Pico Blvd, Los Angeles, CA 90021" },
  { name: "Ace of Diamond", phone: "", email: "", address: "1440 Santee St, Los Angeles, CA 90021" },
  { name: "Tea N Rose", phone: "", email: "", address: "1166 Crocker St, Los Angeles, CA 90021" },
  { name: "Love Republic", phone: "", email: "", address: "1172 Crocker St, Los Angeles, CA 90021" },
  { name: "Blvd", phone: "", email: "", address: "1130 S Crocker St, Los Angeles, CA 90021" },
];

async function seedDefaultVendors(): Promise<void> {
  try {
    // Check if already seeded
    const seeded = await AsyncStorage.getItem(SEED_KEY);
    if (seeded === "true") {
      console.log("Default vendors already seeded");
      return;
    }

    // Check if vendors already exist
    const existingVendors = await VendorStorage.getAll();
    if (existingVendors.length > 0) {
      console.log("Vendors already exist, skipping seed");
      await AsyncStorage.setItem(SEED_KEY, "true");
      return;
    }

    console.log("Seeding default vendors...");

    // Create all vendors
    for (const vendorData of DEFAULT_VENDORS) {
      await VendorStorage.create({
        name: vendorData.name,
        phone: vendorData.phone.trim() || undefined,
        email: vendorData.email.trim() || undefined,
        address: vendorData.address.trim() || undefined,
      });
    }

    // Mark as seeded
    await AsyncStorage.setItem(SEED_KEY, "true");
    console.log(`Successfully seeded ${DEFAULT_VENDORS.length} default vendors`);
  } catch (error) {
    console.error("Error seeding default vendors:", error);
    // Don't throw - app should continue even if seeding fails
  }
}

export async function seedMockData(): Promise<boolean> {
  await seedDefaultVendors();
  return true;
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    "@digitalhaute/products",
    "@digitalhaute/vendors",
    "@digitalhaute/budgets",
    "@digitalhaute/settings",
    "@digitalhaute/notifications",
    SEED_KEY,
  ]);
}
