import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// الموقع هلق على الدومين الرئيسي مباشرة بدون مسار فرعي
export default defineConfig({
  plugins: [react()],
  base: "/",
});
