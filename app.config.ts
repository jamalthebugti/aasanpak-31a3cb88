import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  app: {
    type: "spa",
  },
  vite: {
    plugins: [
      tsConfigPaths(),
    ],
  },
});
