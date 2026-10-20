import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { GroceryItemView } from "@/server/grocery/service";

function pdfSafe(value: string): string {
  return value.replace(/œ/g, "oe").replace(/Œ/g, "OE").replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?");
}

export async function groceryPdf(title: string, items: GroceryItemView[], disclaimer: string): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  let page = document.addPage([595, 842]);
  let y = 800;
  const write = (text: string, size = 12) => {
    if (y < 60) {
      page = document.addPage([595, 842]);
      y = 800;
    }
    page.drawText(pdfSafe(text).slice(0, 95), { x: 48, y, size, font, color: rgb(0.15, 0.21, 0.18) });
    y -= size + 8;
  };
  write(title, 18);
  y -= 6;
  let current = "";
  for (const item of items) {
    if (item.category !== current) {
      current = item.category;
      write(item.category, 14);
    }
    const amount = item.quantity == null ? "" : ` - ${item.quantity} ${item.unit ?? ""}`;
    write(`${item.checked ? "[x]" : "[ ]"} ${item.name}${amount}`);
    if (item.mergeNote) write(`    ${item.mergeNote}`, 10);
  }
  y -= 8;
  write(disclaimer, 10);
  return document.save();
}
