import pandas as pd
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt


csv_path = "data/casos_mensais_para.csv"
output_path = "outputs/para/figures/grafico_casos_mensais_para.png"

db = pd.read_csv(csv_path)
db["mes"] = pd.to_datetime(db["mes"], format="%Y-%m")

plt.figure(figsize=(12, 6))
plt.plot(
    db["mes"],
    db["casos_notificados"],
    marker="o",
    linewidth=2,
    color="#1f77b4",
)

plt.title("Casos mensais de dengue no Para (2022-2026)")
plt.xlabel("Mes")
plt.ylabel("Casos notificados")
plt.grid(True, linestyle="--", alpha=0.4)
plt.xticks(rotation=45)
plt.tight_layout()

plt.savefig(output_path, dpi=300)
print(f"Grafico salvo em: {output_path}")
