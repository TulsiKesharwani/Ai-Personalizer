import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, data] = result.split(",");
      const mime = header.match(/data:(.*);base64/)?.[1] || file.type || "image/jpeg";
      resolve({ base64: data, mimeType: mime });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
