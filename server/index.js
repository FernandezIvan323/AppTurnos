import "dotenv/config";
import express from "express";
import cors from "cors";
import { ensureDatabase, runMigrations, seed } from "./db.js";
import authRoutes from "./routes/auth.js";
import categoriesRoutes from "./routes/categories.js";
import productsRoutes from "./routes/products.js";
import tablesRoutes from "./routes/tables.js";
import customersRoutes from "./routes/customers.js";
import deliveryRoutes from "./routes/delivery.js";
import ordersRoutes from "./routes/orders.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportsRoutes from "./routes/reports.js";
import assignmentsRoutes from "./routes/assignments.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date() }));

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/assignments", assignmentsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Error interno" });
});

const PORT = process.env.PORT || 3001;

(async () => {
  try {
    await ensureDatabase();
    await runMigrations();
    await seed();
    app.listen(PORT, () =>
      console.log(`[api] AppTurnos API escuchando en http://localhost:${PORT}`)
    );
  } catch (e) {
    console.error("[api] No se pudo iniciar:", e);
    process.exit(1);
  }
})();
