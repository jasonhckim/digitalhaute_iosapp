import * as XLSX from "xlsx";
import { cacheDirectory, writeAsStringAsync, EncodingType } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

import { Product, AppSettings } from "@/types";
import { calculateRetailPrice } from "@/lib/storage";

function encode(s: string): string {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) {
    view[i] = s.charCodeAt(i) & 0xff;
  }
  let binary = "";
  for (let i = 0; i < view.byteLength; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

export async function exportToExcel(
  products: Product[],
  settings: AppSettings | null,
): Promise<void> {
  if (products.length === 0) return;

  const rows = products.map((p) => ({
    "Product Name": p.name,
    "Style Number": p.styleNumber,
    Vendor: p.vendorName,
    Category: p.category,
    Season: p.season,
    "Wholesale Price": p.wholesalePrice,
    "Retail Price": p.retailPrice || calculateRetailPrice(p.wholesalePrice, settings),
    Quantity: p.quantity,
    Colors: (p.selectedColors?.length ? p.selectedColors : p.colors).join(", "),
    Sizes: (p.sizes || []).join(", "),
    Status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
    "Delivery Date": p.deliveryDate,
    Notes: p.notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  const colWidths = [
    { wch: 24 }, // Product Name
    { wch: 16 }, // Style Number
    { wch: 20 }, // Vendor
    { wch: 14 }, // Category
    { wch: 14 }, // Season
    { wch: 16 }, // Wholesale Price
    { wch: 14 }, // Retail Price
    { wch: 10 }, // Quantity
    { wch: 24 }, // Colors
    { wch: 20 }, // Sizes
    { wch: 12 }, // Status
    { wch: 14 }, // Delivery Date
    { wch: 28 }, // Notes
  ];
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");

  const wbout = XLSX.write(wb, { type: "binary", bookType: "xlsx" });
  const base64 = encode(wbout);

  const fileName = `digital-haute-products-${Date.now()}.xlsx`;
  const filePath = `${cacheDirectory}${fileName}`;

  await writeAsStringAsync(filePath, base64, {
    encoding: EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(filePath, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Export Products to Excel",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    });
  } else {
    Alert.alert("Export Complete", `File saved: ${fileName}`);
  }
}
